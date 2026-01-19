from mongoengine import Document, StringField, DateTimeField, IntField, URLField


class ExternalContest(Document):
    meta = {
        "collection": "external_contests",
        "indexes": [
            ("platform", "external_id"),
            "-start_time"
        ]
    }

    platform = StringField(required=True)          # codeforces
    external_id = StringField(required=True)           # Contest platform-specific ID
    title = StringField(required=True)
    url = URLField(required=True)
    start_time = DateTimeField(required=True)
    duration_seconds = IntField(required=True)
    duration_formatted = StringField(default="")    # ← important!
    participants = IntField(default=0)
    status = StringField(
        choices=["upcoming", "live", "finished"],
        required=True
    )
    last_synced = DateTimeField(required=True)