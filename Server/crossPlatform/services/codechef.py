# crossPlatform/services/codechef.py

import requests
from datetime import datetime, timedelta, timezone  # ← FIXED: added 'timezone'
from django.utils.timezone import make_aware
from crossPlatform.models import ExternalContest
from .base import cleanup_old_contests

CODECHEF_API = (
    "https://www.codechef.com/api/list/contests/all"
    "?sort_by=START&sorting_order=asc&offset=0&mode=all"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Content-Type": "application/json",
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

def parse_codechef_iso_date(iso_str: str):
    """Parse CodeChef ISO string like '2026-01-17T00:00:00+05:30' → returns aware datetime"""
    if not iso_str:
        return None
    iso_str = iso_str.strip()
    try:
        return datetime.fromisoformat(iso_str)  # already aware!
    except ValueError as e:
        print(f"ISO parse failed for: '{iso_str}' → {e}")
        return None

def sync_codechef_contests():
    try:
        resp = requests.get(CODECHEF_API, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"CodeChef API request failed: {e}")
        return

    if data.get("status") != "success":
        print("API status not success:", data.get("message", "No message"))
        return

    now_aware = make_aware(datetime.utcnow())
    saved_count = 0
    skipped_old = 0
    failed_parse = 0
    total_received = 0

    def process_contests(category_name, contest_list):
        nonlocal saved_count, skipped_old, failed_parse, total_received
        print(f"Processing {category_name}: {len(contest_list)} contests")

        for c in contest_list:
            total_received += 1
            contest_code = c.get("contest_code")
            if not contest_code:
                continue

            title = c.get("contest_name", "Unnamed Contest").strip()
            duration_sec = int(c.get("contest_duration", 0))

            start_dt = parse_codechef_iso_date(c.get("contest_start_date_iso"))
            end_dt = parse_codechef_iso_date(c.get("contest_end_date_iso"))

            if not start_dt or not end_dt:
                failed_parse += 1
                continue

            # Convert to UTC naive for status comparison
            now_utc = datetime.utcnow()
            start_utc = start_dt.astimezone(timezone.utc).replace(tzinfo=None)
            end_utc = end_dt.astimezone(timezone.utc).replace(tzinfo=None)

            if now_utc < start_utc:
                status = "upcoming"
            elif start_utc <= now_utc < end_utc:
                status = "live"
            else:
                status = "finished"

            if status == "finished" and start_dt < now_aware - timedelta(days=90):
                skipped_old += 1
                continue

            update_data = {
                "title": title,
                "url": f"https://www.codechef.com/{contest_code}",
                "start_time": start_dt,  # already aware
                "duration_seconds": duration_sec,
                "duration_formatted": format_duration_like_cf(duration_sec),
                "status": status,
                "last_synced": now_aware,
            }

            ExternalContest.objects(
                platform="codechef",
                external_id=contest_code
            ).update_one(upsert=True, **update_data)

            saved_count += 1

    process_contests("present_contests", data.get("present_contests", []))
    process_contests("future_contests", data.get("future_contests", []))
    process_contests("past_contests", data.get("past_contests", []))

    cleanup_old_contests("codechef", keep_days=70)

    print(f"CodeChef sync completed (official API)")
    print(f"  → Total contests received: {total_received}")
    print(f"  → Saved/updated: {saved_count}")
    print(f"  → Skipped old finished: {skipped_old}")
    print(f"  → Failed to parse dates: {failed_parse}")
