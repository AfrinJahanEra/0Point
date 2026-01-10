import requests
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from crossPlatform.models import ExternalContest

CF_API = "https://codeforces.com/api/contest.list"

def map_cf_phase(phase: str) -> str:
    if phase == "CODING":
        return "live"
    if phase == "BEFORE":
        return "upcoming"
    return "finished"

def sync_codeforces_contests():
    response = requests.get(CF_API, timeout=15)
    response.raise_for_status()

    data = response.json()
    if data["status"] != "OK":
        raise RuntimeError("Codeforces API failed")

    now = make_aware(datetime.utcnow())

    for c in data["result"]:
        start_time = make_aware(
            datetime.utcfromtimestamp(c["startTimeSeconds"])
        )

        ExternalContest.objects(
            platform="codeforces",
            external_id=c["id"]
        ).update_one(
            set__title=c["name"],
            set__url=f"https://codeforces.com/contest/{c['id']}",
            set__start_time=start_time,
            set__duration_seconds=c["durationSeconds"],
            set__status=map_cf_phase(c["phase"]),
            set__last_synced=now,
            upsert=True
        )
