from mongoengine import (
    Document, StringField, DateTimeField,
    IntField, FloatField, URLField
)

class ExternalContest(Document):
    meta = {
        "collection": "external_contests",
        "indexes": ["platform", "external_id"]
    }

    platform = StringField(required=True)   # "codeforces"
    external_id = IntField(required=True)

    title = StringField(required=True)
    url = URLField(required=True)

    start_time = DateTimeField(required=True)
    duration_seconds = IntField(required=True)

    status = StringField(choices=["UPCOMING", "RUNNING", "FINISHED"])
    participants = IntField(default=0)

    last_synced = DateTimeField()
