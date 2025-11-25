from mongoengine import (
    Document, ReferenceField, StringField, BooleanField, IntField, DateTimeField
)
from datetime import datetime
from problem.models import Problem


class Testcase(Document):
    problem = ReferenceField(Problem, required=True)

    # If sample=True → displayed to user
    sample = BooleanField(default=False)

    # Input/output (stored as plain text)
    input_data = StringField(required=True)
    output_data = StringField(required=True)

    # Optional overrides per testcase
    time_limit_override = IntField(null=True)      # ms or seconds (your choice)
    memory_limit_override = IntField(null=True)    # MB

    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "testcases",
        "indexes": [
            ("problem", "sample"),
        ]
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super().save(*args, **kwargs)
