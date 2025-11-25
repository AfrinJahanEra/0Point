# apps/contest/models.py
from mongoengine import (
    Document, StringField, DateTimeField, IntField, BooleanField,
    ReferenceField, ListField, EmbeddedDocumentField, EmbeddedDocument
)
from datetime import datetime
from account.models import Account  # your existing MongoEngine Account Document


class Contest(Document):
    """
    Stores contest metadata only.
    Problems, registrations and announcements are separate documents/collections.
    """
    title = StringField(required=True, max_length=200)
    description = StringField(required=False, max_length=1000)  # we won't strictly count words here; frontend should limit to ~100 words
    start_time = DateTimeField(required=True)
    duration = IntField(required=True)  # duration in minutes (or store hours as you prefer)
    # type: "individual" or "team"
    type = StringField(choices=("individual", "team"), default="individual")
    platform = StringField(choices=("cf","atcoder","codechef","hackerrank","leetcode","IUT"), default="IUT")

    created_by = ReferenceField(Account, required=True)
    created_at = DateTimeField(default=datetime.utcnow)

    # convenience field kept here for quick queries (kept in contest doc)
    is_live_now = BooleanField(default=False)

    meta = {
        "collection": "contests",
        "indexes": ["start_time", "created_by"]
    }


class ContestProblem(Document):
    """
    Link table between Contest and Problem documents: allows ordering/indexing (A,B,C).
    problem_id is stored as string or ReferenceField to problem document depending on your Problem model.
    """
    contest = ReferenceField(Contest, required=True)
    problem_id = StringField(required=True)  # store string id (ObjectId hex) or a unique problem slug
    index = StringField(required=True, max_length=5)  # "A", "B", "C", or "1", "2"

    meta = {
        "collection": "contest_problems",
        "indexes": [
            ("contest", "index"),
            "problem_id"
        ]
    }


class ContestRegistration(Document):
    """
    Stores registration either for a single user (individual contests) or a team (team contests).
    If team_id is set, user_id should be None and vice versa.
    """
    contest = ReferenceField(Contest, required=True)
    user_id = ReferenceField(Account, required=False, null=True)  # used for individual registration
    team_id = StringField(required=False, null=True)  # if you have a Team document, you can store ReferenceField to it

    registered_at = DateTimeField(default=datetime.utcnow)
    is_active = BooleanField(default=True)

    meta = {
        "collection": "contest_registrations",
        "indexes": [
            ("contest", "user_id"),
            ("contest", "team_id")
        ],
        "unique_with": [("contest", "user_id"), ("contest", "team_id")]
    }
