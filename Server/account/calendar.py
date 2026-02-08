# Server/account/calendar.py
import requests
from datetime import datetime
import json

LC_CALENDAR_API = "https://leetcode-api-pied.vercel.app/user/{}/calendar"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def fetch_leetcode_calendar(username: str):
    if not username:
        return {"calendar": {}, "activeYears": []}

    try:
        url = LC_CALENDAR_API.format(username)
        resp = requests.get(url, headers=HEADERS, timeout=52)
        
        if resp.status_code != 200:
            print(f"Calendar API {resp.status_code} for {username}")
            return {"calendar": {}, "activeYears": []}

        data = resp.json()

        # Extract active years
        active_years = data.get("activeYears", [])

        # Parse submissionCalendar (string or dict)
        calendar_raw = data.get("submissionCalendar")
        if not calendar_raw:
            return {"calendar": {}, "activeYears": active_years}

        if isinstance(calendar_raw, str):
            try:
                calendar_data = json.loads(calendar_raw)
            except json.JSONDecodeError:
                print("Failed to parse submissionCalendar string")
                return {"calendar": {}, "activeYears": active_years}
        else:
            calendar_data = calendar_raw

        # Convert Unix timestamps to YYYY-MM-DD
        result = {}
        for unix_ts_str, count in calendar_data.items():
            try:
                unix_ts = int(unix_ts_str)
                date_str = datetime.fromtimestamp(unix_ts).strftime("%Y-%m-%d")
                result[date_str] = int(count)
            except:
                continue

        return {
            "calendar": result,
            "activeYears": sorted(active_years, reverse=True)  # newest first
        }

    except Exception as e:
        print(f"Calendar fetch error for {username}: {e}")
        return {"calendar": {}, "activeYears": []}


def get_user_calendar(user):
    lc_profile = next((p for p in user.platform_profiles if p.platform == "leetcode"), None)
    if not lc_profile or not lc_profile.handle:
        return {"leetcode": {"calendar": {}, "activeYears": []}}

    return {"leetcode": fetch_leetcode_calendar(lc_profile.handle)}