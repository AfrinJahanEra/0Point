# pdf/models.py
from django.db import models
from django.core.validators import FileExtensionValidator
import uuid

class PDFSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_id = models.UUIDField()  # references VideoSession.id
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploader_email = models.EmailField()
    file = models.FileField(
        upload_to='pdfs/',
        validators=[FileExtensionValidator(allowed_extensions=['pdf'])]
    )

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"PDF for {self.session_id} by {self.uploader_email}"