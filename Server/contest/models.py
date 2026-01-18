# contest/models.py
from datetime import datetime
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

    require_screen_recording = BooleanField(default=True)  # Whether contest requires recording
    recording_max_duration = IntField(default=180)  # Max recording duration in minutes

    recordings_started = ListField(StringField(), default=list)
    
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

# contest/models.py - Add this after ContestRegistration class

class TestContest(Document):
    """Test contest copy that references the original draft contest"""
    meta = {'collection': 'test_contest'}
    
    # Reference to original draft contest
    original_contest = ReferenceField(Contest, required=True)
    
    # Test contest specific fields (copy of contest fields)
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
    
    # Test contest settings
    visibility = StringField(choices=["test"], default="test")  # Always "test" for test contests
    status = StringField(choices=["upcoming", "live", "past"], default="upcoming")
    
    # Timestamps
    created_at = DateTimeField()
    test_start_time = DateTimeField(required=True)  # Separate from original contest start time
    
    # Contest settings copy
    registration_required = BooleanField(default=True)
    email_notifications = BooleanField(default=True)
    leaderboard_public = BooleanField(default=True)
    allow_practice = BooleanField(default=True)
    rating_changes = BooleanField(default=True)
    editorial_published = BooleanField(default=False)


# contest/models.py - Add this new model
class ContestScreenRecording(Document):
    """Model to store screen recordings for contests"""
    meta = {'collection': 'contest_screen_recordings'}
    
    contest = ReferenceField(Contest, required=True)
    user = ReferenceField(Account, required=True)
    recording_file = StringField()  # Path to the recording file
    start_time = DateTimeField(required=True)
    end_time = DateTimeField()
    duration = FloatField()  # Duration in seconds
    recording_status = StringField(choices=["recording", "stopped", "error", "completed"], default="recording")
    file_size = IntField()  # File size in bytes
    
    # Metadata
    video_format = StringField(default="webm")
    video_resolution = StringField()
    fps = IntField(default=30)
    
    # Security
    checksum = StringField()  # For file integrity
    encrypted = BooleanField(default=False)
    
    # Timestamps
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
    
    def save(self, *args, **kwargs):
        self.updated_at = datetime.now()
        return super().save(*args, **kwargs)
    
    