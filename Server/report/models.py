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
        from bson import DBRef
        from blog.models import Blog as BlogModel
        from account.models import Account as AccountModel
        
        blog_data = None
        # Check raw data first to avoid triggering dereference
        raw_blog = self._data.get('blog')
        if raw_blog:
            try:
                # Get the raw DBRef id without triggering a full dereference
                raw_id = str(raw_blog.id) if isinstance(raw_blog, DBRef) else str(raw_blog)
                
                # Now try to fetch the actual document
                blog_doc = BlogModel.objects(id=raw_id).first()
                if blog_doc:
                    author_data = None
                    if blog_doc.author:
                        try:
                            author_data = {
                                "id": str(blog_doc.author.id),
                                "name": blog_doc.author.name,
                                "email": blog_doc.author.email
                            }
                        except Exception:
                            author_data = None
                    blog_data = {
                        "id": raw_id,
                        "title": blog_doc.title,
                        "author": author_data
                    }
                else:
                    # Blog was hard-deleted; return a placeholder so the report is still visible
                    blog_data = {
                        "id": raw_id,
                        "title": "[Deleted Blog]",
                        "author": None
                    }
            except Exception as e:
                # Fallback: report exists but blog info unavailable
                print(f"Error getting blog data: {str(e)}")
                blog_data = {"id": "unknown", "title": "[Deleted Blog]", "author": None}
        
        reporter_data = None
        raw_reporter = self._data.get('reporter')
        if raw_reporter:
            try:
                raw_reporter_id = str(raw_reporter.id) if isinstance(raw_reporter, DBRef) else str(raw_reporter)
                reporter_doc = AccountModel.objects(id=raw_reporter_id).first()
                if reporter_doc:
                    reporter_data = {
                        "id": str(reporter_doc.id),
                        "name": reporter_doc.name,
                        "email": reporter_doc.email
                    }
            except Exception as e:
                print(f"Error getting reporter data: {str(e)}")
                reporter_data = None
        
        reviewed_by_data = None
        raw_reviewed_by = self._data.get('reviewed_by')
        if raw_reviewed_by:
            try:
                raw_reviewed_id = str(raw_reviewed_by.id) if isinstance(raw_reviewed_by, DBRef) else str(raw_reviewed_by)
                reviewed_doc = AccountModel.objects(id=raw_reviewed_id).first()
                if reviewed_doc:
                    reviewed_by_data = {
                        "id": str(reviewed_doc.id),
                        "name": reviewed_doc.name
                    }
            except Exception as e:
                print(f"Error getting reviewed_by data: {str(e)}")
                reviewed_by_data = None
        
        return {
            "id": str(self.id),
            "blog": blog_data,
            "reporter": reporter_data,
            "reason": self.reason,
            "status": self.status,
            "reviewed_by": reviewed_by_data,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "admin_note": self.admin_note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
