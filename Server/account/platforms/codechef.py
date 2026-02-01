"""
CodeChef scraper integration
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CodingDashboard/1.0)",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_rating(handle: str):
    """
    Scrape CodeChef user profile page to get rating and contest stats.
    """

    try:
        url = f"https://www.codechef.com/users/{handle}"
        resp = requests.get(url, headers=HEADERS, timeout=10)

        if resp.status_code != 200:
            raise Exception("Invalid CodeChef handle or ratings not available")

        soup = BeautifulSoup(resp.text, "lxml")

        # Rating number (if the user never participated, site hides it)
        rating_el = soup.select_one(".rating-number")
        current_rating = int(rating_el.text.strip()) if rating_el and rating_el.text.strip().isdigit() else 0

        # Max rating is not shown separately; approximate with current
        max_rating = current_rating

        # Find stars (visual rank indicator)
        star_el = soup.select_one(".rating-star")
        badge = star_el.get("title", "").strip() if star_el else ""

        # Contest count: try to extract from statistics table if available
        contests_count = 0
        stats_rows = soup.select(".user-details-content .rating-data-section > .content > table tbody tr")
        for row in stats_rows:
            label_el = row.select_one("td:nth-child(1)")
            value_el = row.select_one("td:nth-child(2)")
            if label_el and value_el:
                label = label_el.text.strip().lower()
                if "contests" in label:
                    try:
                        contests_count = int(value_el.text.strip().replace(",", ""))
                    except:
                        contests_count = 0

        # No official JSON rating history endpoint for CodeChef
        rating_history = []

        return {
            "current_rating": current_rating,
            "max_rating": max_rating,
            "min_rating": 0,
            "contests_count": contests_count,
            "rank": badge,
            "badge": badge,
            "rating_history": rating_history,
        }

    except Exception as e:
        # Return a descriptive error up the stack
        raise Exception(f"Failed to fetch CodeChef data: {str(e)}")


def fetch_contests(handle: str):
    """
    CodeChef does not openly publish contest history in a structured JSON.
    If needed, you can scrape the user's contest table.
    For now, return empty (or extend with scraping logic).
    """
    return []
