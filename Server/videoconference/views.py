from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from mock_interview.models import InterviewSession, Participant

class SessionInfoView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, session_id):
        try:
            session = InterviewSession.objects.get(id=session_id)
            
            participants = Participant.objects.filter(session=session)
            active_participants = participants.filter(is_active=True)
            
            return Response({
                'session': {
                    'id': str(session.id),
                    'title': session.title,
                    'description': session.description,
                    'scheduled_time': session.scheduled_time,
                    'duration_minutes': session.duration_minutes,
                    'created_at': session.created_at,
                    'is_active': session.is_active
                },
                'participants': {
                    'total': participants.count(),
                    'active': active_participants.count(),
                    'list': [{
                        'email': p.email,
                        'role': p.role,
                        'is_active': p.is_active,
                        'joined_at': p.joined_at
                    } for p in participants]
                }
            })
            
        except InterviewSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class ParticipantStatusView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        session_id = request.data.get('session_id')
        email = request.data.get('email')
        
        if not session_id or not email:
            return Response(
                {'error': 'session_id and email are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            participant = Participant.objects.get(
                session_id=session_id,
                email=email
            )
            
            return Response({
                'email': participant.email,
                'role': participant.role,
                'is_active': participant.is_active,
                'joined_at': participant.joined_at,
                'left_at': participant.left_at,
                'invitation_sent': participant.invitation_sent
            })
            
        except Participant.DoesNotExist:
            return Response(
                {'error': 'Participant not found'},
                status=status.HTTP_404_NOT_FOUND
            )