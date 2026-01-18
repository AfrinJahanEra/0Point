import requests
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from crossPlatform.models import ExternalContest
from .base import cleanup_old_contests  # assuming you have this helper
from dateutil.relativedelta import relativedelta

ATCODER_CONTESTS_JSON = "https://kenkoooo.com/atcoder/resources/contests.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ContestSyncBot/1.0; ramisanan619@gmail.com)",
}


def format_duration_like_cf(seconds: int) -> str:
    # Reuse the same function as Codeforces / LeetCode
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


def map_atcoder_status(start_epoch: int, duration_sec: int) -> str:
    now = int(datetime.utcnow().timestamp())
    start = start_epoch
    end = start + duration_sec

    if now < start:
        return "upcoming"
    elif start <= now < end:
        return "live"
    else:
        return "finished"


def sync_atcoder_contests():
    try:
        resp = requests.get(ATCODER_CONTESTS_JSON, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        contests = resp.json()
    except Exception as e:
        print(f"AtCoder sync failed: {e}")
        return

    now_aware = make_aware(datetime.utcnow())
    saved_count = 0

    # We only care about contests from ~last 3 months + future
    # But we'll let cleanup_old_contests handle old ones

    for c in contests:
        contest_id = c.get("id")  # e.g. "abc123", "arc150", "ahc015"
        if not contest_id:
            continue

        start_epoch = c.get("start_epoch_second")
        if not start_epoch:
            continue

        start_dt = make_aware(datetime.fromtimestamp(start_epoch))

        duration_sec = c.get("duration_second", 0)

        status = map_atcoder_status(start_epoch, duration_sec)

        # Skip very old contests early (optional optimization)
        if status == "finished" and start_dt < now_aware - timedelta(days=90):
            continue

        update_data = {
            "title": c.get("title", "Unnamed Contest").strip(),
            "url": f"https://atcoder.jp/contests/{contest_id}",
            "start_time": start_dt,
            "duration_seconds": duration_sec,
            "duration_formatted": format_duration_like_cf(duration_sec),
            "status": status,
            "last_synced": now_aware,
            # participants: not available in this endpoint
        }

        ExternalContest.objects(
            platform="atcoder",
            external_id=contest_id   # string id → abc123, arc999, etc.
        ).update_one(upsert=True, **update_data)

        saved_count += 1

    # Clean up old contests
    cleanup_old_contests("atcoder", keep_days=70)

    print(f"AtCoder sync completed — processed/saved {saved_count} contests")