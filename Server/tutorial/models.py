# tutorial/models.py (create this file if it doesn't exist)
from mongoengine import Document, StringField, DateTimeField, ReferenceField, IntField
from datetime import datetime
from contest.models import Contest, ContestProblem
from account.models import Account

class Tutorial(Document):
    meta = {'collection': 'tutorials'}
    
    contest = ReferenceField(Contest, required=True)
    problem_index = StringField(required=True)  # A, B, C, etc.
    content = StringField(required=True)
    created_by = ReferenceField(Account, required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    version = IntField(default=1)
    
    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super(Tutorial, self).save(*args, **kwargs)