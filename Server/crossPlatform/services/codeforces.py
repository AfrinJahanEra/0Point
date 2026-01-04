import requests
from datetime import datetime
from django.utils.timezone import make_aware
from crossPlatform.models import ExternalContest

CF_API = "https://codeforces.com/api/contest.list"

def sync_codeforces_contests():
    """
    Fetch ALL Codeforces contests and store/update them locally
    """
    response = requests.get(CF_API, timeout=10)
    response.raise_for_status()

    data = response.json()
    if data["status"] != "OK":
        raise RuntimeError("Codeforces API failed")

    contests = data["result"]
    now = make_aware(datetime.utcnow())

    for c in contests:
        start_time = make_aware(datetime.fromtimestamp(c["startTimeSeconds"]))

        ExternalContest.objects(
            platform="codeforces",
            external_id=c["id"]
        ).update_one(
            set__title=c["name"],
            set__url=f"https://codeforces.com/contest/{c['id']}",
            set__start_time=start_time,
            set__duration_seconds=c["durationSeconds"],
            set__status=c["phase"],   # BEFORE / CODING / FINISHED
            set__last_synced=now,
            upsert=True
        )
