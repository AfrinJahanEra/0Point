from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from .models import (
    InterviewSession, CodeDocument, QuestionDocument,
    UserPresence, InterviewTimer
)
from datetime import datetime, timedelta
import json

class CreateSessionAPI(APIView):
    def post(self, request):
        data = request.data
        session_id = data.get('session_id')
        
        if not session_id:
            import uuid
            session_id = str(uuid.uuid4())[:8]
        
        # Create session
        session = InterviewSession(
            session_id=session_id,
            title=data.get('title', f'Interview Session {session_id}'),
            is_active=True
        )
        session.save()
        
        # Initialize timer
        timer = InterviewTimer(
            session_id=session_id,
            total_duration=data.get('duration', 3600),
            remaining_time=data.get('duration', 3600),
            is_running=True
        )
        timer.save()
        
        return Response({
            'status': 'success',
            'session_id': session_id,
            'title': session.title,
            'created_at': session.created_at.isoformat(),
            'join_url': f'ws://localhost:8000/ws/interview/{session_id}/'
        })

class GetSessionAPI(APIView):
    def get(self, request, session_id):
        try:
            session = InterviewSession.objects.get(session_id=session_id)
            code_doc = CodeDocument.objects(session_id=session_id).first()
            question_doc = QuestionDocument.objects(session_id=session_id).first()
            timer = InterviewTimer.objects(session_id=session_id).first()
            
            # Get online users
            online_users = UserPresence.objects(
                session_id=session_id,
                is_online=True,
                last_seen__gte=datetime.utcnow() - timedelta(minutes=5)
            )
            
            response_data = {
                'session_id': session.session_id,
                'title': session.title,
                'created_at': session.created_at.isoformat(),
                'updated_at': session.updated_at.isoformat(),
                'is_active': session.is_active,
                'code': {
                    'content': code_doc.content if code_doc else '',
                    'language': code_doc.language if code_doc else 'javascript',
                    'version': code_doc.version if code_doc else 0
                } if code_doc else None,
                'question': {
                    'content': question_doc.content if question_doc else '',
                    'file_name': question_doc.file_name if question_doc else None,
                    'file_type': question_doc.file_type if question_doc else None,
                    'file_data': question_doc.file_data if question_doc else None
                } if question_doc else None,
                'timer': {
                    'remaining_time': timer.remaining_time if timer else 3600,
                    'is_running': timer.is_running if timer else True
                } if timer else None,
                'online_users': [
                    {
                        'user_id': user.user_id,
                        'username': user.username,
                        'role': user.role,
                        'last_seen': user.last_seen.isoformat()
                    }
                    for user in online_users
                ]
            }
            
            return Response(response_data)
            
        except InterviewSession.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Session not found'
            }, status=status.HTTP_404_NOT_FOUND)

class UpdateCodeAPI(APIView):
    def post(self, request, session_id):
        try:
            data = request.data
            content = data.get('content', '')
            language = data.get('language')
            
            code_doc = CodeDocument.objects(session_id=session_id).first()
            if code_doc:
                code_doc.content = content
                if language:
                    code_doc.language = language
                code_doc.version += 1
                code_doc.updated_at = datetime.utcnow()
                code_doc.save()
            else:
                code_doc = CodeDocument(
                    session_id=session_id,
                    content=content,
                    language=language or 'javascript'
                ).save()
            
            return Response({
                'status': 'success',
                'version': code_doc.version,
                'updated_at': code_doc.updated_at.isoformat()
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class UpdateQuestionAPI(APIView):
    def post(self, request, session_id):
        try:
            data = request.data
            content = data.get('content', '')
            file_data = data.get('file_data')
            
            question_doc = QuestionDocument.objects(session_id=session_id).first()
            if question_doc:
                question_doc.content = content
                if file_data:
                    question_doc.file_name = file_data.get('file_name')
                    question_doc.file_type = file_data.get('file_type')
                    question_doc.file_size = file_data.get('file_size')
                    question_doc.file_data = file_data.get('file_blob')  # Store base64 data
                question_doc.updated_at = datetime.utcnow()
                question_doc.save()
            else:
                question_doc = QuestionDocument(
                    session_id=session_id,
                    content=content,
                    file_name=file_data.get('file_name') if file_data else None,
                    file_type=file_data.get('file_type') if file_data else None,
                    file_size=file_data.get('file_size') if file_data else None,
                    file_data=file_data.get('file_blob') if file_data else None
                ).save()
            
            return Response({
                'status': 'success',
                'updated_at': question_doc.updated_at.isoformat()
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class UpdateTimerAPI(APIView):
    def post(self, request, session_id):
        try:
            data = request.data
            remaining_time = data.get('remaining_time')
            is_running = data.get('is_running')
            
            timer = InterviewTimer.objects(session_id=session_id).first()
            if timer:
                if remaining_time is not None:
                    timer.remaining_time = remaining_time
                if is_running is not None:
                    timer.is_running = is_running
                timer.last_updated = datetime.utcnow()
                timer.save()
            else:
                timer = InterviewTimer(
                    session_id=session_id,
                    remaining_time=remaining_time or 3600,
                    is_running=is_running or True
                ).save()
            
            return Response({
                'status': 'success',
                'remaining_time': timer.remaining_time,
                'is_running': timer.is_running
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class GetActiveSessionsAPI(APIView):
    def get(self, request):
        # Get active sessions (last updated within 24 hours)
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        sessions = InterviewSession.objects(
            updated_at__gte=cutoff_time,
            is_active=True
        ).order_by('-updated_at')
        
        response_data = []
        for session in sessions:
            # Count online users
            online_count = UserPresence.objects(
                session_id=session.session_id,
                is_online=True,
                last_seen__gte=datetime.utcnow() - timedelta(minutes=5)
            ).count()
            
            response_data.append({
                'session_id': session.session_id,
                'title': session.title,
                'created_at': session.created_at.isoformat(),
                'updated_at': session.updated_at.isoformat(),
                'online_users': online_count
            })
        
        return Response(response_data)

class HealthCheckAPI(APIView):
    def get(self, request):
        try:
            # Test MongoDB connection
            session_count = InterviewSession.objects.count()
            
            # Test Redis connection (via Channels)
            from django.core.cache import cache
            cache.set('health_check', 'ok', 10)
            cache_result = cache.get('health_check')
            
            return Response({
                'status': 'healthy',
                'mongo_connection': 'ok',
                'redis_connection': 'ok' if cache_result == 'ok' else 'error',
                'session_count': session_count,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            return Response({
                'status': 'unhealthy',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)