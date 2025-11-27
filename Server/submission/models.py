from mongoengine import (
    Document, ReferenceField, StringField, DateTimeField,
    IntField
)
from datetime import datetime
from problem.models import Problem
from account.models import Account


class Submission(Document):
    problem = ReferenceField(Problem, required=True)
    user = ReferenceField(Account, required=True)

    code = StringField(required=True)
    language = StringField(required=True, max_length=40)

    # Judge fields
    verdict = StringField(
        default="PENDING",
        choices=[
            "PENDING", "RUNNING",
            "ACCEPTED", "WRONG_ANSWER",
            "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED",
            "RUNTIME_ERROR", "COMPILATION_ERROR",
            "SYSTEM_ERROR"
        ]
    )
    runtime_ms = IntField(default=0)
    memory_kb = IntField(default=0)

    testcases_passed = IntField(default=0)
    total_testcases = IntField(default=0)

    # For ranking / contest analytics
    submission_number = IntField(default=1)
    origin = StringField(default="contest", choices=["contest", "practice"])

    submitted_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "submissions",
        "indexes": [
            "problem",
            "user",
            "verdict",
            ("user", "problem"),
        ]
    }
