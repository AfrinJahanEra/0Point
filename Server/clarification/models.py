# clarification/models.py
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

class ClarificationVote(EmbeddedDocument):
    """Track user votes on clarifications"""
    user = ReferenceField(Account, required=True)
    voted_at = DateTimeField(default=datetime.datetime.now)

class ClarificationReply(EmbeddedDocument):
    """Reply from contest organizer to a clarification"""
    id = StringField(primary_key=True, default=lambda: str(uuid.uuid4()))
    content = StringField(required=True)
    author = ReferenceField(Account, required=True)  # Must be contest organizer
    created_at = DateTimeField(default=datetime.datetime.now)
    updated_at = DateTimeField(default=datetime.datetime.now)
    is_edited = BooleanField(default=False)
    
    meta = {'allow_inheritance': False}
    
    def to_dict(self):
        """Convert reply to dictionary"""
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
            "is_edited": self.is_edited
        }

class Clarification(Document):
    """
    Clarification system for contests.
    Questions asked by participants, answered by organizers.
    """
    meta = {'collection': 'clarifications'}
    
    # Core fields
    contest = ReferenceField(Contest, required=True, reverse_delete_rule=2)
    author = ReferenceField(Account, required=True)  # Participant who asked
    
    # Question details
    title = StringField(required=True, max_length=200)
    content = StringField(required=True)
    
    # Problem association (optional - can be general question)
    problem_index = StringField(null=True)  # A, B, C, etc. or null for general
    
    # Status and moderation
    status = StringField(
        choices=['pending', 'approved', 'rejected', 'answered'],
        default='pending'
    )
    is_published = BooleanField(default=False)  # Only published when approved
    
    # Organizer fields
    is_answered = BooleanField(default=False)
    answered_at = DateTimeField(null=True)
    
    # Replies from organizers
    replies = EmbeddedDocumentListField(ClarificationReply, default=list)
    
    # Metadata
    tags = ListField(StringField(), default=list)
    created_at = DateTimeField(default=datetime.datetime.now)
    updated_at = DateTimeField(default=datetime.datetime.now)
    
    # Stats
    view_count = IntField(default=0)
    upvotes = IntField(default=0)  # Participants can upvote useful questions
    participants_watching = ListField(ReferenceField(Account), default=list)

    votes = EmbeddedDocumentListField(ClarificationVote, default=list)

    def has_user_voted(self, user):
        if not user:
            return False
        return any(vote.user.id == user.id for vote in self.votes)
    
    def to_dict(self, user=None):
        """Convert clarification to dictionary"""
        data = {
            "id": str(self.id),
            "contest_id": str(self.contest.id) if self.contest else None,
            "contest_title": self.contest.title if self.contest else None,
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
            "problem": self.problem_index if self.problem_index else 'General',
            "problem_index": self.problem_index,
            "status": self.status,
            "is_published": self.is_published,
            "is_answered": self.is_answered,
            "answered_at": self.answered_at.isoformat() if self.answered_at else None,
            "replies_count": len(self.replies),
            "replies": [reply.to_dict() for reply in self.replies],
            "tags": self.tags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "view_count": self.view_count,
            "upvotes": self.upvotes,
            "is_watching": False
        }
        
        # Add user-specific data
        if user:
            data["is_watching"] = user.id in [str(watcher.id) for watcher in self.participants_watching]
            
            # Check if user can moderate (is organizer/admin)
            data["can_moderate"] = self.is_user_organizer_or_admin(user)
            
            # Check if user can reply (organizer/admin only)
            data["can_reply"] = self.can_user_reply(user)
        
        return data
    
    def is_user_organizer_or_admin(self, user):
        """Check if user is contest organizer or admin"""
        if not user:
            return False
        
        # Check if user is admin
        if hasattr(user, 'role') and user.role in ['admin', 'superadmin']:
            return True
        
        # Check if user is contest creator
        if self.contest and self.contest.created_by and self.contest.created_by.id == user.id:
            return True
        
        # Could add additional organizers list in contest model
        return False
    
    def can_user_reply(self, user):
        """Check if user can reply to this clarification (organizers/admins only)"""
        return self.is_user_organizer_or_admin(user)
    
    def can_user_see(self, user):
        """Check if user can see this clarification"""
        if self.is_published:
            return True  # Published clarifications visible to all
        
        # Unpublished clarifications only visible to:
        # 1. The author who asked
        # 2. Organizers/admins
        if user:
            if self.author and self.author.id == user.id:
                return True
            if self.is_user_organizer_or_admin(user):
                return True
        
        return False
    
    def increment_view(self):
        """Increment view count"""
        self.view_count += 1
        self.save()
    
    def add_watcher(self, user):
        """Add user to watchers list"""
        if user.id not in [str(w.id) for w in self.participants_watching]:
            self.participants_watching.append(user)
            self.save()
            return True
        return False
    
    def remove_watcher(self, user):
        """Remove user from watchers list"""
        current_ids = [str(w.id) for w in self.participants_watching]
        if str(user.id) in current_ids:
            index = current_ids.index(str(user.id))
            self.participants_watching.pop(index)
            self.save()
            return True
        return False
    

    