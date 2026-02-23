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