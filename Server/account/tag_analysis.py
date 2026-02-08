# Server/account/tag_analysis.py
from collections import defaultdict
import requests
import time
from datetime import datetime

CF_API_BASE = "https://codeforces.com/api"
LC_SUBMISSIONS_API = "https://leetcode-api-pied.vercel.app/user/{}/submissions"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def ts_to_dt(timestamp):
    try:
        return datetime.fromtimestamp(int(timestamp))
    except:
        return None


def normalize_tag(tag):
    tag = tag.lower().strip()
    # Common aliases
    if tag in ["dynamic programming", "dp", "dynammic programming"]:
        return "dp"
    if tag in ["binary search", "bin search"]:
        return "binary search"
    # Add more rules if needed
    return tag


def fetch_problem_tags(slug):
    """Fetch tags for a LeetCode problem (official GraphQL)"""
    query = """
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        topicTags {
          name
        }
      }
    }
    """
    try:
        resp = requests.post(
            "https://leetcode.com/graphql",
            json={"query": query, "variables": {"titleSlug": slug}},
            headers=HEADERS,
            timeout=8
        )
        data = resp.json()
        tags = data.get("data", {}).get("question", {}).get("topicTags", [])
        return [t["name"].lower() for t in tags]  # ← lowercase here
    except:
        return []


def fetch_lc_tag_counts(username: str, max_limit=1000):
    """
    Fetch accepted LeetCode submissions via third-party API
    and count unique solved problems per tag (case-insensitive).
    """
    tag_to_problems = defaultdict(set)
    tag_cache = {}  # slug -> list of lowercase tags

    try:
        url = LC_SUBMISSIONS_API.format(username)
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"LeetCode API returned {resp.status_code}")
            return {}

        data = resp.json()

        accepted_count = 0
        for sub in data[:max_limit]:
            if sub.get("statusDisplay") != "Accepted":
                continue

            accepted_count += 1
            slug = sub.get("titleSlug")
            if not slug:
                continue

            if slug not in tag_cache:
                tag_cache[slug] = fetch_problem_tags(slug)
                time.sleep(0.4)  # polite delay

            problem_id = slug
            tags = tag_cache[slug]

            for tag in tags:
                norm_tag = normalize_tag(tag)
                tag_to_problems[norm_tag].add(problem_id)

        print(f"Fetched {accepted_count} accepted LC submissions for {username}")

    except Exception as e:
        print(f"LeetCode fetch error: {e}")

    return {tag: len(problems) for tag, problems in tag_to_problems.items() if len(problems) > 0}


def fetch_cf_tag_counts(handle: str):
    """Codeforces: unique solved problems per tag (lowercase)"""
    tag_to_problems = defaultdict(set)

    from_idx = 1
    count = 1000

    while True:
        try:
            url = f"{CF_API_BASE}/user.status?handle={handle}&from={from_idx}&count={count}"
            resp = requests.get(url, headers=HEADERS, timeout=42)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "OK":
                break

            subs = data.get("result", [])
            if not subs:
                break

            for sub in subs:
                if sub.get("verdict") == "OK":
                    problem = sub.get("problem", {})
                    problem_id = f"{sub.get('contestId')}-{problem.get('index')}"
                    tags = [t.lower() for t in problem.get("tags", [])]  # ← lowercase
                    for tag in tags:
                        norm_tag = normalize_tag(tag)
                        tag_to_problems[norm_tag].add(problem_id)

            if len(subs) < count:
                break

            from_idx += count
            time.sleep(0.5)

        except Exception as e:
            print(f"CF error: {e}")
            break

    return {tag: len(problems) for tag, problems in tag_to_problems.items()}


def get_tag_stats(user):
    """
    Combined tag stats:
    - Codeforces full history
    - LeetCode accepted submissions via third-party API
    - Tags normalized to lowercase → same tags summed together
    """
    cf_profile = next((p for p in user.platform_profiles if p.platform == "codeforces"), None)
    lc_profile = next((p for p in user.platform_profiles if p.platform == "leetcode"), None)

    cf_handle = cf_profile.handle if cf_profile else None
    lc_handle = lc_profile.handle if lc_profile else None

    cf_tags = fetch_cf_tag_counts(cf_handle) if cf_handle else {}
    lc_tags = fetch_lc_tag_counts(lc_handle) if lc_handle else {}

    # Merge: sum counts for the same (lowercase) tag
    combined = defaultdict(int)
    for tag, cnt in cf_tags.items():
        combined[tag] += cnt
    for tag, cnt in lc_tags.items():
        combined[tag] += cnt

    # Sort descending by count
    sorted_stats = dict(sorted(combined.items(), key=lambda x: x[1], reverse=True))

    return sorted_stats