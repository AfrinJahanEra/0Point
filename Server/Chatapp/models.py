
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

class ChatMessage(Document):
    meta = {
        'collection': 'chat_messages',
        'indexes': ['chat', 'created_at']
    }

    chat = ReferenceField(ChatSession, required=True)
    role = StringField(required=True, choices=("user", "ai"))
    content = StringField(required=True)

    created_at = DateTimeField(default=datetime.utcnow)
    url = StringField()

    def to_dict(self):
        return {
            "id": str(self.id),
            "chat_id": str(self.chat.id),
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat(),
        }

