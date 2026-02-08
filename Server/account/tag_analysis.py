# Server/account/tag_analysis.py
from collections import defaultdict
import requests
import time

CF_API_BASE = "https://codeforces.com/api"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; YourApp/1.0)"
}

def fetch_all_accepted_codeforces(handle: str) -> list:
    """
    Fetch ALL accepted submissions from Codeforces using pagination.
    Returns list of {'problem_id': str, 'tags': list[str]}
    """
    accepted = []
    from_idx = 1
    count = 1000  # max per page

    while True:
        try:
            url = f"{CF_API_BASE}/user.status?handle={handle}&from={from_idx}&count={count}"
            resp = requests.get(url, headers=HEADERS, timeout=40)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "OK":
                print(f"CF API error: {data.get('comment')}")
                break

            subs = data.get("result", [])
            if not subs:
                break

            for sub in subs:
                if sub.get("verdict") == "OK":
                    problem = sub.get("problem", {})
                    contest_id = sub.get("contestId")
                    index = problem.get("index")
                    problem_id = f"{contest_id}-{index}" if contest_id and index else f"unknown-{sub.get('id')}"

                    tags = problem.get("tags", [])
                    accepted.append({
                        "problem_id": problem_id,
                        "tags": tags
                    })

            if len(subs) < count:
                break  # no more pages

            from_idx += count
            time.sleep(0.6)  # polite delay ~1 req/sec

        except Exception as e:
            print(f"CF fetch error for {handle}: {e}")
            break

    return accepted


def get_cf_tag_stats(user) -> dict:
    """
    Returns {tag: count_of_unique_solved_problems} sorted descending.
    Only Codeforces for now.
    """
    cf_profile = next((p for p in user.platform_profiles if p.platform == "codeforces"), None)
    if not cf_profile:
        return {}

    handle = cf_profile.handle
    if not handle:
        return {}

    accepted_subs = fetch_all_accepted_codeforces(handle)

    tag_to_problems = defaultdict(set)  # tag → set of unique problem_ids

    for entry in accepted_subs:
        for tag in entry["tags"]:
            if tag.strip():  # skip empty/invalid
                tag_to_problems[tag].add(entry["problem_id"])

    stats = {tag: len(problems) for tag, problems in tag_to_problems.items() if len(problems) > 0}

    # Sort by count descending (like most visualizers do)
    return dict(sorted(stats.items(), key=lambda x: x[1], reverse=True))