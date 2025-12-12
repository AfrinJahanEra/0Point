# announcement/models.py
from mongoengine import Document, StringField, ReferenceField, DateTimeField, BooleanField
from datetime import datetime
from contest.models import Contest
from account.models import Account

class Announcement(Document):
    contest = ReferenceField(Contest, required=True)
    author = ReferenceField(Account, required=True)
    text = StringField(required=True)
    problem_index = StringField()
    is_important = BooleanField(default=False)
    is_pinned = BooleanField(default=False)
    type = StringField(default="info")  # info, warning, important, update
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField()  # ADD THIS FIELD - it can be optional
    
    meta = {
        'collection': 'announcements',
        'indexes': [
            'contest',
            'author',
            'created_at',
            'updated_at'  # ADD THIS
        ]
    }
    
    def save(self, *args, **kwargs):
        # Set updated_at on every save (except first creation)
        if not self.created_at:
            self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        return super(Announcement, self).save(*args, **kwargs)
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "contest_id": str(self.contest.id),
            "text": self.text,
            "problem_index": self.problem_index,
            "author": self.author.name if self.author else self.author.email if self.author else "Unknown",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if hasattr(self, 'updated_at') and self.updated_at else None,  # ADD THIS
            "is_important": self.is_important,
            "is_pinned": self.is_pinned,
            "type": self.type
        }
    contest = ReferenceField(Contest, required=True)
    author = ReferenceField(Account, required=True)
    text = StringField(required=True)
    problem_index = StringField()
    is_important = BooleanField(default=False)
    is_pinned = BooleanField(default=False)
    type = StringField(default="info")  # info, warning, important, update
    created_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'announcements',
        'indexes': [
            'contest',
            'author',
            'created_at'
        ]
    }
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "contest_id": str(self.contest.id),
            "text": self.text,
            "problem_index": self.problem_index,
            "author": self.author.name if self.author else self.author.email if self.author else "Unknown",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_important": self.is_important,
            "is_pinned": self.is_pinned,
            "type": self.type
        }