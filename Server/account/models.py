from mongoengine import Document, StringField, EmailField, BooleanField, DateTimeField, IntField
from django.contrib.auth.hashers import make_password, check_password
from datetime import datetime


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
    ip_address = StringField(null=True)

    meta = {
        "collection": "accounts"
    }

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)
