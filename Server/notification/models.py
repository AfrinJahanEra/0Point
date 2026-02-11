from mongoengine import Document, StringField, DateTimeField, ReferenceField, BooleanField
from datetime import datetime
from account.models import Account

class Notification(Document):
    meta = {'collection': 'notifications'}
    
    user = ReferenceField(Account, required=True)
    title = StringField(required=True, max_length=200)
    message = StringField(required=True, max_length=500)
    type = StringField(required=True, choices=['blog_deleted', 'report_approved', 'report_rejected', 'general'])
    
    is_read = BooleanField(default=False)
    related_blog_id = StringField(null=True)
    related_report_id = StringField(null=True)
    
    created_at = DateTimeField(default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user.id),
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "is_read": self.is_read,
            "related_blog_id": self.related_blog_id,
            "related_report_id": self.related_report_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
