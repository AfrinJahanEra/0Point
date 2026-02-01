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
TIMEOUT = 12


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