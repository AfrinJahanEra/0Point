# Server/account/calendar.py

import requests
from datetime import datetime
from typing import Dict, List, Optional


LEETCODE_CALENDAR_API = "https://leetcode-api-pied.vercel.app/user/{handle}/calendar"
LEETCODE_YEAR_CALENDAR_API = "https://leetcode-api-pied.vercel.app/user/{handle}/calendar?year={year}"


def fetch_leetcode_calendar(handle: str) -> Optional[Dict]:
    """
    Fetch overall LeetCode submission calendar for a user.
    Returns data similar to:
    {
        "activeYears": [2020, 2021, ...],
        "streak": 8,
        "totalActiveDays": 16,
        "submissionCalendar": {"timestamp": count, ...}
    }
    """
    try:
        url = LEETCODE_CALENDAR_API.format(handle=handle)
        response = requests.get(url, timeout=12)
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, dict) or "submissionCalendar" not in data:
            return None

        return data
    except Exception as e:
        print(f"Failed to fetch LeetCode calendar for {handle}: {str(e)}")
        return None


def fetch_leetcode_year_calendar(handle: str, year: int) -> Optional[Dict]:
    """
    Fetch LeetCode submission calendar for a specific year.
    Returns similar structure but only for that year.
    """
    try:
        url = LEETCODE_YEAR_CALENDAR_API.format(handle=handle, year=year)
        response = requests.get(url, timeout=12)
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, dict) or "submissionCalendar" not in data:
            return None

        return data
    except Exception as e:
        print(f"Failed to fetch LeetCode year calendar for {handle} ({year}): {str(e)}")
        return None


def process_submission_calendar(calendar_data: Dict) -> List[Dict]:
    """
    Convert timestamp-based calendar to list of {date, count} for frontend heatmap.
    date format: "YYYY-MM-DD"
    """
    if not calendar_data or "submissionCalendar" not in calendar_data:
        return []

    result = []
    for timestamp_str, count in calendar_data["submissionCalendar"].items():
        try:
            # timestamp is Unix seconds (string key)
            dt = datetime.fromtimestamp(int(timestamp_str))
            date_str = dt.strftime("%Y-%m-%d")
            result.append({"date": date_str, "count": count})
        except (ValueError, TypeError):
            continue

    return sorted(result, key=lambda x: x["date"])