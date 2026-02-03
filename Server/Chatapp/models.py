
from mongoengine import (
    Document,
    StringField,
    DateTimeField,
    ReferenceField
)
from datetime import datetime
from account.models import Account

class ChatSession(Document):
    meta = {'collection': 'chat_sessions'}

    user = ReferenceField(Account, required=True)
    title = StringField(max_length=255, default="New Chat")

    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super(ChatSession, self).save(*args, **kwargs)

    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
