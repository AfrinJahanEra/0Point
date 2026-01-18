# crossPlatform/services/leetcode.py
import requests
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from crossPlatform.models import ExternalContest
from .base import cleanup_old_contests

ALFA_API_BASE = "https://alfa-leetcode-api.onrender.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

def format_duration_like_cf(seconds: int) -> str:
    if seconds <= 0:
        return "0 minutes"
    minutes = seconds // 60
    days = minutes // (24 * 60)
    minutes %= (24 * 60)
    hours = minutes // 60
    minutes %= 60
    parts = []
    if days > 0:
        parts.append(f"{days} day{'s' if days > 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours > 1 else ''}")
    if minutes > 0 or not parts:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    return " ".join(parts)

def map_leetcode_status(start_time_unix: int, duration: int) -> str:
    now = int(datetime.utcnow().timestamp())
    start = start_time_unix
    end = start + duration
    if now < start:
        return "upcoming"
    elif start <= now < end:
        return "live"
    else:
        return "finished"

def sync_leetcode_contests():
    try:
        url = f"{ALFA_API_BASE}/contests"  # gets ALL contests (past + upcoming)
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"alfa-leetcode-api failed: {e}")
        return

    # Correct extraction - the contests are under "allContests"
    all_contests = data.get("allContests", [])
    if not isinstance(all_contests, list):
        print("Unexpected response format: 'allContests' is not a list")
        return

    now_aware = make_aware(datetime.utcnow())
    saved_count = 0
    skipped_old = 0

    for c in all_contests:
        title_slug = c.get("titleSlug")
        if not title_slug:
            continue  # skip invalid entries

        contest_id = c.get("id") or title_slug  # fallback to slug if no id
        external_id = str(contest_id)

        title = c.get("title", "Unnamed Contest").strip()
        start_time_unix = c.get("startTime", 0)
        if start_time_unix == 0:
            continue

        duration_sec = c.get("duration", 0)
        start_dt = make_aware(datetime.fromtimestamp(start_time_unix))
        status = map_leetcode_status(start_time_unix, duration_sec)

        # Skip contests older than ~90 days (you can adjust)
        if status == "finished" and start_dt < now_aware - timedelta(days=90):
            skipped_old += 1
            continue

        update_data = {
            "title": title,
            "url": f"https://leetcode.com/contest/{title_slug}",
            "start_time": start_dt,
            "duration_seconds": duration_sec,
            "duration_formatted": format_duration_like_cf(duration_sec),
            "status": status,
            "last_synced": now_aware,
        }

        ExternalContest.objects(
            platform="leetcode",
            external_id=external_id
        ).update_one(upsert=True, **update_data)

        saved_count += 1

    cleanup_old_contests("leetcode", keep_days=70)

    print(f"LeetCode sync via alfa-leetcode-api completed")
    print(f"  → Total contests received: {len(all_contests)}")
    print(f"  → Saved/updated: {saved_count}")
    print(f"  → Skipped old contests: {skipped_old}")