from datetime import datetime, timedelta
from .models import UserRecommendation
from .prompt_builder import build_prompt, build_practice_plan_prompt
from .ai_service import call_groq
from .problem_service import get_validated_recommendations, clear_problem_cache
from account.models import Account, UserTagStats


def get_recommendations(user_id, force_refresh=False):
    """Main fast service - returns validated real problems"""
    latest = UserRecommendation.get_latest(user_id)

    # Cache valid for 24 hours
    if not force_refresh and latest and (datetime.utcnow() - latest.generated_at) < timedelta(hours=24):
        return {
            "recommendations": latest.recommendations,
            "practice_plan": latest.practice_plan,
            "generated_at": latest.generated_at.isoformat(),
            "from_cache": True
        }

    # No cache or force refresh → generate
    user = Account.objects(id=user_id).first()
    if not user:
        raise Exception("User not found")

    # Clear ALL old caches on force refresh to ensure fresh data
    if force_refresh:
        clear_problem_cache()
        # Delete all old recommendations for this user
        UserRecommendation.objects(user_id=str(user_id)).delete()
        print(f"Cleared old recommendations for user {user_id}")

    # Get tag stats for weak areas
    tag_stats = UserTagStats.objects(user_id=str(user_id)).first()
    weak_categories = {}
    if tag_stats and tag_stats.category_scores:
        # Sort by score ascending (lowest = weakest)
        sorted_cats = sorted(tag_stats.category_scores.items(), key=lambda x: x[1].get('score', 0))
        weak_categories = dict(sorted_cats[:5])  # Top 5 weak areas

    # Get validated recommendations from real APIs (no AI hallucination)
    recommendations = get_validated_recommendations(user, weak_categories, count=6)
    
    # Generate practice plan using AI (just the plan text, not problem recommendations)
    practice_plan = ""
    try:
        plan_prompt = build_practice_plan_prompt(user, weak_categories, recommendations)
        plan_result = call_groq(plan_prompt)
        practice_plan = plan_result.get("practice_plan", "")
    except Exception as e:
        print(f"Error generating practice plan: {e}")
        practice_plan = generate_default_practice_plan(weak_categories)

    # Save to cache
    weak_snapshot = {}
    if tag_stats and tag_stats.category_scores:
        weak_snapshot = {k: v.get('score') for k, v in tag_stats.category_scores.items()}
    
    UserRecommendation(
        user_id=str(user_id),
        recommendations=recommendations,
        practice_plan=practice_plan,
        weak_snapshot=weak_snapshot
    ).save()

    return {
        "recommendations": recommendations,
        "practice_plan": practice_plan,
        "generated_at": datetime.utcnow().isoformat(),
        "from_cache": False
    }


def generate_default_practice_plan(weak_categories):
    """Generate a simple default practice plan if AI fails"""
    if not weak_categories:
        return "Practice consistently: Solve 2-3 problems daily, focusing on variety."
    
    weak_list = list(weak_categories.keys())[:3]
    return f"""7-Day Practice Plan:
Day 1-2: Focus on {weak_list[0] if len(weak_list) > 0 else 'Implementation'} problems
Day 3-4: Practice {weak_list[1] if len(weak_list) > 1 else 'Data Structures'} concepts
Day 5-6: Work on {weak_list[2] if len(weak_list) > 2 else 'Algorithms'} techniques
Day 7: Mixed practice and review

Tip: Solve 2-3 problems daily for best results."""