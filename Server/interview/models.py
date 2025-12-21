# interview/models.py
from mongoengine import Document, StringField, DictField, ListField, DateTimeField, BooleanField, IntField, BinaryField
from datetime import datetime, timedelta
import json
import base64

class InterviewSession(Document):
    session_id = StringField(required=True, unique=True)
    title = StringField(default="Interview Session")
    created_by = StringField()  # User who created the session
    interviewer_email = StringField()
    candidate_email = StringField()
    interviewers = ListField(StringField(), default=list)  # List of interviewer emails
    candidates = ListField(StringField(), default=list)  # List of candidate emails
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    is_active = BooleanField(default=True)
    
    meta = {
        'collection': 'interview_sessions',
        'indexes': ['session_id', 'created_at', 'created_by']
    }

class CodeDocument(Document):
    session_id = StringField(required=True)
    language = StringField(default="python")
    content = StringField(default="# Write your code here")
    version = IntField(default=0)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'code_documents',
        'indexes': ['session_id']
    }

class QuestionDocument(Document):
    session_id = StringField(required=True)
    content = StringField(default="")
    file_name = StringField()
    file_type = StringField()
    file_size = IntField()
    file_data = StringField()  # Base64 encoded file data
    uploaded_by = StringField()
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'question_documents',
        'indexes': ['session_id']
    }

class UserCursor(Document):
    session_id = StringField(required=True)
    user_id = StringField(required=True)
    username = StringField(required=True)
    email = StringField()
    role = StringField(choices=('interviewer', 'candidate'), default='candidate')
    line = IntField(default=1)
    column = IntField(default=1)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'user_cursors',
        'indexes': ['session_id', 'user_id', 'email'],
        'index_background': True
    }

class UserPresence(Document):
    session_id = StringField(required=True)
    user_id = StringField(required=True)
    username = StringField(required=True)
    email = StringField()
    role = StringField(choices=('interviewer', 'candidate'), default='candidate')
    is_online = BooleanField(default=True)
    video_enabled = BooleanField(default=True)
    joined_at = DateTimeField(default=datetime.utcnow)
    last_seen = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'user_presence',
        'indexes': ['session_id', 'user_id', 'email', 'role'],
        'index_background': True
    }

class InterviewTimer(Document):
    session_id = StringField(required=True, unique=True)
    total_duration = IntField(default=3600)  # in seconds
    remaining_time = IntField(default=3600)
    is_running = BooleanField(default=True)
    last_updated = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'interview_timers',
        'indexes': ['session_id']
    }

class SessionInvitation(Document):
    session_id = StringField(required=True)
    email = StringField(required=True)
    role = StringField(choices=('interviewer', 'candidate'), required=True)
    token = StringField(required=True, unique=True)
    sent_at = DateTimeField(default=datetime.utcnow)
    expires_at = DateTimeField(default=lambda: datetime.utcnow() + timedelta(days=7))
    is_used = BooleanField(default=False)
    used_at = DateTimeField()
    
    meta = {
        'collection': 'session_invitations',
        'indexes': ['session_id', 'email', 'token', 'expires_at']
    }