from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from videoconference.models import VideoSession
import uuid
import os

@method_decorator(csrf_exempt, name='dispatch')
class CreateSession(APIView):
    def post(self, request):
        interviewer_email = request.data.get('interviewer_email')
        candidate_email = request.data.get('candidate_email')
        if not interviewer_email or not candidate_email:
            return Response({'error': 'Emails are required'}, status=400)

        session = VideoSession.objects.create(
            interviewer_email=interviewer_email,
            candidate_email=candidate_email
        )

        frontend_base_url = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173')
        base_url = f'{frontend_base_url}/interview-room/' + str(session.id)
        interviewer_link = base_url + '?role=interviewer'
        candidate_link = base_url + '?role=client'

        # Try to send emails, but don't crash if email fails
        email_sent = False
        try:
            if settings.EMAIL_HOST_USER and settings.DEFAULT_FROM_EMAIL:
                send_mail(
                    'Interview Invitation - Interviewer',
                    f'Join the interview here: {interviewer_link}',
                    settings.DEFAULT_FROM_EMAIL,
                    [interviewer_email]
                )
                send_mail(
                    'Interview Invitation - Candidate',
                    f'Join the interview here: {candidate_link}',
                    settings.DEFAULT_FROM_EMAIL,
                    [candidate_email]
                )
                email_sent = True
        except Exception as e:
            print(f"Email sending failed: {e}")

        return Response({
            'session_id': str(session.id),
            'interviewer_link': interviewer_link,
            'candidate_link': candidate_link,
            'email_sent': email_sent
        }, status=201)