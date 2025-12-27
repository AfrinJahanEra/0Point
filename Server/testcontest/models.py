# testcontest/models.py
import datetime
from mongoengine import Document, EmbeddedDocument, DictField
from mongoengine import (
    StringField, DateTimeField, FloatField, IntField,
    BooleanField, EmbeddedDocumentField, EmbeddedDocumentListField,
    ReferenceField, ListField
)
from account.models import Account
from contest.models import Contest, TestCase, ContestProblem

class TestContest(Document):

    meta = {'collection': 'test_contest'}
    
    # Reference to original draft contest
    original_contest = ReferenceField(Contest, required=True)
    
    # Test contest fields (copy of contest fields)
    title = StringField(required=True)
    description = StringField()
    start_time = DateTimeField(required=True)
    duration = FloatField(required=True)
    type = StringField()
    platform = StringField()
    
    # Testers who can access this test contest
    testers = ListField(StringField(), default=list)  # List of emails
    
    # Problems (embedded copy)
    problems = EmbeddedDocumentListField(ContestProblem, default=list)
    
    # Creator reference
    created_by = ReferenceField(Account, null=True)
    
    # Test contest specific fields
    visibility = StringField(choices=["test"], default="test")
    status = StringField(choices=["draft", "upcoming", "live", "past"], default="upcoming")
    
    # Timestamps
    created_at = DateTimeField()
    test_start_time = DateTimeField(required=True)
    
    # Contest settings copy
    registration_required = BooleanField(default=True)
    email_notifications = BooleanField(default=True)
    leaderboard_public = BooleanField(default=True)
    allow_practice = BooleanField(default=True)
    rating_changes = BooleanField(default=True)
    editorial_published = BooleanField(default=False)

class TestContestRegistration(Document):
    """Registration for test contests"""
    meta = {'collection': 'test_contest_registration'}
    contest = ReferenceField(TestContest)
    user = ReferenceField(Account)
    registered_at = DateTimeField()

