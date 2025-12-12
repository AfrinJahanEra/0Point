from mongoengine import Document, StringField, ReferenceField, DateTimeField
from datetime import datetime
import pytz
from account.models import Account

# Function to return current datetime in Asia/Dhaka
def dhaka_now():
    dhaka_tz = pytz.timezone('Asia/Dhaka')
    return datetime.now(dhaka_tz)

class CodeSubmission(Document):
    user = ReferenceField(Account, required=True)
    language = StringField(max_length=50, required=True)
    version_index = StringField(max_length=10, default="0")
    code = StringField(required=True)
    input_data = StringField()
    output = StringField()
    status = StringField(default="pending")  # pending, success, error
    created_at = DateTimeField(default=dhaka_now)  # <-- timezone-aware Dhaka

    meta = {
        "collection": "code_submissions"
    }

    def __str__(self):
        return f"{self.user.email} - {self.language}"