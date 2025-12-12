# problem/models.py
from mongoengine import (
    Document, StringField, ListField, IntField, FloatField, 
    DateTimeField, BooleanField, DictField
)
from datetime import datetime
import uuid

class Problem(Document):
    problem_id = StringField(required=True, unique=True, default=lambda: str(uuid.uuid4()))
    title = StringField(required=True, max_length=250)
    statement = StringField(required=True)
    time_limit = FloatField(default=2.0)  # seconds
    memory_limit = IntField(default=256)  # MB
    tags = ListField(StringField(max_length=50), default=list)
    tutorial = StringField(default="")
    difficulty = StringField(choices=("Easy", "Medium", "Hard"), default="Medium")
    
    # Metadata
    created_by = StringField()  # user ID
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "problems",
        "indexes": ["problem_id", "title", "tags"]
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super().save(*args, **kwargs)