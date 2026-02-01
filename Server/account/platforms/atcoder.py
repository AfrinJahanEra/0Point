"""
AtCoder integration (JSON history based)
Stable implementation using official history endpoint.
NO HTML scraping.
NO selectors.
NO fragile DOM parsing.
"""

import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CodingDashboard/1.0)"
}

HISTORY_URL = "https://atcoder.jp/users/{handle}/history/json"
TIMEOUT = 10


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
            "rank": "",          # AtCoder rank color not in JSON API
            "badge": "",         # You control badges in your system
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
