from collections import Counter
from datetime import datetime, time, timedelta, timezone
import json
import logging
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
    

logger = logging.getLogger(__name__)

def fetch_atcoder_calendar(handle, year=None):
    """
    Fetch AtCoder submissions using kenkoooo API v3.
    Fetches from 2022-01-01 onwards (or earlier if needed) with pagination.
    Groups submissions by UTC day for heatmap.
    """
    base_url = "https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions"
    submissions = []

    # Start from beginning of 2022 (Unix timestamp)
    start_timestamp = int(datetime(2022, 1, 1, tzinfo=timezone.utc).timestamp())
    from_second = start_timestamp
    batch_size = 500
    max_attempts = 50  # Safety: max ~25,000 submissions

    try:
        while True:
            params = {
                "user": handle,
                "from_second": from_second
            }
            resp = requests.get(base_url, params=params, timeout=12)
            resp.raise_for_status()
            batch = resp.json()

            if not batch:
                logger.info(f"No more submissions after {from_second} for {handle}")
                break

            submissions.extend(batch)
            logger.debug(f"Fetched {len(batch)} submissions (total now: {len(submissions)})")

            # Next batch starts right after the last submission
            last_epoch = batch[-1]["epoch_second"]
            from_second = last_epoch + 1

            # Stop if we got fewer than batch_size → last page
            if len(batch) < batch_size:
                break

            # Gentle rate limiting (kenkoooo is generous but still polite)
            time.sleep(0.6)

            # Safety break
            if len(submissions) > 25000 or len(submissions) > batch_size * max_attempts:
                logger.warning(f"Too many submissions for {handle} — stopping early")
                break

        # Group by UTC day (midnight)
        daily_counts = Counter()
        for sub in submissions:
            # epoch_second is UTC Unix timestamp
            dt = datetime.fromtimestamp(sub["epoch_second"], tz=timezone.utc)
            # Start of day (midnight UTC)
            day_start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
            ts = int(day_start.timestamp())
            daily_counts[ts] += 1

        calendar = {str(ts): count for ts, count in daily_counts.items()}

        # Optional: filter to specific year (if ?year= is passed)
        if year:
            y = int(year)
            calendar = {
                k: v for k, v in calendar.items()
                if datetime.fromtimestamp(int(k), tz=timezone.utc).year == y
            }

        # Streak, total, active days, active years
        all_dates = sorted(calendar.keys(), key=int)
        total = sum(calendar.values())
        active_days = len(all_dates)

        current_streak = max_streak = 0
        prev_date = None
        for ts_str in all_dates:
            curr = datetime.fromtimestamp(int(ts_str), tz=timezone.utc)
            if prev_date and (curr - prev_date).days == 1:
                current_streak += 1
            else:
                current_streak = 1
            max_streak = max(max_streak, current_streak)
            prev_date = curr

        years = {datetime.fromtimestamp(int(ts), tz=timezone.utc).year for ts in calendar}

        return {
            "submissionCalendar": calendar,
            "streak": max_streak,
            "activeYears": sorted(list(years)),
            "total_submissions": total,
            "active_days": active_days,
            "fetched_from": datetime.fromtimestamp(start_timestamp, tz=timezone.utc).strftime("%Y-%m-%d"),
            "total_fetched": len(submissions)
        }

    except requests.RequestException as req_exc:
        logger.error(f"kenkoooo API network error for {handle}: {req_exc}")
        return {
            "submissionCalendar": {},
            "streak": 0,
            "activeYears": [],
            "error": f"Failed to reach AtCoder API: {str(req_exc)}"
        }
    except Exception as e:
        logger.exception(f"Unexpected error in AtCoder calendar fetch for {handle}")
        return {
            "submissionCalendar": {},
            "streak": 0,
            "activeYears": [],
            "error": str(e)
        }