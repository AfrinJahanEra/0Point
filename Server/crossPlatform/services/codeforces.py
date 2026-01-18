import requests
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from crossPlatform.models import ExternalContest
from dateutil.relativedelta import relativedelta

CF_API = "https://codeforces.com/api/contest.list"

def map_cf_phase(phase: str) -> str:
    if phase == "CODING":
        return "live"
    if phase == "BEFORE":
        return "upcoming"
    return "finished"

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
    if minutes > 0 or not parts:  # show minutes even if zero when no other parts
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")

    return " ".join(parts)



def fetch_participants_count(contest_id: int) -> int:
    try:
        url = f"https://codeforces.com/api/contest.standings?contestId={contest_id}"
        resp = requests.get(url, timeout=10)
        data = resp.json()
        
        if data.get("status") == "OK":
            rows = data["result"].get("rows", [])
            return len(rows)
        return 0
    except Exception as e:
        print(f"Failed to fetch standings for {contest_id}: {e}")
        return 0

def sync_codeforces_contests():
    response = requests.get(CF_API, timeout=15)
    response.raise_for_status()
    data = response.json()
    if data["status"] != "OK":
        raise RuntimeError("Codeforces API failed")

    now = make_aware(datetime.utcnow())
    
    for c in data["result"]:
        start_time = make_aware(datetime.utcfromtimestamp(c["startTimeSeconds"]))
        phase = c["phase"]
        status = map_cf_phase(phase)
        
        update_data = {
            "title": c["name"],
            "url": f"https://codeforces.com/contest/{c['id']}",
            "start_time": start_time,
            "duration_seconds": c["durationSeconds"],
            "duration_formatted": format_duration_like_cf(c["durationSeconds"]),
            "status": status,
            "last_synced": now,
        }
        
        # Only save participant count for FINISHED contests
        if status == "finished":
            participants = fetch_participants_count(c["id"])
            update_data["participants"] = participants
        
     