from datetime import datetime
from account.models import Account, UserTagStats, UserVerdictStats


def build_prompt(user: Account) -> str:
    profiles = {p.platform: p for p in user.platform_profiles}

    rating_str = ", ".join([f"{plat.capitalize()} {p.current_rating}" for plat, p in profiles.items()]) or "No platforms connected"

    # Tag stats
    tag_stats = UserTagStats.objects(user_id=str(user.id)).first()
    if tag_stats and tag_stats.category_scores:
        weak = sorted(tag_stats.category_scores.items(), key=lambda x: x[1].get('score', 0))[:5]
        strong = sorted(tag_stats.category_scores.items(), key=lambda x: x[1].get('score', 0), reverse=True)[:3]
        weak_str = ", ".join([f"{cat} (score {data.get('score',0)})" for cat, data in weak])
        strong_str = ", ".join([cat for cat, _ in strong])
    else:
        weak_str = strong_str = "No data yet"

    # Verdict stats
    verdict_stats = UserVerdictStats.objects(user_id=str(user.id)).first()
    mistakes = ""
    if verdict_stats:
        combined = {}
        for counts in verdict_stats.verdict_counts_per_platform.values():
            for v, c in counts.items():
                if v != "Accepted":
                    combined[v] = combined.get(v, 0) + c
        top_mistakes = sorted(combined.items(), key=lambda x: x[1], reverse=True)[:4]
        mistakes = ", ".join([f"{v} ({c})" for v, c in top_mistakes])

    prompt = f"""You are an expert competitive programming coach.

User Profile:
- Name: {user.name}
- Current ratings: {rating_str}
- Strong topics: {strong_str}
- Weak topics: {weak_str}
- Common mistakes: {mistakes or "None recorded"}
- Total problems solved: {user.problems_solved}
- Contests participated: {user.contests_count}

Task: Recommend 6 practice problems (mix of Codeforces, LeetCode, CodeChef, AtCoder) that will help this user improve the most right now.
Focus heavily on their weak topics.
Difficulty should be 100-350 points above their current rating (or Medium-Hard on LeetCode).

For each problem return:
- platform
- title
- link (real working link)
- difficulty (e.g. 1600 or Medium)
- tags (list)
- why (1-2 sentences explaining exactly how it helps their weak areas or mistakes)

Also give a short 7-day practice plan.

Return ONLY valid JSON:
{{
  "recommendations": [ ... ],
  "practice_plan": "string"
}}
"""

    return prompt