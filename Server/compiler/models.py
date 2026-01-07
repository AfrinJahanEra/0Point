# compiler/models.py
from mongoengine import Document, StringField, ReferenceField, DateTimeField, IntField, FloatField, BooleanField
from datetime import datetime
import pytz
from account.models import Account

# Function to return current datetime in Asia/Dhaka
def dhaka_now():
    return datetime.now()


class CodeSubmission(Document):
    user = ReferenceField(Account, required=True)
    language = StringField(max_length=50, required=True)
    version_index = StringField(max_length=10, default="0")
    code = StringField(required=True)
    input_data = StringField(default="")
    output = StringField(default="")
    status = StringField(default="pending")  # pending, success, error, compilation_error, runtime_error, timeout_error, system_error
    verdict = StringField(default="")  # AC, WA, OK, etc.
    
    # JDoodle metrics
    execution_time_ms = IntField(default=0)  # in milliseconds
    execution_time_seconds = FloatField(default=0.0)  # in seconds
    memory_kb = IntField(default=0)  # in kilobytes
    memory_mb = FloatField(default=0.0)  # in megabytes
    status_code = IntField(default=200)
    is_execution_success = BooleanField(default=False)
    
    created_at = DateTimeField(default=dhaka_now)

    meta = {
        "collection": "code_submissions",
        "indexes": [
            {"fields": ["user", "created_at"], "name": "user_time_idx"},
            {"fields": ["language"], "name": "language_idx"},
            {"fields": ["status"], "name": "status_idx"},
            {"fields": ["verdict"], "name": "verdict_idx"},
        ]
    }

    def __str__(self):
        return f"{self.user.email} - {self.language} - {self.status}"

    