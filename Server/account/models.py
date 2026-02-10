from mongoengine import Document, StringField, EmailField, BooleanField, DateTimeField, IntField, ListField, EmbeddedDocumentField, EmbeddedDocument, DictField, FloatField
from django.contrib.auth.hashers import make_password, check_password
from datetime import datetime


class IPAddress(EmbeddedDocument):
    address = StringField(required=True)
    last_used = DateTimeField(default=datetime.utcnow)


class DeviceFingerprint(EmbeddedDocument):
    fingerprint = StringField(required=True)
    user_agent = StringField()
    last_used = DateTimeField(default=datetime.utcnow)


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
    platform = StringField(required=True)
    handle = StringField(required=True)
    contests = ListField(DictField(), default=list)
    last_fetched = DateTimeField()
    etag_or_hash = StringField()  # optional – for conditional requests
    fetch_status = StringField()  # "success", "failed", "partial"


class Account(Document):
    name = StringField(required=True, max_length=200)
    email = EmailField(required=True)
    password = StringField(required=True)
    
    role = StringField(choices=["admin", "user"], default="user")
    
    created_at = DateTimeField(default=datetime.utcnow)
    is_deleted = BooleanField(default=False)
    is_inactive = BooleanField(default=False)
    is_banned = BooleanField(default=False)
    ban_reason = StringField(null=True)
    banned_at = DateTimeField(null=True)
    banned_by = StringField(null=True)
    
    # Track IP addresses used by this user (new field)
    ip_addresses = ListField(EmbeddedDocumentField(IPAddress), default=[])
    
    # Device/browser fingerprints
    device_fingerprints = ListField(EmbeddedDocumentField(DeviceFingerprint), default=[])
    
    # Keep old field for backward compatibility
    ip_address = StringField(null=True)
    
    blog_count = IntField(default=0)
    rating = IntField(default=0)
    
    badge = StringField(
        choices=["grandmaster", "candidate_master", "specialist", "expert", "none"],
        default="none"
    )
    
    year = StringField(null=True)
    department = StringField(null=True)
    
    # Profile photo
    profile_photo = StringField(null=True)  # URL or base64 string
    
    # Coding platform profiles
    platform_profiles = ListField(EmbeddedDocumentField(PlatformProfile), default=list)
    
    # User profile stats
    total_score = IntField(default=0)
    global_rank = IntField(null=True)
    problems_solved = IntField(default=0)
    contests_count = IntField(default=0)
    
    # Contest cache for faster loading
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
    
    def add_or_update_platform(self, platform, handle, rating=0, max_rating=0, min_rating=0, contests_count=0, rank=None, badge=None, rating_history=None):
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
            existing.rank = rank
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
                rank=rank,
                badge=badge,
                rating_history=rating_history
            )
            self.platform_profiles.append(new_profile)
        self.save()
    
    def get_contest_cache(self, platform, handle):
        """Get cached contests for a specific platform and handle"""
        for cache in self.contest_cache:
            if cache.platform == platform and cache.handle == handle:
                return cache
        return None
    
    def update_contest_cache(self, platform, handle, contests, etag_or_hash=None, fetch_status="success"):
        """Update or create contest cache"""
        existing = self.get_contest_cache(platform, handle)
        if existing:
            existing.contests = contests
            existing.last_fetched = datetime.utcnow()
            existing.etag_or_hash = etag_or_hash
            existing.fetch_status = fetch_status
        else:
            new_cache = PlatformContestCache(
                platform=platform,
                handle=handle,
                contests=contests,
                last_fetched=datetime.utcnow(),
                etag_or_hash=etag_or_hash,
                fetch_status=fetch_status
            )
            self.contest_cache.append(new_cache)
        self.save()
    
    def get_all_platform_handles(self):
        """Get all platform handles as a dictionary"""
        return {profile.platform: profile.handle for profile in self.platform_profiles}
    
    def calculate_total_contests(self):
        """Calculate total contests across all platforms"""
        return sum(profile.contests_count for profile in self.platform_profiles)
    
    def get_highest_rating(self):
        """Get highest rating across all platforms"""
        if not self.platform_profiles:
            return 0
        return max(profile.max_rating for profile in self.platform_profiles)
    
    def get_total_submissions(self):
        """Get total submissions count from submissions collection"""
        from submission.models import Submission
        return Submission.objects(user=self).count()


class UserTagStats(Document):
    """Store user tag statistics from various platforms"""
    user_id = StringField(required=True, unique=True)
    tags = DictField(default=dict)  # {normalized_tag: int count}
    last_update = DateTimeField()
    last_cf_submission_time = IntField(default=0)
    last_lc_submission_time = IntField(default=0)
    
    meta = {
        'collection': 'user_tag_stats'
    }


class BannedAccount(Document):
    """Stores permanently deleted/banned users to prevent re-registration"""
    original_user_id = StringField(required=True)  # Original user ID before deletion
    email = EmailField(required=True)
    name = StringField(required=True)
    ip_addresses = ListField(StringField(), default=[])
    device_fingerprints = ListField(StringField(), default=[])
    reason = StringField(required=True)
    banned_by = StringField(required=True)  # Admin ID or email who banned
    banned_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        "collection": "banned_accounts",
        'indexes': [
            'email',
            'original_user_id',
            'ip_addresses',
            'device_fingerprints'
        ]
    }