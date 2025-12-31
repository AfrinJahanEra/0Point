# ide/models.py
from django.db import models
import uuid

class CodeSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    video_session_id = models.UUIDField()  # links to VideoSession.id
    language = models.CharField(max_length=20, default='python')
    code = models.TextField(default='# Start coding here')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Code for {self.video_session_id} ({self.language})"