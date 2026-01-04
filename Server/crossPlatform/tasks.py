from crossPlatform.models import ExternalContest
from crossPlatform.services.codeforces import (
    fetch_codeforces_contests,
    normalize_cf_contest
)

def sync_codeforces_contests():
    contests = fetch_codeforces_contests()

    for cf in contests:
        normalized = normalize_cf_contest(cf)

        ExternalContest.objects(
            platform="codeforces",
            external_id=normalized["external_id"]
        ).update_one(
            set__platform="codeforces",
            set__title=normalized["title"],
            set__start_time=normalized["start_time"],
            set__duration_seconds=normalized["duration_seconds"],
            set__status=normalized["status"],
            set__url=normalized["url"],
            set__phase=normalized["phase"],
            set__type=normalized["type"],
            upsert=True
        )
