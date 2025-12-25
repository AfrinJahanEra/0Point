# pdf/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
from django.core.validators import ValidationError
from .models import PDFSession
from .serializers import PDFSessionSerializer
import os
from django.http import HttpResponse, Http404
from django.conf import settings
import mimetypes

class PDFSessionView(APIView):
    def post(self, request, session_id=None):
        """
        POST /api/pdf/upload/session/<uuid>/
        Upload a PDF for a video session.
        """
        if not session_id:
            return Response({'error': 'session_id is required'}, status=400)

        file = request.FILES.get('file')
        email = request.data.get('email')

        if not file:
            return Response({'error': 'PDF file is required'}, status=400)
        if not email:
            return Response({'error': 'email is required'}, status=400)
        if not file.name.lower().endswith('.pdf'):
            return Response({'error': 'Only PDF files are allowed'}, status=400)

        try:
            # Save to DB
            pdf_session = PDFSession.objects.create(
                session_id=session_id,
                uploader_email=email,
                file=file
            )

            # ✅ Broadcast via WebSocket (optional but recommended)
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'pdf_{session_id}',
                {
                    'type': 'pdf_update',
                    'pdf_url': pdf_session.file.url,
                    'uploader_email': email,
                    'pdf_id': str(pdf_session.id),
                }
            )
            print(f"✅ Broadcasting PDF to group pdf_{session_id}")
            print(f"📣 Broadcasting to PDF group: {session_id}")  # 🔴 ADD DEBUG LOG

            return Response({
                'id': str(pdf_session.id),
                'url': pdf_session.file.url,
                'uploaded_at': pdf_session.uploaded_at,
                'uploader_email': email
            }, status=201)

        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def get(self, request, session_id=None):
        """
        GET /api/pdf/upload/session/<uuid>/
        Get the latest PDF for a session.
        """
        try:
            pdf = PDFSession.objects.filter(session_id=session_id).order_by('-uploaded_at').first()
            if not pdf:
                return Response({'pdf': None})
            return Response({
                'pdf': PDFSessionSerializer(pdf).data
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

