# Server/account/tag_analysis.py
from collections import defaultdict
import requests
import time
from datetime import datetime
from .models import UserTagStats, Account

CF_API_BASE = "https://codeforces.com/api"
LC_SUBMISSIONS_API = "https://leetcode-api-pied.vercel.app/user/{}/submissions"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def normalize_tag(tag):
    tag = tag.lower().strip()
    if tag in ["dynamic programming", "dp", "dynammic programming", "dynamic-programming"]:
        return "dp"
    if tag in ["binary search", "bin search", "binary-search"]:
        return "binary search"
    return tag

def fetch_problem_tags(slug):
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
        return [normalize_tag(t["name"]) for t in tags]
    except:
        return []

# ────────────────────────────────────────────────────────────────
# FULL FETCH (only used first time)
# ────────────────────────────────────────────────────────────────

def fetch_cf_tag_counts(handle: str):
    tag_to_problems = defaultdict(set)
    last_time = 0

    from_idx = 1
    count = 1000

    while True:
        try:
            url = f"{CF_API_BASE}/user.status?handle={handle}&from={from_idx}&count={count}"
            resp = requests.get(url, headers=HEADERS, timeout=12)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "OK":
                break

            subs = data.get("result", [])
            if not subs:
                break

            for sub in subs:
                creation_time = sub.get("creationTimeSeconds", 0)
                last_time = max(last_time, creation_time)

                if sub.get("verdict") == "OK":
                    problem = sub.get("problem", {})
                    problem_id = f"{sub.get('contestId')}-{problem.get('index')}"
                    tags = [normalize_tag(t) for t in problem.get("tags", [])]
                    for tag in tags:
                        tag_to_problems[tag].add(problem_id)

            if len(subs) < count:
                break

            from_idx += count
            time.sleep(0.5)

        except Exception as e:
            print(f"CF full fetch error: {e}")
            break

    return {tag: len(problems) for tag, problems in tag_to_problems.items()}, last_time

def fetch_lc_tag_counts(username: str, max_limit=1000):
    tag_to_problems = defaultdict(set)
    tag_cache = {}
    last_time = 0

    try:
        url = LC_SUBMISSIONS_API.format(username)
        resp = requests.get(url, headers=HEADERS, timeout=45)
        if resp.status_code != 200:
            print(f"LC API status: {resp.status_code}")
            return {}, 0

        data = resp.json()

        for sub in data[:max_limit]:
            ts = int(sub.get("timestamp", 0))
            last_time = max(last_time, ts)

            if sub.get("statusDisplay") != "Accepted":
                continue

            slug = sub.get("titleSlug")
            if not slug:
                continue

            if slug not in tag_cache:
                tag_cache[slug] = fetch_problem_tags(slug)
                time.sleep(0.4)

            tags = tag_cache[slug]
            for tag in tags:
                tag_to_problems[tag].add(slug)

    except Exception as e:
        print(f"LC full fetch error: {e}")

    return {tag: len(problems) for tag, problems in tag_to_problems.items()}, last_time

# ────────────────────────────────────────────────────────────────
# INCREMENTAL UPDATE (only new submissions)
# ────────────────────────────────────────────────────────────────

def update_cf_tags(handle: str, cached_stats: UserTagStats):
    """Only process submissions newer than last_cf_submission_time"""
    tag_to_problems = defaultdict(set)  # only NEW unique problems
    new_last_time = cached_stats.last_cf_submission_time

    from_idx = 1
    count = 1000

    while True:
        try:
            url = f"{CF_API_BASE}/user.status?handle={handle}&from={from_idx}&count={count}"
            resp = requests.get(url, headers=HEADERS, timeout=12)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "OK":
                break

            subs = data.get("result", [])
            if not subs:
                break

            stop = False
            for sub in subs:
                creation_time = sub.get("creationTimeSeconds", 0)
                if creation_time <= cached_stats.last_cf_submission_time:
                    stop = True
                    break

                new_last_time = max(new_last_time, creation_time)

                if sub.get("verdict") == "OK":
                    problem = sub.get("problem", {})
                    problem_id = f"{sub.get('contestId')}-{problem.get('index')}"
                    tags = [normalize_tag(t) for t in problem.get("tags", [])]
                    for tag in tags:
                        tag_to_problems[tag].add(problem_id)

            if stop or len(subs) < count:
                break

            from_idx += count
            time.sleep(0.5)

        except Exception as e:
            print(f"CF incremental error: {e}")
            break

    # Return only **new** counts to add
    new_counts = {tag: len(problems) for tag, problems in tag_to_problems.items()}
    return new_counts, new_last_time

def update_lc_tags(username: str, cached_stats: UserTagStats):
    """Only process new LeetCode submissions"""
    tag_to_problems = defaultdict(set)
    new_last_time = cached_stats.last_lc_submission_time
    tag_cache = {}

    try:
        url = LC_SUBMISSIONS_API.format(username)
        resp = requests.get(url, headers=HEADERS, timeout=45)
        if resp.status_code != 200:
            print(f"LC API status: {resp.status_code}")
            return {}, new_last_time

        data = resp.json()

        for sub in data:
            ts = int(sub.get("timestamp", 0))
            if ts <= cached_stats.last_lc_submission_time:
                break  # assuming newest first

            new_last_time = max(new_last_time, ts)

            if sub.get("statusDisplay") != "Accepted":
                continue

            slug = sub.get("titleSlug")
            if not slug:
                continue

            if slug not in tag_cache:
                tag_cache[slug] = fetch_problem_tags(slug)
                time.sleep(0.4)

            tags = tag_cache[slug]
            for tag in tags:
                tag_to_problems[tag].add(slug)

        new_counts = {tag: len(problems) for tag, problems in tag_to_problems.items()}
        return new_counts, new_last_time

    except Exception as e:
        print(f"LC incremental error: {e}")
        return {}, new_last_time

# ────────────────────────────────────────────────────────────────
# MAIN FUNCTION - Cached + Incremental
# ────────────────────────────────────────────────────────────────

def get_tag_stats(user):
    user_id = str(user.id)
    
    # Try to get existing cache
    cache = UserTagStats.objects(user_id=user_id).first()

    cf_handle = user.get_platform_profile("codeforces").handle if user.get_platform_profile("codeforces") else None
    lc_handle = user.get_platform_profile("leetcode").handle if user.get_platform_profile("leetcode") else None

    if not cache:
        # First time - full fetch
        cf_tags, cf_last = fetch_cf_tag_counts(cf_handle) if cf_handle else ({}, 0)
        lc_tags, lc_last = fetch_lc_tag_counts(lc_handle) if lc_handle else ({}, 0)

        combined = defaultdict(int)
        for tag, cnt in cf_tags.items():
            combined[tag] += cnt
        for tag, cnt in lc_tags.items():
            combined[tag] += cnt

        # Atomic upsert - safe even in race conditions
        UserTagStats.objects(user_id=user_id).update_one(
            upsert=True,
            set__tags=dict(combined),
            set__last_update=datetime.utcnow(),
            set__last_cf_submission_time=cf_last,
            set__last_lc_submission_time=lc_last
        )

        return dict(sorted(combined.items(), key=lambda x: x[1], reverse=True))

    # Incremental update
    new_cf_counts, new_cf_time = update_cf_tags(cf_handle, cache) if cf_handle else ({}, cache.last_cf_submission_time)
    new_lc_counts, new_lc_time = update_lc_tags(lc_handle, cache) if lc_handle else ({}, cache.last_lc_submission_time)

    # Merge new counts into existing
    for tag, cnt in new_cf_counts.items():
        cache.tags[tag] = cache.tags.get(tag, 0) + cnt
    for tag, cnt in new_lc_counts.items():
        cache.tags[tag] = cache.tags.get(tag, 0) + cnt

    # Atomic update cache
    UserTagStats.objects(user_id=user_id).update_one(
        set__tags=cache.tags,
        set__last_update=datetime.utcnow(),
        set__last_cf_submission_time=new_cf_time,
        set__last_lc_submission_time=new_lc_time
    )

    return dict(sorted(cache.tags.items(), key=lambda x: x[1], reverse=True))