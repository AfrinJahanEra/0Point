# contest/models.py
import datetime
from mongoengine import Document, EmbeddedDocument, DictField
from mongoengine import (
    StringField, DateTimeField, FloatField, IntField,
    BooleanField, EmbeddedDocumentField, EmbeddedDocumentListField,
    ReferenceField, ListField
)
from account.models import Account

class TestCase(EmbeddedDocument):
    input = StringField(required=True)
    output = StringField(required=True)
    explanation = StringField(default="")
    difficulty = StringField()
    sample = BooleanField(default=False)
    hidden = BooleanField(default=False)  # NEW: Add hidden field

class ContestProblem(EmbeddedDocument):
    index = StringField(required=True)
    title = StringField(required=True)
    statement = StringField(required=True)
    time_limit_seconds = FloatField(default=1.0)
    memory_limit_mb = IntField(default=256)
    tags = ListField(StringField(), default=list)
    difficulty = StringField()
    tutorial = StringField()
    points = IntField(default=0)  # NEW: Add points field
    test_cases = EmbeddedDocumentListField(TestCase, default=list)

class Contest(Document):
    meta = {'collection': 'contest'}

    title = StringField(required=True)
    description = StringField()
    start_time = DateTimeField()
    duration = FloatField()
    type = StringField()
    platform = StringField()
    testers = ListField(StringField(), default=list)
    test_start_time = DateTimeField()
    
    problems = EmbeddedDocumentListField(ContestProblem, default=list)
    created_by = ReferenceField(Account, null=True)
    
    # Add these fields for editorial/tutorial management
    editorial_published = BooleanField(default=False)
    tutorial_settings = DictField(default={})

    # NEW: Status field with appropriate choices
    status = StringField(choices=["draft", "upcoming", "live", "past", "test"], default="draft")
    
    # NEW: Contest visibility and settings
    visibility = StringField(choices=["public", "invite"], default="public")
    registration_required = BooleanField(default=True)
    email_notifications = BooleanField(default=True)
    leaderboard_public = BooleanField(default=True)
    allow_practice = BooleanField(default=True)
    rating_changes = BooleanField(default=True)

class ContestRegistration(Document):
    meta = {'collection': 'contest_registration'}
    contest = ReferenceField(Contest)
    user = ReferenceField(Account)