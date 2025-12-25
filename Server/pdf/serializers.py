# pdf/serializers.py
from rest_framework import serializers
from .models import PDFSession

class PDFSessionSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = PDFSession
        fields = ['id', 'session_id', 'uploader_email', 'uploaded_at', 'url']

    def get_url(self, obj):
        if obj.file:
            return obj.file.url
        return None