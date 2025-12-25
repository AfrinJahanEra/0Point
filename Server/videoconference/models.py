from django.db.models import Model, UUIDField, EmailField, DateTimeField
import uuid

class VideoSession(Model):
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    interviewer_email = EmailField()
    candidate_email = EmailField()
    created_at = DateTimeField(auto_now_add=True)