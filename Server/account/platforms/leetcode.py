"""
LeetCode API integration
(alfa-leetcode-api.onrender.com)
"""

import requests
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


BASE_URL = "https://alfa-leetcode-api.onrender.com"


# ---------------- Session ---------------- #

def create_session():
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


# ---------------- Utils ---------------- #

def ts_to_dt(ts):
    try:
        return datetime.fromtimestamp(int(ts))
    except:
        return None


# ---------------- Profile ---------------- #

def fetch_rating(handle):
    """Fetch rating from LeetCode API (Codeforces-compatible structure)"""
    try:
        session = create_session()

        # -------- basic profile --------
        profile_res = session.get(f"{BASE_URL}/{handle}", timeout=10)
        if profile_res.status_code != 200:
            raise Exception("LeetCode user not found")

        profile = profile_res.json()
        profile_name = profile.get("username") or profile.get("userSlug") or handle

        # -------- contest summary --------
        contest_res = session.get(f"{BASE_URL}/{handle}/contest", timeout=10)
        contest_data = contest_res.json() if contest_res.status_code == 200 else {}

        current_rating = contest_data.get("contestRating", 0)
        global_rank = contest_data.get("contestGlobalRanking")

        badge = ""
        if isinstance(contest_data.get("contestBadges"), dict):
            badge = contest_data["contestBadges"].get("name", "")

        # -------- contest history --------
        history_res = session.get(f"{BASE_URL}/{handle}/contest/history", timeout=10)
        history_data = history_res.json() if history_res.status_code == 200 else {}

        history = history_data.get("contestHistory", [])

        contests_count = 0
        rating_history = []
        contest_history = []

        min_rating = current_rating
        max_rating = current_rating
        total_solved = 0

        for entry in history:
            if not entry.get("attended"):
                continue   # only real participated contests

            contests_count += 1

            contest_info = entry.get("contest", {})
            title = contest_info.get("title", "Unknown Contest")
            start_ts = contest_info.get("startTime")
            dt = ts_to_dt(start_ts)

            rating = entry.get("rating", 0)
            rank = entry.get("ranking")
            solved = entry.get("problemsSolved", 0)

            if dt:
                # rating history (graph)
                rating_history.append({
                    "date": dt.isoformat(),
                    "datetime": dt.isoformat(),
                    "rating": rating,
                    "contest_name": title,
                    "rank": rank,
                    "solved": solved
                })

                # contest history (timeline)
                contest_history.append({
                    "id": f"lc-{start_ts}",
                    "title": title,
                    "date": dt.strftime('%Y-%m-%d'),
                    "datetime": dt.isoformat(),
                    "rank": rank,
                    "solved": solved,
                    "rating": rating,
                    "platform": "leetcode",
                    "status": "finished",
                    "type": "rated"
                })

            if rating:
                min_rating = min(min_rating, rating)
                max_rating = max(max_rating, rating)

            total_solved += solved

        # newest → oldest
        rating_history.sort(key=lambda x: x["datetime"], reverse=True)
        contest_history.sort(key=lambda x: x["datetime"], reverse=True)

        return {
            "current_rating": current_rating,
            "max_rating": max_rating,
            "min_rating": min_rating,
            "contests_count": contests_count,   # contests participated
            "rank": global_rank,
            "badge": badge,
            "rating_history": rating_history,
            "solved": total_solved,
            "profile_name": profile_name,
            # optional if you want combined response
            "contest_history": contest_history
        }

    except Exception as e:
        raise Exception(f"Failed to fetch LeetCode data: {str(e)}")


# ---------------- Contest History ---------------- #

def fetch_contests(handle):
    """Fetch contest history from LeetCode (Codeforces-style schema)"""
    contests = []
    try:
        session = create_session()
        res = session.get(f"{BASE_URL}/{handle}/contest/history", timeout=10)

        if res.status_code != 200:
            return contests

        data = res.json()
        history = data.get("contestHistory", [])

        for entry in history:
            if not entry.get("attended"):
                continue

            contest_info = entry.get("contest", {})
            title = contest_info.get("title", "Unknown Contest")
            start_ts = contest_info.get("startTime")
            dt = ts_to_dt(start_ts)

            if not dt:
                continue

            contests.append({
                "id": f"lc-{start_ts}",
                "title": title,
                "date": dt.strftime('%Y-%m-%d'),
                "datetime": dt.isoformat(),
                "rank": entry.get("ranking"),
                "solved": entry.get("problemsSolved", 0),
                "rating": entry.get("rating", 0),
                "platform": "leetcode",
                "status": "finished",
                "type": "rated"
            })

        # newest → oldest
        contests.sort(key=lambda x: x["datetime"], reverse=True)

    except Exception:
        pass

    return contests


# ---------------- Submissions ---------------- #

# ---------------- Submissions ---------------- #

def fetch_submissions(handle, limit=30):
    """
    Fetch recent LeetCode submissions (ALL verdicts)
    using new API: leetcode-api-pied.vercel.app
    """
    submissions = []
    try:
        session = create_session()

        res = session.get(
            f"https://leetcode-api-pied.vercel.app/user/{handle}/submissions",
            timeout=10
        )

        if res.status_code != 200:
            return submissions

        data = res.json()

        for sub in data[:limit]:
            dt = ts_to_dt(sub.get("timestamp"))

            slug = sub.get("titleSlug")
            title = sub.get("title")

            verdict_map = {
                10: "OK",  # Accepted
                11: "WA",  # Wrong Answer
                12: "TLE", # Time Limit Exceeded
                13: "MLE", # Memory Limit Exceeded
                14: "RE",  # Runtime Error
                15: "CE",  # Compilation Error
            }

            verdict = verdict_map.get(sub.get("status"), sub.get("statusDisplay"))

            submissions.append({
                "id": f"lc-{sub.get('id')}",               # internal unique key
                "platform": "leetcode",
                "submission_id": sub.get("id"),            # actual LC submission ID
                "problem": {
                    "code": None,
                    "name": title,
                    "url": f"https://leetcode.com/problems/{slug}/",
                    "tags": sub.get("topicTags", [])
                },
                "verdict": verdict,
                "language": sub.get("langName"),
                "submitted_at": dt.isoformat() if dt else None,
                "execution_time": sub.get("runtime"),
                "memory": sub.get("memory"),
                "submission_url": f"https://leetcode.com{sub.get('url')}"
            })

    except Exception as e:
        print("LeetCode submission fetch error:", e)

    return submissions
