from mongoengine import Document, StringField, EmailField, BooleanField, DateTimeField, IntField, ListField, EmbeddedDocumentField, EmbeddedDocument
from django.contrib.auth.hashers import make_password, check_password
from datetime import datetime


class IPAddress(EmbeddedDocument):
    address = StringField(required=True)
    last_used = DateTimeField(default=datetime.utcnow)


class DeviceFingerprint(EmbeddedDocument):
    fingerprint = StringField(required=True)
    user_agent = StringField()
    last_used = DateTimeField(default=datetime.utcnow)


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
    
    meta = {
        "collection": "accounts"
    }

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)


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