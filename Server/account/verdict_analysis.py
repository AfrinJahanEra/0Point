# Server/account/verdict_analysis.py
from collections import defaultdict
import requests
import time
from datetime import datetime
from .models import UserVerdictStats, Account

CF_API_BASE = "https://codeforces.com/api"
LC_SUBMISSIONS_API = "https://leetcode-api-pied.vercel.app/user/{}/submissions"
LC_GRAPHQL = "https://leetcode.com/graphql"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def normalize_verdict(verdict, platform):
    if not verdict:
        return "Other"

    # Codeforces verdicts are uppercase with underscores
    v = verdict.upper().strip()

    if v == "OK":
        return "Accepted"
    if v == "WRONG_ANSWER":
        return "Wrong Answer"
    if v == "TIME_LIMIT_EXCEEDED":
        return "Time Limit Exceeded"
    if v == "MEMORY_LIMIT_EXCEEDED":
        return "Memory Limit Exceeded"
    if v == "RUNTIME_ERROR":
        return "Runtime Error"
    if v == "COMPILATION_ERROR":
        return "Compilation Error"
    if v == "PARTIAL":
        return "Partial"
    if v == "CHALLENGED":
        return "Challenged"
    if v == "SKIPPED":
        return "Skipped"
        
    return "Other"

def get_latest_submission_time(platform, handle):
    if platform == "codeforces":
        url = f"{CF_API_BASE}/user.status?handle={handle}&from=1&count=1"
        resp = requests.get(url, headers=HEADERS, timeout=5)
        data = resp.json()
        if data.get("status") == "OK" and data.get("result"):
            return data["result"][0].get("creationTimeSeconds", 0)
        return 0
    
    elif platform == "leetcode":
        query = """
        query recentSubmissions($username: String!) {
          recentSubmissionList(username: $username) {
            timestamp
          }
        }
        """
        resp = requests.post(LC_GRAPHQL, json={"query": query, "variables": {"username": handle}}, headers=HEADERS, timeout=5)
        data = resp.json()
        subs = data.get("data", {}).get("recentSubmissionList", [])
        if subs:
            return max(int(s["timestamp"]) for s in subs)
        return 0
    
    elif platform == "codechef":
        # Assuming fetch_codechef_submissions can be used with limit=1 for latest
        # Adjust based on actual implementation; for now, return 0 to always fetch
        return 0
    
    elif platform == "atcoder":
        # Similar to codechef
        return 0
    
    return 0

def fetch_platform_verdict_counts(handle, platform):
    verdict_count = defaultdict(int)
    max_time = 0
    
    if platform == "codeforces":
        from_idx = 1
        count = 500
        while True:
            try:
                url = f"{CF_API_BASE}/user.status?handle={handle}&from={from_idx}&count={count}"
                resp = requests.get(url, headers=HEADERS, timeout=10)
                data = resp.json()
                if data.get("status") != "OK":
                    break
                subs = data.get("result", [])
                if not subs:
                    break
                for sub in subs:
                    creation_time = sub.get("creationTimeSeconds", 0)
                    max_time = max(max_time, creation_time)
                    v = sub.get("verdict")
                    verdict_count[normalize_verdict(v, platform)] += 1
                if len(subs) < count:
                    break
                from_idx += count
                time.sleep(0.3)
            except:
                break
    
    elif platform == "leetcode":
        try:
            resp = requests.get(LC_SUBMISSIONS_API.format(handle), headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                for sub in data:
                    ts = int(sub.get("timestamp", 0))
                    max_time = max(max_time, ts)
                    v = sub.get("statusDisplay")
                    verdict_count[normalize_verdict(v, platform)] += 1
        except:
            pass
    
    # elif platform == "codechef":
    #     # Assuming fetch_codechef_submissions fetches recent; adjust limit for more
    #     # For full, if API supports paging, implement here
    #     try:
    #         subs = fetch_codechef_submissions(handle, limit=200)  # Increased limit for better stats
    #         for sub in subs:
    #             ts = sub.get("submitted_at")  # Assume has timestamp, adjust key
    #             if ts:
    #                 max_time = max(max_time, int(ts) if isinstance(ts, str) else ts)
    #             v = sub.get("verdict")  # Adjust key based on actual dict
    #             verdict_count[normalize_verdict(v, platform)] += 1
    #     except:
    #         pass
    
    # elif platform == "atcoder":
    #     # Similar
    #     try:
    #         subs = fetch_atcoder_submissions(handle)  # Assume fetches all or many
    #         for sub in subs:
    #             ts = sub.get("submitted_at")  # Adjust key
    #             if ts:
    #                 max_time = max(max_time, int(ts) if isinstance(ts, str) else ts)
    #             v = sub.get("result") or sub.get("verdict")  # Adjust key
    #             verdict_count[normalize_verdict(v, platform)] += 1
    #     except:
    #         pass
    
    return dict(verdict_count), max_time

def get_verdict_counts(user):
    user_id = str(user.id)
    cache = UserVerdictStats.objects(user_id=user_id).first()
    
    combined = defaultdict(int)
    if cache:
        for plat_counts in cache.verdict_counts_per_platform.values():
            for v, c in plat_counts.items():
                combined[v] += c
    
    updated = False
    platforms = {
        "codeforces": "cf",
        "leetcode": "lc",
        "codechef": "cc",
        "atcoder": "ac"
    }
    
    for plat, prefix in platforms.items():
        profile = user.get_platform_profile(plat)
        if not profile:
            continue
        
        last_time = getattr(cache, f"last_{prefix}_submission_time", 0) if cache else 0
        need_fetch = not cache  # If no cache, fetch all
        
        if not need_fetch:
            try:
                newest = get_latest_submission_time(plat, profile.handle)
                if newest > last_time:
                    need_fetch = True
            except:
                need_fetch = False  # Fallback
        
        if need_fetch:
            plat_counts, new_time = fetch_platform_verdict_counts(profile.handle, plat)
            if plat_counts:
                if cache:
                    cache.verdict_counts_per_platform[plat] = plat_counts
                    setattr(cache, f"last_{prefix}_submission_time", new_time)
                else:
                    cache = UserVerdictStats(user_id=user_id)
                    cache.verdict_counts_per_platform[plat] = plat_counts
                    setattr(cache, f"last_{prefix}_submission_time", new_time)
                updated = True
                
                # Update combined for return (but will recompute at end)
    
    if updated:
        cache.last_update = datetime.utcnow()
        cache.save()
    
    # Recompute combined from (updated) cache
    combined = defaultdict(int)
    cache = UserVerdictStats.objects(user_id=user_id).first()  # Reload if new
    if cache:
        for plat_counts in cache.verdict_counts_per_platform.values():
            for v, c in plat_counts.items():
                combined[v] += c
    
    return dict(combined)