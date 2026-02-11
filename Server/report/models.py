from mongoengine import Document, StringField, DateTimeField, ReferenceField, BooleanField
from datetime import datetime
from account.models import Account
from blog.models import Blog

class BlogReport(Document):
    meta = {'collection': 'blog_reports'}
    
    blog = ReferenceField(Blog, required=True)
    reporter = ReferenceField(Account, required=True)
    reason = StringField(required=True, max_length=500)
    
    status = StringField(required=True, choices=['pending', 'approved', 'rejected'], default='pending')
    reviewed_by = ReferenceField(Account, null=True)
    reviewed_at = DateTimeField(null=True)
    admin_note = StringField(max_length=500, null=True)
    
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super(BlogReport, self).save(*args, **kwargs)
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "blog": {
                "id": str(self.blog.id),
                "title": self.blog.title,
                "author": {
                    "id": str(self.blog.author.id),
                    "name": self.blog.author.name,
                    "email": self.blog.author.email
                } if self.blog.author else None
            } if self.blog else None,
            "reporter": {
                "id": str(self.reporter.id),
                "name": self.reporter.name,
                "email": self.reporter.email
            } if self.reporter else None,
            "reason": self.reason,
            "status": self.status,
            "reviewed_by": {
                "id": str(self.reviewed_by.id),
                "name": self.reviewed_by.name
            } if self.reviewed_by else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "admin_note": self.admin_note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
