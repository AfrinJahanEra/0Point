# leaderboard/models.py
from mongoengine import (
    Document, ReferenceField, DateTimeField, BooleanField,
    IntField, DictField, FloatField
)
from datetime import datetime
from contest.models import Contest
from account.models import Account

def dhaka_now():
    return datetime.now()  # naive datetime assumed Asia/Dhaka

class LeaderboardEntry(Document):
    contest = ReferenceField(Contest, required=True, reverse_delete_rule=2)
    user = ReferenceField(Account, required=True, reverse_delete_rule=2)

    total_score = FloatField(default=0)   # total points from problems
    total_penalty = IntField(default=0)   # total penalty in minutes
    rank = IntField(default=0)

    original_rating = IntField(default=1500)

    problem_results = DictField(default=dict)
    is_frozen = BooleanField(default=False)
    last_updated = DateTimeField(default=dhaka_now)

    meta = {
        "collection": "leaderboard_entries",
        "indexes": [
            {"fields": ["contest", "rank"], "name": "contest_rank_idx"},
            {"fields": ["contest", "user"], "name": "contest_user_idx"}
        ]
    }

    def update_entry(self, submission):
        """
        Update leaderboard entry based on a submission
        """
        problem_index = submission.problem_index
        verdict = submission.verdict
        time = int(submission.contest_time)
        points = 0
        max_points = 0

        # Assume problem_results contains max_points for the problem
        if problem_index in self.problem_results:
            max_points = self.problem_results[problem_index].get("max_points", 0)
        else:
            max_points = getattr(submission.contest, "problem_points", {}).get(problem_index, 0)

        if verdict == "AC":
            points = max_points

        # Update problem_results
        entry = self.problem_results.get(problem_index, {"tries": 0, "time": 0, "verdict": "PENDING", "points": 0, "max_points": max_points})
        entry["tries"] += 1
        if verdict == "AC":
            entry["verdict"] = "AC"
            entry["time"] = time
            entry["points"] = points
        else:
            entry["verdict"] = verdict
        entry["max_points"] = max_points

        self.problem_results[problem_index] = entry

        # Recalculate total_score and total_penalty
        self.total_score = sum([v["points"] for v in self.problem_results.values()])
        self.total_penalty = sum([v["time"] for v in self.problem_results.values() if v["verdict"] == "AC"])

        self.last_updated = dhaka_now()
        self.save()


class ContestLeaderboard(Document):
    contest = ReferenceField(Contest, required=True, reverse_delete_rule=2)
    is_frozen = BooleanField(default=False)
    auto_frozen = BooleanField(default=False)
    frozen_at = DateTimeField()
    updated_at = DateTimeField(default=dhaka_now)

    meta = {
        "collection": "contest_leaderboards",
        "indexes": ["contest"]
    }

    def freeze(self):
        self.is_frozen = True
        self.frozen_at = dhaka_now()
        self.save()

    def unfreeze(self):
        self.is_frozen = False
        self.frozen_at = None
        self.save()

