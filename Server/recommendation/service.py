from datetime import datetime, timedelta
from .models import UserRecommendation
from .prompt_builder import build_prompt
from .ai_service import call_groq
from account.models import Account, UserTagStats


def get_recommendations(user_id, force_refresh=False):
    """Main fast service - always returns quickly"""
    latest = UserRecommendation.get_latest(user_id)

    # Cache valid for 24 hours
    if not force_refresh and latest and (datetime.utcnow() - latest.generated_at) < timedelta(hours=24):
        return {
            "recommendations": latest.recommendations,
            "practice_plan": latest.practice_plan,
            "generated_at": latest.generated_at.isoformat(),
            "from_cache": True
        }

    # No cache or force refresh → generate (this may take 3-8 seconds)
    user = Account.objects(id=user_id).first()
    if not user:
        raise Exception("User not found")

    prompt = build_prompt(user)
    result = call_groq(prompt)

    # Save to cache
    UserRecommendation(
        user_id=str(user_id),
        recommendations=result.get("recommendations", []),
        practice_plan=result.get("practice_plan", ""),
        weak_snapshot={k: v.get('score') for k, v in (UserTagStats.objects(user_id=str(user_id)).first() or {}).category_scores.items()}
    ).save()

    return {
        "recommendations": result.get("recommendations", []),
        "practice_plan": result.get("practice_plan", ""),
        "generated_at": datetime.utcnow().isoformat(),
        "from_cache": False
    }