from mongoengine import (
    Document, ReferenceField, StringField,
    DateTimeField, BooleanField
)
from datetime import datetime
from contest.models import Contest
from account.models import Account
import cloudinary.uploader


class Announcement(Document):
    contest = ReferenceField(Contest, required=True)
    author = ReferenceField(Account, required=True)
    
    text = StringField(required=True)
    problem_index = StringField(null=True)   # "A", "B", "C" or None
    
    is_important = BooleanField(default=False)

    visible_to = StringField(
        default="participants",
        choices=["public", "participants"]
    )

    type = StringField(
        default="info",
        choices=["info", "warning", "alert"]
    )

    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "announcements",
        "indexes": ["contest", "-created_at"]
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super().save(*args, **kwargs)
