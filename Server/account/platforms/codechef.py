# Server/account/platforms/codechef.py

"""
CodeChef integration
Uses HTML scraping + JS variable extraction for rating history
"""

import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

PROFILE_URL = "https://www.codechef.com/users/{}"
TIMEOUT =50


def fetch_rating(handle: str):
    """
    Fetch rating data and history from CodeChef user profile.
    Stores:
    - current_rating
    - max_rating
    - min_rating
    - contests_count
    - badge
    - rating_history (list of dicts for graphs)
    """
    handle = handle.strip()
    if not handle:
        raise ValueError("Handle cannot be empty")

    try:
        url = PROFILE_URL.format(handle)
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")

        # Current rating
        current_rating = 0
        rating_el = soup.select_one('.rating-header .rating-number')
        if rating_el:
            text = rating_el.get_text(strip=True)
            if text.isdigit():
                current_rating = int(text)

        # Badge / Stars (e.g. 6★)
        badge = ""
        star_spans = soup.select('.rating-header .rating-star span[style*="background-color"]')
        if star_spans:
            badge = f"{len(star_spans)}★"
        else:
            # Fallback: look near username
            username_span = soup.select_one('.m-username--link')
            if username_span and username_span.previous_sibling:
                prev_text = username_span.previous_sibling.text.strip()
                if '★' in prev_text:
                    badge = prev_text

        # Max rating from small text
        max_rating = current_rating
        small_el = soup.select_one('.rating-header small')
        if small_el:
            text = small_el.get_text(strip=True)
            match = re.search(r'Highest Rating (\d+)', text, re.IGNORECASE)
            if match:
                max_rating = int(match.group(1))

        # Contests count
        contests_count = 0
        count_text = soup.find(string=re.compile(r'No\. of Contests Participated', re.IGNORECASE))
        if count_text:
            parent = count_text.find_parent()
            if parent:
                b = parent.find('b')
                if b and b.text.isdigit():
                    contests_count = int(b.text)

        # ── Rating history from JS variable all_rating ──
        rating_history = []
        min_rating = current_rating if current_rating > 0 else 0

        # Find script containing all_rating
        scripts = soup.find_all('script', string=True)
        for script in scripts:
            if script.string and 'all_rating =' in script.string:
                content = script.string

                # Extract the full array content
                match = re.search(r'var\s+all_rating\s*=\s*(\[[\s\S]*?\]);', content, re.DOTALL)
                if match:
                    array_str = match.group(1).strip()

                    # Find individual contest objects
                    object_matches = re.findall(r'\{[\s\S]*?\}', array_str)

                    for obj_str in object_matches:
                        entry = {}

                        # Extract key-value pairs
                        pairs = re.findall(
                            r'"(\w+)":\s*(?:"([^"]*)"|(\d+)|true|false|null)',
                            obj_str
                        )

                        for key, str_val, num_val in pairs:
                            if str_val:
                                val = str_val
                            elif num_val:
                                val = int(num_val)
                            else:
                                val = None
                            entry[key] = val

                        # Process valid entries
                        if 'rating' in entry and 'end_date' in entry:
                            try:
                                date_full = entry['end_date']
                                date_part = date_full.split(' ')[0]  # "YYYY-MM-DD"

                                rank_val = entry.get('rank')
                                rank = int(rank_val) if rank_val and str(rank_val).isdigit() else None

                                rating_history.append({
                                    "date": date_part,
                                    "rating": int(entry['rating']),
                                    "contest_name": entry.get('name') or entry.get('code', 'Unknown Contest'),
                                    "rank": rank,
                                    "contest_code": entry.get('code'),
                                })

                                current_r = int(entry['rating'])
                                min_rating = min(min_rating, current_r)
                                max_rating = max(max_rating, current_r)

                            except (ValueError, TypeError, KeyError):
                                continue

                    # If we successfully parsed entries, stop looking
                    if rating_history:
                        break

        # Sort oldest → newest (important for charts)
        rating_history.sort(key=lambda x: x['date'])

        return {
            "current_rating": current_rating,
            "max_rating": max_rating,
            "min_rating": min_rating,
            "contests_count": contests_count or len(rating_history),
            "badge": badge,
            "rank": None,  # can be added later if needed
            "rating_history": rating_history,
        }

    except requests.exceptions.RequestException as rqe:
        raise Exception(f"Network issue fetching CodeChef: {str(rqe)}")
    except Exception as e:
        raise Exception(f"CodeChef parsing failed for {handle}: {str(e)}")


def fetch_contests(handle: str):
    """
    Returns contest history compatible with your ContestHistoryView
    Reuses fetch_rating data
    """
    data = fetch_rating(handle)
    contests = []

    for hist in data.get('rating_history', []):
        contests.append({
            "id": f"cc-{hist.get('contest_code', hist['contest_name'].replace(' ', '-').lower())}",
            "title": hist['contest_name'],
            "date": hist['date'],
            "datetime": f"{hist['date']}T22:00:00",  # approximate end time (common for starters)
            "rank": hist.get('rank'),
            "solved": None,  # not available in this data source
            "rating": hist['rating'],
            "platform": "codechef",
            "status": "finished",
            "type": "rated",
        })

    return contests


def parse_cc_time(title):
    # example: "09:50 PM 04/02/26"
    try:
        return datetime.strptime(title, "%I:%M %p %d/%m/%y").isoformat()
    except:
        return None


def fetch_submissions(handle, limit=21):
    submissions = []
    page = 0

    while True:
        url = f"https://www.codechef.com/recent/user?page={page}&user_handle={handle}"

        resp = requests.get(url, headers=HEADERS, timeout=50)
        resp.raise_for_status()

        data = resp.json()
        html = data.get("content", "")

        if not html:
            break  # no more pages

        soup = BeautifulSoup(html, "lxml")
        rows = soup.select("table.dataTable tbody tr")

        if not rows:
            break  # reached last page

        for row in rows:
            if len(submissions) >= limit:
                return submissions

            cols = row.find_all("td")
            if len(cols) < 5:
                continue

            # ---- Time ----
            time_td = cols[0]
            time_title = time_td.get("title")
            submitted_at = parse_cc_time(time_title)

            # ---- Problem ----
            prob_td = cols[1]
            prob_code = prob_td.get_text(strip=True)
            prob_link = prob_td.find("a")["href"]

            # ---- Verdict ----
            verdict_td = cols[2]
            verdict_span = verdict_td.find("span", title=True)
            verdict = verdict_span["title"].upper() if verdict_span else "UNKNOWN"

            # ---- Language ----
            language = cols[3].get_text(strip=True)

            # ---- Submission ----
            sol_td = cols[4]
            sol_link = sol_td.find("a")["href"]
            submission_id = sol_link.split("/")[-1]

            submissions.append({
                "platform": "codechef",
                "submission_id": submission_id,
                "submitted_at": submitted_at,
                "verdict": verdict,
                "language": language,
                "execution_time": None,
                "memory": None,

                "problem": {
                    "name": prob_code,
                    "url": f"https://www.codechef.com{prob_link}",
                    "tags": []
                },

                "submission_url": f"https://www.codechef.com{sol_link}"
            })

        page += 1  # 👉 NEXT PAGE

    return submissions
