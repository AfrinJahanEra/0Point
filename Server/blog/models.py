# blog/models.py
from mongoengine import Document, StringField, DateTimeField, ReferenceField, ListField, BooleanField, IntField
from datetime import datetime
from account.models import Account

class Blog(Document):
    meta = {'collection': 'blogs'}

    title = StringField(required=True, max_length=500)
    content = StringField(required=True)
    tags = ListField(StringField(max_length=50))
    author = ReferenceField(Account, required=True)
    co_authors = ListField(ReferenceField(Account))

    is_draft = BooleanField(default=True)
    is_published = BooleanField(default=False)
    published_at = DateTimeField(null=True)

    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        if self.is_published and not self.published_at:
            self.published_at = datetime.utcnow()
        return super(Blog, self).save(*args, **kwargs)

    def to_dict(self):
        # Calculate vote counts
        upvotes = BlogVote.objects(blog=self, vote_type='upvote').count()
        downvotes = BlogVote.objects(blog=self, vote_type='downvote').count()
        
        return {
            "id": str(self.id),
            "title": self.title,
            "content": self.content,
            "tags": self.tags,
            "author": {
                "id": str(self.author.id),
                "name": self.author.name,
                "email": self.author.email,
                "rating": getattr(self.author, 'rating', 0),
                "badge": getattr(self.author, 'badge', 'none'),
                "role": self.author.role,
                "department": getattr(self.author, 'department', ''),
                "year": getattr(self.author, 'year', '')
            } if self.author else None,
            "co_authors": [
                {
                    "id": str(co_author.id),
                    "name": co_author.name,
                    "email": co_author.email,
                    "rating": getattr(co_author, 'rating', 0),
                    "badge": getattr(co_author, 'badge', 'none'),
                    "role": co_author.role,
                    "department": getattr(co_author, 'department', ''),
                    "year": getattr(co_author, 'year', '')
                } for co_author in self.co_authors
            ] if self.co_authors else [],
            "is_draft": self.is_draft,
            "is_published": self.is_published,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "upvotes": upvotes,
            "downvotes": downvotes,
            "score": upvotes - downvotes,
        }

class BlogVote(Document):
    meta = {'collection': 'blog_votes'}
    
    blog = ReferenceField(Blog, required=True)
    user = ReferenceField(Account, required=True)
    vote_type = StringField(required=True, choices=['upvote', 'downvote'])
    
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'indexes': [
            {'fields': ['blog', 'user'], 'unique': True}  # One vote per user per blog
        ]
    }
    
    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super(BlogVote, self).save(*args, **kwargs)

class BlogCommentVote(Document):
    meta = {'collection': 'blog_comment_votes'}
    
    comment = ReferenceField('BlogComment', required=True)
    user = ReferenceField(Account, required=True)
    vote_type = StringField(required=True, choices=['upvote', 'downvote'])
    
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'indexes': [
            {'fields': ['comment', 'user'], 'unique': True}  # One vote per user per comment
        ]
    }
    
    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super(BlogCommentVote, self).save(*args, **kwargs)

class BlogComment(Document):
    meta = {'collection': 'blog_comments'}
    
    blog = ReferenceField(Blog, required=True)
    author = ReferenceField(Account, required=True)
    content = StringField(required=True, max_length=1000)
    parent_comment = ReferenceField('self', null=True)  # For nested replies
    replies = ListField(ReferenceField('self'))  # List of reply comments
    
    is_deleted = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super(BlogComment, self).save(*args, **kwargs)
    
    def to_dict(self):
        # Calculate vote counts for this comment
        upvotes = BlogCommentVote.objects(comment=self, vote_type='upvote').count()
        downvotes = BlogCommentVote.objects(comment=self, vote_type='downvote').count()
        
        return {
            "id": str(self.id),
            "blog_id": str(self.blog.id),
            "author": {
                "id": str(self.author.id),
                "name": self.author.name,
                "email": self.author.email,
                "rating": getattr(self.author, 'rating', 0),
                "badge": getattr(self.author, 'badge', 'none'),
                "role": self.author.role,
                "department": getattr(self.author, 'department', ''),
                "year": getattr(self.author, 'year', '')
            } if self.author else None,
            "content": self.content,
            "parent_comment_id": str(self.parent_comment.id) if self.parent_comment else None,
            "replies": [reply.to_dict() for reply in self.replies] if self.replies else [],
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "upvotes": upvotes,
            "downvotes": downvotes,
            "score": upvotes - downvotes,
        }


