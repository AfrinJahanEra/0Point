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

category_map = {
    "2-sat": "Graphs",
    "binary search": "Data Structures & Search",
    "bitmasks": "Data Structures & Search",
    "brute force": "Implementation",
    "chinese remainder theorem": "Mathematics",
    "combinatorics": "Mathematics",
    "constructive algorithms": "Implementation",
    "data structures": "Data Structures & Search",
    "dfs and similar": "Graphs",
    "divide and conquer": "Data Structures & Search",
    "dp": "Dynamic Programming",
    "dsu": "Data Structures & Search",
    "expression parsing": "Implementation",
    "fft": "Mathematics",
    "flow": "Graphs",
    "flows": "Graphs",
    "games": "Game Theory",
    "geometry": "Mathematics",
    "graph matchings": "Graphs",
    "graphs": "Graphs",
    "greedy": "Greedy & Sorting",
    "hashing": "Data Structures & Search",
    "implementation": "Implementation",
    "interactive": "Implementation",
    "math": "Mathematics",
    "matrices": "Mathematics",
    "meet-in-the-middle": "Data Structures & Search",
    "number theory": "Mathematics",
    "probabilities": "Mathematics",
    "schedules": "Implementation",
    "shortest paths": "Graphs",
    "sortings": "Greedy & Sorting",
    "string suffix structures": "Strings",
    "strings": "Strings",
    "ternary search": "Data Structures & Search",
    "trees": "Graphs",
    "two pointers": "Data Structures & Search",
    # LeetCode specific
    "array": "Data Structures & Search",
    "backtracking": "Implementation",
    "bit manipulation": "Data Structures & Search",
    "breadth-first search": "Graphs",
    "bucket sort": "Greedy & Sorting",
    "counting": "Mathematics",
    "counting sort": "Greedy & Sorting",
    "depth-first search": "Graphs",
    "design": "Implementation",
    "enumeration": "Implementation",
    "game theory": "Game Theory",
    "graph": "Graphs",
    "heap (priority queue)": "Data Structures & Search",
    "heap": "Data Structures & Search",
    "linked list": "Data Structures & Search",
    "matrix": "Data Structures & Search",
    "memoization": "Dynamic Programming",
    "monotonic queue": "Data Structures & Search",
    "monotonic stack": "Data Structures & Search",
    "ordered set": "Data Structures & Search",
    "prefix sum": "Data Structures & Search",
    "queue": "Data Structures & Search",
    "radix sort": "Greedy & Sorting",
    "recursion": "Implementation",
    "segment tree": "Data Structures & Search",
    "simulation": "Implementation",
    "sliding window": "Data Structures & Search",
    "sorting": "Greedy & Sorting",
    "stack": "Data Structures & Search",
    "string": "Strings",
    "topological sort": "Graphs",
    "tree": "Graphs",
    "trie": "Strings",
    "union find": "Data Structures & Search",
}

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


def fetch_cf_category_attempts(handle: str):
    category_attempts = defaultdict(list)
    category_to_tags = defaultdict(set)
    problem_subs = defaultdict(list)
    last_time = 0
    from_idx = 1
    count = 500

    while True:
        try:
            url = f"{CF_API_BASE}/user.status?handle={handle}&from={from_idx}&count={count}"
            resp = requests.get(url, headers=HEADERS, timeout=10)
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

                contestId = sub.get("contestId")
                if not contestId:
                    continue

                problem = sub.get("problem", {})
                index = problem.get("index", "")
                problem_id = f"{contestId}-{index}"
                problem_subs[problem_id].append(sub)

            if len(subs) < count:
                break

            from_idx += count
            time.sleep(0.3)

        except Exception as e:
            print(f"CF fetch error: {e}")
            break

    # Process groups
    for problem_id, subs in problem_subs.items():
        subs.sort(key=lambda s: s["creationTimeSeconds"])  # asc
        attempts = 0
        solved = False
        tags = []
        for sub in subs:
            attempts += 1
            if sub.get("verdict") == "OK":
                solved = True
                tags = sub["problem"].get("tags", [])
                break

        if solved and attempts > 0:
            normalized_tags = [normalize_tag(t) for t in tags]
            added_cats = set()
            for tag in normalized_tags:
                cat = category_map.get(tag, "Other")
                category_to_tags[cat].add(tag)
                if cat not in added_cats:
                    category_attempts[cat].append(attempts)
                    added_cats.add(cat)

    return category_attempts, last_time, category_to_tags


def fetch_lc_category_attempts(username: str):
    category_attempts = defaultdict(list)
    category_to_tags = defaultdict(set)
    problem_subs = defaultdict(list)
    last_time = 0

    try:
        resp = requests.get(LC_SUBMISSIONS_API.format(username), headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"LC API status: {resp.status_code}")
            return category_attempts, last_time, category_to_tags

        data = resp.json()

        for sub in data:
            ts = int(sub.get("timestamp", 0))
            last_time = max(last_time, ts)
            slug = sub.get("titleSlug")
            if not slug:
                continue
            problem_subs[slug].append(sub)

        tag_cache = {}
        for slug, subs in problem_subs.items():
            subs.sort(key=lambda s: int(s["timestamp"]))  # asc
            attempts = 0
            solved = False
            for sub in subs:
                attempts += 1
                if sub.get("statusDisplay") == "Accepted":
                    solved = True
                    break

            if solved and attempts > 0:
                if slug not in tag_cache:
                    tag_cache[slug] = fetch_problem_tags(slug)
                    time.sleep(0.4)

                tags = tag_cache[slug]

                # Assign to all relevant categories
                added_cats = set()
                for tag in tags:
                    cat = category_map.get(tag, "Other")
                    category_to_tags[cat].add(tag)
                    if cat not in added_cats:
                        category_attempts[cat].append(attempts)
                        added_cats.add(cat)

    except Exception as e:
        print(f"LC fetch error: {e}")

    return category_attempts, last_time, category_to_tags


def get_category_scores(user):
    user_id = str(user.id)
    cache = UserTagStats.objects(user_id=user_id).first()

    cf_handle = user.get_platform_profile("codeforces").handle if user.get_platform_profile("codeforces") else None
    lc_handle = user.get_platform_profile("leetcode").handle if user.get_platform_profile("leetcode") else None

    cf_att = defaultdict(list)
    lc_att = defaultdict(list)
    cf_tags = defaultdict(set)
    lc_tags = defaultdict(set)
    new_cf_last = cache.last_cf_submission_time if cache else 0
    new_lc_last = cache.last_lc_submission_time if cache else 0
    
    # ── Codeforces ──────────────────────────────────────────────────
    need_cf_fetch = True
    if cache and cf_handle:
        try:
            url = f"{CF_API_BASE}/user.status?handle={cf_handle}&from=1&count=1"
            resp = requests.get(url, headers=HEADERS, timeout=5)
            data = resp.json()
            if data.get("status") == "OK" and data.get("result"):
                newest = data["result"][0]["creationTimeSeconds"]
                if newest <= cache.last_cf_submission_time:
                    need_cf_fetch = False
        except Exception as e:
            print(f"CF recency check failed: {e}")
            need_cf_fetch = False

    if need_cf_fetch and cf_handle:
        cf_att, new_cf_last, cf_tags = fetch_cf_category_attempts(cf_handle)

    # ── LeetCode ────────────────────────────────────────────────────
    need_lc_fetch = True
    if cache and lc_handle:
        try:
            url = LC_SUBMISSIONS_API.format(lc_handle)
            resp = requests.get(url, headers=HEADERS, timeout=5)
            data = resp.json()
            if data:
                newest = max((int(s.get("timestamp", 0)) for s in data), default=0)
                if newest <= cache.last_lc_submission_time:
                    need_lc_fetch = False
        except Exception as e:
            print(f"LC recency check failed: {e}")
            need_lc_fetch = False
    
    if need_lc_fetch and lc_handle:
        lc_att, new_lc_last, lc_tags = fetch_lc_category_attempts(lc_handle)
    
        # In merge:
    all_att = defaultdict(list)
    for d in [cf_att, lc_att]:           # both — even if one is empty
        for cat, lst in d.items():
            all_att[cat].extend(lst)
    # ── Compute scores ──────────────────────────────────────────────
    scores = {}

    for cat, atts in all_att.items():
        if not atts:
            continue

        solved_count = len(atts)
        if solved_count == 0:
            continue

        total_inverse = sum(1.0 / att for att in atts if att > 0)
        avg_problem_score = total_inverse / solved_count
        final_score = round(10.0 * avg_problem_score, 2)

        # Merge tags from both platforms
        combined_tags = sorted(cf_tags.get(cat, set()) | lc_tags.get(cat, set()))

        scores[cat] = {
            "score": final_score,
            "problem_count": solved_count,
            "tags": combined_tags
        }

    # ── Update / create cache entry ────────────────────────────────
    UserTagStats.objects(user_id=user_id).update_one(
        upsert=True,
        set__category_scores=scores,
        set__last_update=datetime.utcnow(),
        set__last_cf_submission_time=new_cf_last,
        set__last_lc_submission_time=new_lc_last
    )

    return scores