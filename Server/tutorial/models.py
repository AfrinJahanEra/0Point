from mongoengine import (
    Document, ReferenceField, StringField, ListField,
    DateTimeField, BooleanField, DictField
)
from datetime import datetime
from problem.models import Problem
from account.models import Account


class Tutorial(Document):
    problem = ReferenceField(Problem, required=True)
    author = ReferenceField(Account, required=True)

    statement = StringField(required=True)  
    tags = ListField(StringField(max_length=50), default=list)

    # Optional difficulty section
    difficulty_explanation = StringField(null=True)

    # Multiple sample IO's
    sample_ios = ListField(
        DictField(),  # each dict will contain {"input": "...", "output": "..."}
        default=list
    )

    # Images (stored as URLs / paths)
    images = ListField(StringField(), default=list)

    video_url = StringField(null=True)

    is_official = BooleanField(default=True)

    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "tutorials",
        "indexes": ["problem", "-created_at"]
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super().save(*args, **kwargs)
