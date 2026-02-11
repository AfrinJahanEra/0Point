# Modified: Server/account/platforms/atcoder.py
"""
AtCoder integration (JSON history based)
Stable implementation using official history endpoint.
NO HTML scraping.
NO selectors.
NO fragile DOM parsing.
"""
import requests
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CodingDashboard/1.0)"
}
HISTORY_URL = "https://atcoder.jp/users/{handle}/history/json"
SUBMISSIONS_URL = "https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user={handle}&from_second={from_second}"
PROBLEMS_URL = "https://kenkoooo.com/atcoder/resources/problems.json"
TIMEOUT = 50

# -----------------------------
# Fetch problem title map
# -----------------------------
def get_problem_map():
    try:
        resp = requests.get(PROBLEMS_URL, headers=HEADERS, timeout=TIMEOUT)
        if resp.status_code != 200:
            return {}
        data = resp.json()
        if not isinstance(data, list):
            return {}
        problem_map = {p['id']: p['title'] for p in data}
        return problem_map
    except Exception:
        return {}

# -----------------------------
# Fetch rating + profile stats
# -----------------------------
def fetch_rating(handle: str):
    try:
        url = HISTORY_URL.format(handle=handle)
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if resp.status_code != 200:
            raise Exception("Invalid AtCoder handle or profile not found")
        data = resp.json()
        if not isinstance(data, list):
            raise Exception("Invalid AtCoder response format")
        # Rated contests only
        rated = [x for x in data if x.get("IsRated") is True]
        # Defaults
        current_rating = 0
        max_rating = 0
        min_rating = 0
        contests_count = 0
        rating_history = []
        if rated:
            current_rating = rated[-1].get("NewRating", 0)
            max_rating = max(x.get("NewRating", 0) for x in rated)
            min_rating = min(x.get("NewRating", 0) for x in rated)
            contests_count = len(rated)
            for entry in rated:
                rating_history.append({
                    "date": entry.get("EndTime", "")[:10],
                    "rating": entry.get("NewRating", 0),
                    "contest_name": entry.get("ContestName"),
                    "rank": entry.get("Place"),
                })
        return {
            "current_rating": current_rating,
            "max_rating": max_rating,
            "min_rating": min_rating,
            "contests_count": contests_count,
            "rank": "", # AtCoder rank color not in JSON API
            "badge": "", # You control badges in your system
            "rating_history": rating_history,
        }
    except Exception as e:
        raise Exception(f"Failed to fetch AtCoder data: {str(e)}")

# -----------------------------
# Fetch contest list (dashboard)
# -----------------------------
def fetch_contests(handle: str):
    contests = []
    try:
        url = HISTORY_URL.format(handle=handle)
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if resp.status_code != 200:
            return contests
        data = resp.json()
        for entry in data:
            if not entry.get("IsRated"):
                continue
            contests.append({
                "id": f"ac-{entry.get('ContestScreenName')}",
                "title": entry.get("ContestName"),
                "date": entry.get("EndTime")[:10] if entry.get("EndTime") else None,
                "datetime": entry.get("EndTime"),
                "rank": entry.get("Place"),
                "solved": "-",
                "rating": entry.get("NewRating"),
                "platform": "atcoder",
                "status": "finished",
                "type": "rated",
            })
    except Exception:
        pass
    return contests

# -----------------------------
# Fetch submissions
# -----------------------------
def fetch_submissions(handle: str, limit: int = 100):
    """
    Fetch recent submissions from AtCoder
    Uses kenkoooo's AtCoder API
    """
    submissions = []
    try:
        # Fetch from last 5 years to limit results (adjust as needed)
        import time
        from_second = int(time.time()) - (60 * 60 * 24 * 365 * 5)
        url = SUBMISSIONS_URL.format(handle=handle, from_second=from_second)
        
        print(f"Fetching AtCoder submissions for: {handle}")
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        
        if resp.status_code != 200:
            print(f"AtCoder API returned status {resp.status_code}")
            return submissions
            
        data = resp.json()
        if not isinstance(data, list):
            print("AtCoder API returned non-list data")
            return submissions
        
        print(f"Fetched {len(data)} total submissions from AtCoder API")
        
        # Get problem title map
        problem_map = get_problem_map()
        
        # Limit the number of submissions
        for sub in data[:limit]:
            contest_id = sub.get('contest_id', '')
            problem_id = sub.get('problem_id', '')
            problem_title = problem_map.get(problem_id, problem_id)  # Fallback to ID if title not found
            
            submissions.append({
                "id": f"ac-{sub.get('id')}",
                "platform": "atcoder",
                "submission_id": sub.get('id'),
                "submission_url": f"https://atcoder.jp/contests/{contest_id}/submissions/{sub.get('id')}",
                "problem": {
                    "name": problem_title,
                    "url": f"https://atcoder.jp/contests/{contest_id}/tasks/{problem_id}",
                    "tags": []
                },
                "problem_code": problem_id,
                "problem_title": problem_title,
                "verdict": sub.get('result', ''),
                "submitted_at": datetime.fromtimestamp(sub.get('epoch_second', 0)).isoformat(),
                "language": sub.get('language', ''),
                "execution_time": f"{sub.get('execution_time', 0)} ms" if sub.get('execution_time') else None,
                "memory": None,  # No memory info in API
            })
            
        print(f"✓ Returning {len(submissions)} AtCoder submissions")
    except Exception as e:
        print(f"✗ Error fetching AtCoder submissions: {e}")
        
    return submissions