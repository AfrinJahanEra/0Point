from mongoengine import (
    Document, StringField, ReferenceField, ListField, IntField, FloatField, DateTimeField, BooleanField
)
from datetime import datetime
from contest.models import Contest
# If your Problem will reference a separate ContestProblem mapping, you can adjust accordingly.

class Problem(Document):
    """
    Problem document associated with a Contest.
    - contest: Reference to Contest document
    - index: "A", "B", "C"... unique per contest
    - title, statement (store statement as HTML or Markdown)
    - tags: list of simple strings
    - time_limit_seconds: float
    - memory_limit_mb: int
    - images: list of file paths/URLs (max 5)
    - difficulty: Int (e.g., 800..3500) or choice
    """
    contest = ReferenceField(Contest, required=True)
    index = StringField(required=True, max_length=5)  # "A", "B", ...
    title = StringField(required=True, max_length=250)
    statement = StringField(required=True)  # store HTML/Markdown
    tags = ListField(StringField(max_length=50), default=list)
    time_limit_seconds = FloatField(default=2.0)  # seconds per test
    memory_limit_mb = IntField(default=256)
    images = ListField(StringField(), default=list)  # store MEDIA relative path or full URL
    difficulty = IntField(default=800)  # arbitrary scale

    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "problems",
        "indexes": [
            ("contest", "index"),
            ("title",)
        ]
    }

    def clean(self):
        # ensure time_limit > 0 and memory_limit positive
        if self.time_limit_seconds <= 0:
            raise ValueError("time_limit_seconds must be > 0")
        if self.memory_limit_mb <= 0:
            raise ValueError("memory_limit_mb must be > 0")
        if len(self.images) > 5:
            raise ValueError("Max 5 images allowed")

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super().save(*args, **kwargs)
