# discussion/models.py - Updated with nested comments support
import datetime
from mongoengine import Document, EmbeddedDocument
from mongoengine import (
    StringField, DateTimeField, BooleanField,
    ReferenceField, ListField, IntField,
    EmbeddedDocumentField, EmbeddedDocumentListField
)
from account.models import Account
from contest.models import Contest
import uuid

class Comment(EmbeddedDocument):
    """Nested comments within a discussion post"""
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    content = StringField(required=True)
    author = ReferenceField(Account, required=True)
    created_at = DateTimeField(default=datetime.datetime.now)
    updated_at = DateTimeField(default=datetime.datetime.now)
    upvotes = IntField(default=0)
    downvotes = IntField(default=0)
    is_edited = BooleanField(default=False)
    
    # NESTED COMMENTS SUPPORT
    parent_comment_id = StringField(null=True)  # ID of parent comment (null for root comments)
    depth = IntField(default=0)  # Depth level (0 for root, 1 for reply to root, etc.)
    replies_count = IntField(default=0)  # Count of direct replies
    
    meta = {'allow_inheritance': False}
    
    def to_dict(self):
        """Convert comment to dictionary, including nested replies"""
        return {
            "id": str(self.id),
            "content": self.content,
            "author": {
                "id": str(self.author.id),
                "name": self.author.name,
                "email": self.author.email,
                "avatar": "",
                "rating": getattr(self.author, 'rating', 0),
                "badge": getattr(self.author, 'badge', 'none'),
                "role": self.author.role,
                "department": getattr(self.author, 'department', ''),
                "year": getattr(self.author, 'year', '')
            } if self.author else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "upvotes": self.upvotes,
            "downvotes": self.downvotes,
            "is_edited": self.is_edited,
            "parent_comment_id": self.parent_comment_id,
            "depth": self.depth,
            "replies_count": self.replies_count
        }

class DiscussionVote(EmbeddedDocument):
    """Track user votes on discussions"""
    user = ReferenceField(Account, required=True)
    vote_type = StringField(choices=['upvote', 'downvote'], required=True)
    voted_at = DateTimeField(default=datetime.datetime.now)

class Discussion(Document):
    meta = {'collection': 'discussions'}
    
    # Core fields
    contest = ReferenceField(Contest, required=True, reverse_delete_rule=2)
    author = ReferenceField(Account, required=True)
    title = StringField(required=True, max_length=200)
    content = StringField(required=True)
    
    # Problem association
    problem_index = StringField()  # A, B, C, etc. or empty for general
    
    # Metadata
    tags = ListField(StringField(), default=list)
    created_at = DateTimeField(default=datetime.datetime.now)
    updated_at = DateTimeField(default=datetime.datetime.now)
    is_edited = BooleanField(default=False)
    is_pinned = BooleanField(default=False)
    is_locked = BooleanField(default=False)
    
    # Stats
    upvotes = IntField(default=0)
    downvotes = IntField(default=0)
    view_count = IntField(default=0)
    comment_count = IntField(default=0)
    
    # User interactions tracking
    votes = EmbeddedDocumentListField(DiscussionVote, default=list)
    saved_by = ListField(ReferenceField(Account), default=list)
    
    # Comments (flat structure with parent references)
    comments = EmbeddedDocumentListField(Comment, default=list)
    
    def to_dict(self):
        """Convert discussion to dictionary with flat comments"""
        return {
            "id": str(self.id),
            "title": self.title,
            "content": self.content,
            "author": {
                "id": str(self.author.id),
                "name": self.author.name,
                "email": self.author.email,
                "role": self.author.role,
                "rating": getattr(self.author, 'rating', 0),
                "badge": getattr(self.author, 'badge', 'none'),
                "department": getattr(self.author, 'department', ''),
                "year": getattr(self.author, 'year', '')
            } if self.author else None,
            "contest": {
                "id": str(self.contest.id),
                "title": self.contest.title
            } if self.contest else None,
            "problem_index": self.problem_index,
            "tags": self.tags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_edited": self.is_edited,
            "is_pinned": self.is_pinned,
            "is_locked": self.is_locked,
            "upvotes": self.upvotes,
            "downvotes": self.downvotes,
            "view_count": self.view_count,
            "comment_count": self.comment_count,
            "saved": False,
            "vote_status": None,
            "comments": self.get_nested_comments()  # Get nested structure
        }
    
    def get_nested_comments(self):
        """Convert flat comments to nested structure for frontend"""
        # Create a map of comments by ID
        comment_map = {}
        for comment in self.comments:
            comment_dict = comment.to_dict()
            comment_dict['replies'] = []  # Initialize replies list
            comment_map[str(comment.id)] = comment_dict
        
        # Build nested structure
        nested_comments = []
        for comment in self.comments:
            comment_dict = comment_map[str(comment.id)]
            if comment.parent_comment_id:
                # This is a reply, add it to parent's replies
                parent = comment_map.get(comment.parent_comment_id)
                if parent:
                    parent['replies'].append(comment_dict)
            else:
                # This is a root comment
                nested_comments.append(comment_dict)
        
        return nested_comments
    
    def increment_view(self):
        self.view_count += 1
        self.save()

