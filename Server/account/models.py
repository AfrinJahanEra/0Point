from mongoengine import Document, StringField, EmailField, BooleanField, DateTimeField, IntField, EmbeddedDocument, EmbeddedDocumentField, DictField, ListField, FloatField
from django.contrib.auth.hashers import make_password, check_password
from datetime import datetime


class PlatformProfile(EmbeddedDocument):
    """Store coding platform handles and ratings"""
    platform = StringField(required=True, choices=["codeforces", "codechef", "atcoder", "leetcode"])
    handle = StringField(required=True)
    current_rating = IntField(default=0)
    max_rating = IntField(default=0)
    min_rating = IntField(default=0)
    contests_count = IntField(default=0)
    rank = StringField(null=True)
    badge = StringField(null=True)
    last_updated = DateTimeField(default=datetime.utcnow)
    
    # Store historical rating data for graph
    rating_history = ListField(DictField(), default=list)  # [{"date": "2023-01-15", "rating": 1500}, ...]



class PlatformContestCache(EmbeddedDocument):
    platform       = StringField(required=True)
    handle         = StringField(required=True)
    contests       = ListField(DictField(), default=list)
    last_fetched   = DateTimeField()
    etag_or_hash   = StringField()          # optional – for conditional requests
    fetch_status   = StringField()           # "success", "failed", "partial"

class Account(Document):
    name = StringField(required=True, max_length=200)
    email = EmailField(required=True, unique=True)
    password = StringField(required=True)

    role = StringField(choices=["admin", "user"], default="user")

    created_at = DateTimeField(default=datetime.utcnow)
    is_deleted = BooleanField(default=False)
    is_inactive = BooleanField(default=False)

    blog_count = IntField(default=0)
    rating = IntField(default=0)

    badge = StringField(
        choices=["grandmaster", "candidate_master", "specialist", "expert", "none"],
        default="none"
    )

    year = StringField(null=True)
    department = StringField(null=True)
    
    # Coding platform profiles
    platform_profiles = ListField(EmbeddedDocumentField(PlatformProfile), default=list)
    
    # User profile stats
    total_score = IntField(default=0)
    global_rank = IntField(null=True)
    problems_solved = IntField(default=0)
    contests_count = IntField(default=0)

    contest_cache = ListField(EmbeddedDocumentField(PlatformContestCache), default=list)

    meta = {
        "collection": "accounts"
    }

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)
    
    def get_platform_profile(self, platform):
        """Get specific platform profile"""
        for profile in self.platform_profiles:
            if profile.platform == platform:
                return profile
        return None
    
    def add_or_update_platform(self, platform, handle, rating=0, max_rating=0, min_rating=0, contests_count=0, badge='', rating_history=None):
        """Add or update platform profile"""
        if rating_history is None:
            rating_history = []
        
        existing = self.get_platform_profile(platform)
        if existing:
            existing.handle = handle
            existing.current_rating = rating
            existing.max_rating = max_rating
            existing.min_rating = min_rating
            existing.contests_count = contests_count
            existing.badge = badge
            existing.rating_history = rating_history
            existing.last_updated = datetime.utcnow()
        else:
            new_profile = PlatformProfile(
                platform=platform,
                handle=handle,
                current_rating=rating,
                max_rating=max_rating,
                min_rating=min_rating,
                contests_count=contests_count,
                badge=badge,
                rating_history=rating_history
            )
            self.platform_profiles.append(new_profile)
        self.save()

# New model in Server/account/models.py
from mongoengine import Document, StringField, DictField, DateTimeField

class UserTagStats(Document):
    user_id = StringField(required=True, unique=True)
    tags = DictField(default=dict)  # {normalized_tag: int count}
    last_update = DateTimeField()
    last_cf_submission_time = IntField(default=0)
    last_lc_submission_time = IntField(default=0)
    
    meta = {'collection': 'user_tag_stats'}

