from mongoengine import (
    Document, ReferenceField, DateTimeField, BooleanField,
    IntField, DictField, FloatField, StringField
)
from datetime import datetime
from contest.models import Contest
from account.models import Account


class LeaderboardEntry(Document):
    contest = ReferenceField(Contest, required=True)
    user = ReferenceField(Account, required=True)

    total_score = FloatField(default=0)     # total points from problems
    total_penalty = IntField(default=0)     # total penalty in minutes
    rank = IntField(default=0)

    # User's original rating before contest
    original_rating = IntField(default=1500)
    
    # Problem results with points
    problem_results = DictField(default=dict)
    # Example:
    # {
    #   "A": {
    #     "tries": 3, 
    #     "time": 45, 
    #     "verdict": "ACCEPTED",
    #     "points": 100,
    #     "max_points": 100
    #   },
    #   "B": {
    #     "tries": 1, 
    #     "time": 90, 
    #     "verdict": "WRONG_ANSWER",
    #     "points": 0,
    #     "max_points": 150
    #   }
    # }

    is_frozen = BooleanField(default=False)
    last_updated = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "leaderboard_entries",
        "indexes": ["contest", "rank"]
    }

class ContestLeaderboard(Document):
    contest = ReferenceField(Contest, required=True)

    is_frozen = BooleanField(default=False)
    auto_frozen = BooleanField(default=False)
    frozen_at = DateTimeField(null=True)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "contest_leaderboards"
    }

    def freeze(self):
        self.is_frozen = True
        self.frozen_at = datetime.utcnow()
        self.save()

    def unfreeze(self):
        self.is_frozen = False
        self.save()

