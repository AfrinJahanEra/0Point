from datetime import datetime, timezone
import json
import re
from venv import logger
import requests


LEETCODE_CALENDAR_API = "https://leetcode-api-pied.vercel.app/user/{handle}/calendar"

def fetch_leetcode_calendar(handle, year=None):
    """
    Fetch LeetCode submission calendar
    - Default: full calendar
    - With year: calendar for specific year
    """
    if year:
        url = f"{LEETCODE_CALENDAR_API.format(handle=handle)}?year={year}"
    else:
        url = LEETCODE_CALENDAR_API.format(handle=handle)


    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    return resp.json()

def fetch_codechef_calendar(handle, year=None):
    url = f"https://www.codechef.com/users/{handle}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        text = resp.text

        # Attempt to locate the submissions data variable
        pattern = r'userDailySubmissionsStats\s*=\s*(\[.*?\]);'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)

        daily_data = []

        if match:
            data_str = match.group(1).strip()
            # Remove possible comments or trailing junk
            data_str = re.sub(r'//.*?$|/\*.*?\*/', '', data_str, flags=re.MULTILINE | re.DOTALL)
            try:
                daily_data = json.loads(data_str)
            except json.JSONDecodeError:
                # Fallback: extract individual entries
                items = re.findall(r'{"date":"([^"]+)","value":(\d+)}', data_str)
                daily_data = [{"date": d, "value": int(v)} for d, v in items]
        else:
            logger.warning(f"No userDailySubmissionsStats found for {handle}")

        calendar = {}
        for item in daily_data:
            try:
            # Parse as naive date (YYYY-MM-DD)
                naive_dt = datetime.strptime(item["date"], "%Y-%m-%d")
        
        # Attach UTC timezone → midnight UTC
                utc_dt = naive_dt.replace(tzinfo=timezone.utc)
        
        # Now timestamp is correct for UTC midnight of that date
                ts = int(utc_dt.timestamp())
        
                calendar[str(ts)] = item.get("value", 0)
            except (KeyError, ValueError) as parse_err:
                logger.debug(f"Skipping invalid entry: {item} → {parse_err}")

        # Year filter
        if year:
            y = int(year)
            calendar = {
                k: v for k, v in calendar.items()
                if datetime.fromtimestamp(int(k)).year == y
            }

        # Streak & stats calculation
        all_dates = sorted(calendar.keys(), key=int)
        total = sum(calendar.values())
        active_days = len(all_dates)

        current_streak = max_streak = 0
        prev_date = None
        for ts_str in all_dates:
            curr = datetime.fromtimestamp(int(ts_str))
            if prev_date and (curr - prev_date).days == 1:
                current_streak += 1
            else:
                current_streak = 1
            max_streak = max(max_streak, current_streak)
            prev_date = curr

        years = {datetime.fromtimestamp(int(ts)).year for ts in calendar}

        return {
            "submissionCalendar": calendar,
            "streak": max_streak,
            "activeYears": sorted(list(years)),
            "total_submissions": total,
            "active_days": active_days
        }

    except requests.RequestException as req_exc:
        logger.error(f"Network error fetching CodeChef profile {handle}: {req_exc}")
        if hasattr(req_exc.response, 'status_code'):
            raise Exception(f"CodeChef returned status {req_exc.response.status_code}")
        raise Exception(f"Failed to reach CodeChef: {str(req_exc)}")

    except Exception as e:
        logger.exception(f"Unexpected error in CodeChef calendar fetch for {handle}")
        # Return graceful fallback instead of crashing the API
        return {
            "submissionCalendar": {},
            "streak": 0,
            "activeYears": [],
            "error": "Could not load submission calendar (data extraction failed)"
        }