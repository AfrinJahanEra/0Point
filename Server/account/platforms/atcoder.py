"""
AtCoder integration (HTML scraping + JSON history)
Implemented exactly like @qatadaazzeh/atcoder-api
"""

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CodingDashboard/1.0)"
}


# -----------------------------
# Fetch rating + profile stats
# -----------------------------
def fetch_rating(handle: str):
    try:
        profile_url = f"https://atcoder.jp/users/{handle}"
        resp = requests.get(profile_url, headers=HEADERS, timeout=10)

        if resp.status_code != 200:
            raise Exception("Invalid AtCoder handle")

        soup = BeautifulSoup(resp.text, "lxml")
        container = soup.select_one("#main-container .row")

        if not container:
            raise Exception("Profile page structure changed")

        # Username validation
        username_el = container.select_one(
            ".col-md-3.col-sm-12 h3 .username span"
        )
        if not username_el or not username_el.text.strip():
            raise Exception("Invalid AtCoder handle")

        # Rank (text like 'Heuristic Red')
        rank_el = container.select_one(".col-md-3.col-sm-12 h3 b")
        rank = rank_el.text.strip() if rank_el else None

        rows = container.select(
            ".col-md-9.col-sm-12 .dl-table tbody tr"
        )

        def extract_rating(row_index):
            try:
                return int(
                    rows[row_index]
                    .select("td span")[1]
                    .text.strip()
                )
            except Exception:
                return 0

        def extract_int(row_index):
            try:
                txt = rows[row_index].select_one("td").text
                return int("".join(filter(str.isdigit, txt))) or 0
            except Exception:
                return 0

        current_rating = extract_rating(1)
        max_rating = extract_rating(2)
        contests_count = extract_int(3)

        # -----------------------------
        # Rating history (JSON endpoint)
        # -----------------------------
        history_url = f"https://atcoder.jp/users/{handle}/history/json"
        history_resp = requests.get(history_url, headers=HEADERS, timeout=10)

        rating_history = []
        min_rating = current_rating

        if history_resp.status_code == 200:
            history = history_resp.json()
            for entry in history:
                if not entry.get("IsRated"):
                    continue

                old_r = entry.get("OldRating", 0)
                new_r = entry.get("NewRating", 0)

                min_rating = min(min_rating, old_r, new_r)

                rating_history.append({
                   "date": entry.get("EndTime", "")[:10],
                    "rating": new_r,
                    "contest_name": entry.get("ContestName"),
                    "rank": entry.get("Place"),
                })


      
        return {
            "current_rating": current_rating,        # userRating
            "max_rating": max_rating,         # userMaxRating
            "min_rating": min_rating,
            "contests_count": contests_count,  # userContestCount
            "rank": rank,
            "badge": "",
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
        url = f"https://atcoder.jp/users/{handle}/history/json"
        resp = requests.get(url, headers=HEADERS, timeout=10)

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
