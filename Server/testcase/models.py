# testcase/models.py
from mongoengine import (
    Document, StringField, BooleanField, DateTimeField, IntField
)
from datetime import datetime

class TestCase(Document):
    problem_id = StringField(required=True)
    input_data = StringField(required=True)
    output_data = StringField(required=True)
    explanation = StringField(default="")
    sample = BooleanField(default=False)
    time_limit_override = IntField(null=True)      # Added back
    memory_limit_override = IntField(null=True)    # Added back
    
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "test_cases",
        "indexes": ["problem_id", "sample"]
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super().save(*args, **kwargs)