# interview/models.py
from mongoengine import Document, StringField, DictField, ListField, DateTimeField, BooleanField, IntField, BinaryField
from datetime import datetime
import json

class InterviewSession(Document):
    session_id = StringField(required=True, unique=True)
    title = StringField(default="Interview Session")
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    is_active = BooleanField(default=True)
    
    meta = {
        'collection': 'interview_sessions',
        'indexes': ['session_id', 'created_at']
    }

class CodeDocument(Document):
    session_id = StringField(required=True)
    language = StringField(default="javascript")
    content = StringField(default="// Write your code here...\n")
    version = IntField(default=0)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'code_documents',
        'indexes': ['session_id']
    }

class QuestionDocument(Document):
    session_id = StringField(required=True)
    content = StringField()
    file_name = StringField()
    file_type = StringField()
    file_size = IntField()
    file_data = StringField()  # Base64 encoded file data
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
    line = IntField(default=1)
    column = IntField(default=1)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'user_cursors',
        'indexes': ['session_id', 'user_id'],
        'index_background': True
    }

class UserPresence(Document):
    session_id = StringField(required=True)
    user_id = StringField(required=True)
    username = StringField(required=True)
    role = StringField(choices=('interviewer', 'candidate'), default='candidate')
    is_online = BooleanField(default=True)
    video_enabled = BooleanField(default=True)
    last_seen = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'user_presence',
        'indexes': ['session_id', 'user_id'],
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