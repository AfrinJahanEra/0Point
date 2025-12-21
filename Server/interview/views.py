from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.core.mail import send_mail
from django.conf import settings
from .models import (
    InterviewSession, CodeDocument, QuestionDocument,
    UserPresence, InterviewTimer, SessionInvitation
)
from datetime import datetime, timedelta
import json
import uuid
import requests
import os
import secrets

class CreateSessionAPI(APIView):
    def post(self, request):
        data = request.data
        session_id = data.get('session_id')
        
        if not session_id:
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
        
        # Initialize code document
        code_doc = CodeDocument(
            session_id=session_id,
            content='// Write your code here...\nfunction solution() {\n  \n}\n',
            language='javascript'
        )
        code_doc.save()
        
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
            code_doc = CodeDocument.objects.filter(session_id=session_id).first()
            question_doc = QuestionDocument.objects.filter(session_id=session_id).first()
            timer = InterviewTimer.objects.filter(session_id=session_id).first()
            
            # Get online users
            online_users = UserPresence.objects.filter(
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
                },
                'question': {
                    'content': question_doc.content if question_doc else '',
                    'file_name': question_doc.file_name if question_doc else None,
                    'file_type': question_doc.file_type if question_doc else None,
                    'file_data': question_doc.file_data if question_doc else None
                },
                'timer': {
                    'remaining_time': timer.remaining_time if timer else 3600,
                    'is_running': timer.is_running if timer else True
                },
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
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdateCodeAPI(APIView):
    def post(self, request, session_id):
        try:
            data = request.data
            content = data.get('content', '')
            language = data.get('language')
            
            code_doc = CodeDocument.objects.filter(session_id=session_id).first()
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
                )
                code_doc.save()
            
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
            
            question_doc = QuestionDocument.objects.filter(session_id=session_id).first()
            if question_doc:
                question_doc.content = content
                if file_data:
                    question_doc.file_name = file_data.get('file_name')
                    question_doc.file_type = file_data.get('file_type')
                    question_doc.file_size = file_data.get('file_size')
                    question_doc.file_data = file_data.get('file_blob')
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
                )
                question_doc.save()
            
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
            
            timer = InterviewTimer.objects.filter(session_id=session_id).first()
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
                )
                timer.save()
            
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
        
        sessions = InterviewSession.objects.filter(
            updated_at__gte=cutoff_time,
            is_active=True
        ).order_by('-updated_at')
        
        response_data = []
        for session in sessions:
            # Count online users
            online_count = UserPresence.objects.filter(
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

class ExecuteCodeAPI(APIView):
    """
    Execute code via JDoodle API
    Frontend -> Backend -> JDoodle -> Backend -> Frontend
    """
    
    def post(self, request):
        try:
            data = request.data
            code = data.get('code', '')
            language = data.get('language', 'python')
            input_data = data.get('input_data', '')
            
            if not code:
                return Response({
                    'error': 'No code provided'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get JDoodle credentials from environment variables
            JD_CLIENT_ID = os.getenv('JD_CLIENT_ID', 'c4e6cb0ce2a45e1c4629d9d5bf2bd89b')
            JD_CLIENT_SECRET = os.getenv('JD_CLIENT_SECRET', '7634e9d0966fbbbde8c40a33c383ff24bbb0132c434fb36d73a1014f875ece0d')
            JD_URL = "https://api.jdoodle.com/v1/execute"
            
            # Language mapping for JDoodle
            LANGUAGE_MAP = {
                'python': 'python3',
                'javascript': 'nodejs',
                'java': 'java',
                'cpp': 'cpp14',
                'c': 'c'
            }
            
            VERSION_MAP = {
                'python3': '3',
                'javascript': '4',
                'java': '4',
                'cpp': '5',
                'c': '5'
            }
            
            # Prepare payload for JDoodle
            # Map language to JDoodle identifier
            jdoodle_language = LANGUAGE_MAP.get(language, 'python3')
            payload = {
                'clientId': JD_CLIENT_ID,
                'clientSecret': JD_CLIENT_SECRET,
                'script': code,
                'stdin': input_data,
                'language': jdoodle_language,
                'versionIndex': VERSION_MAP.get(jdoodle_language, '3')
            }
            
            # Call JDoodle API
            response = requests.post(JD_URL, json=payload, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                
                # Format response similar to JDoodle
                return Response({
                    'status': 'success',
                    'output': result.get('output', ''),
                    'error': result.get('error'),
                    'statusCode': result.get('statusCode', 200),
                    'memory': result.get('memory', ''),
                    'cpuTime': result.get('cpuTime', ''),
                    'isExecutionSuccess': result.get('isExecutionSuccess', True),
                    'isCompiled': result.get('isCompiled', True),
                    'language': language
                })
                
            elif response.status_code == 429:
                # Rate limit exceeded
                return Response({
                    'status': 'error',
                    'message': 'Rate limit exceeded. Please try again later.',
                    'output': 'API Error: 429 - Too many requests'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                
            else:
                return Response({
                    'status': 'error',
                    'message': f'JDoodle API error: {response.status_code}',
                    'output': f'API Error: {response.status_code}'
                }, status=response.status_code)
                
        except requests.exceptions.Timeout:
            return Response({
                'status': 'error',
                'message': 'JDoodle API timeout',
                'output': 'Error: Request timeout (15s)'
            }, status=status.HTTP_504_GATEWAY_TIMEOUT)
            
        except requests.exceptions.RequestException as e:
            return Response({
                'status': 'error',
                'message': f'Network error: {str(e)}',
                'output': f'Network Error: {str(e)}'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Server error: {str(e)}',
                'output': f'Server Error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreateSessionWithEmailAPI(APIView):
    def post(self, request):
        try:
            data = request.data
            session_id = data.get('session_id')
            
            if not session_id:
                session_id = str(uuid.uuid4())[:8]
            
            # Create session
            session = InterviewSession(
                session_id=session_id,
                title=data.get('title', f'Interview Session {session_id}'),
                interviewer_email=data.get('interviewer_email'),
                candidate_email=data.get('candidate_email'),
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
            
            # Initialize code document
            code_doc = CodeDocument(
                session_id=session_id,
                content='// Write your code here...\nfunction solution() {\n  \n}\n',
                language='javascript'
            )
            code_doc.save()
            
            # Create invitations
            # Check if interviewer invitation already exists
            interviewer_existing = SessionInvitation.objects.filter(
                session_id=session_id,
                email=data.get('interviewer_email'),
                role='interviewer'
            ).first()
            
            if interviewer_existing:
                interviewer_token = interviewer_existing.token
            else:
                interviewer_token = secrets.token_urlsafe(32)
                interviewer_invitation = SessionInvitation(
                    session_id=session_id,
                    email=data.get('interviewer_email'),
                    role='interviewer',
                    token=interviewer_token
                )
                interviewer_invitation.save()
            
            # Check if candidate invitation already exists
            candidate_existing = SessionInvitation.objects.filter(
                session_id=session_id,
                email=data.get('candidate_email'),
                role='candidate'
            ).first()
            
            if candidate_existing:
                candidate_token = candidate_existing.token
            else:
                candidate_token = secrets.token_urlsafe(32)
                candidate_invitation = SessionInvitation(
                    session_id=session_id,
                    email=data.get('candidate_email'),
                    role='candidate',
                    token=candidate_token
                )
                candidate_invitation.save()
            
            # Send emails
            if data.get('interviewer_email'):
                interviewer_link = f"{request.build_absolute_uri('/')}interview-session?session={session_id}&role=interviewer"
                send_mail(
                    subject=f'Interview Session Invitation - {session.title}',
                    message=f'''You have been invited to an interview session.
\nSession Title: {session.title}
Session ID: {session_id}
Role: Interviewer
\nClick the link below to join:
{interviewer_link}
\nBest regards,
The Interview Team''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[data.get('interviewer_email')],
                    fail_silently=False,
                )
            
            if data.get('candidate_email'):
                candidate_link = f"{request.build_absolute_uri('/')}interview-session?session={session_id}&role=candidate"
                send_mail(
                    subject=f'Interview Session Invitation - {session.title}',
                    message=f'''You have been invited to an interview session.
\nSession Title: {session.title}
Session ID: {session_id}
Role: Candidate
\nClick the link below to join:
{candidate_link}
\nBest regards,
The Interview Team''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[data.get('candidate_email')],
                    fail_silently=False,
                )
            
            return Response({
                'status': 'success',
                'session_id': session_id,
                'title': session.title,
                'created_at': session.created_at.isoformat(),
                'interviewer_link': f'{request.build_absolute_uri("/")}interview-session?session={session_id}&role=interviewer',
                'candidate_link': f'{request.build_absolute_uri("/")}interview-session?session={session_id}&role=candidate',
                'message': 'Session created successfully and invitations sent.'
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ValidateInvitationAPI(APIView):
    def get(self, request):
        try:
            token = request.GET.get('token')
            
            if not token:
                return Response({
                    'status': 'error',
                    'message': 'Token is required.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find invitation by token
            try:
                invitation = SessionInvitation.objects.get(token=token)
            except SessionInvitation.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'Invalid or expired invitation.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if invitation is already used
            if invitation.is_used:
                return Response({
                    'status': 'error',
                    'message': 'This invitation has already been used.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if invitation is expired
            if invitation.expires_at and invitation.expires_at < datetime.utcnow():
                return Response({
                    'status': 'error',
                    'message': 'This invitation has expired.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get session details
            try:
                session = InterviewSession.objects.get(session_id=invitation.session_id)
            except InterviewSession.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'Session not found.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            return Response({
                'status': 'success',
                'session_id': invitation.session_id,
                'session_title': session.title,
                'role': invitation.role,
                'email': invitation.email
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UseInvitationAPI(APIView):
    def post(self, request):
        try:
            data = request.data
            token = data.get('token')
            
            if not token:
                return Response({
                    'status': 'error',
                    'message': 'Token is required.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find invitation by token
            try:
                invitation = SessionInvitation.objects.get(token=token)
            except SessionInvitation.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'Invalid or expired invitation.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if invitation is already used
            if invitation.is_used:
                return Response({
                    'status': 'error',
                    'message': 'This invitation has already been used.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if invitation is expired
            if invitation.expires_at and invitation.expires_at < datetime.utcnow():
                return Response({
                    'status': 'error',
                    'message': 'This invitation has expired.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Mark invitation as used
            invitation.is_used = True
            invitation.used_at = datetime.utcnow()
            invitation.save()
            
            # Get session details
            try:
                session = InterviewSession.objects.get(session_id=invitation.session_id)
            except InterviewSession.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'Session not found.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            return Response({
                'status': 'success',
                'session_id': invitation.session_id,
                'session_title': session.title,
                'role': invitation.role,
                'join_link': f'/interview-session?session={invitation.session_id}&role={invitation.role}'
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SendSessionInvitationAPI(APIView):
    def post(self, request):
        try:
            data = request.data
            session_id = data.get('session_id')
            email = data.get('email')
            role = data.get('role', 'candidate')
            
            if not session_id or not email:
                return Response({
                    'status': 'error',
                    'message': 'Session ID and email are required.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if session exists, create if it doesn't
            try:
                session = InterviewSession.objects.get(session_id=session_id)
            except InterviewSession.DoesNotExist:
                # Create session if it doesn't exist
                session = InterviewSession(
                    session_id=session_id,
                    title=f'Interview Session {session_id}',
                    is_active=True
                )
                session.save()
                
                # Initialize timer
                timer = InterviewTimer(
                    session_id=session_id,
                    total_duration=3600,
                    remaining_time=3600,
                    is_running=True
                )
                timer.save()
                
                # Initialize code document
                code_doc = CodeDocument(
                    session_id=session_id,
                    content='// Write your code here...\nfunction solution() {\n  \n}\n',
                    language='javascript'
                )
                code_doc.save()
            
            # Check if invitation already exists for this email and role
            existing_invitation = SessionInvitation.objects.filter(
                session_id=session_id,
                email=email,
                role=role
            ).first()
            
            if existing_invitation:
                # Check if invitation is still valid
                if existing_invitation.is_used:
                    return Response({
                        'status': 'error',
                        'message': 'Invitation has already been used.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if existing_invitation.expires_at and existing_invitation.expires_at < datetime.utcnow():
                    return Response({
                        'status': 'error',
                        'message': 'Invitation has expired.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Reuse existing token
                token = existing_invitation.token
            else:
                # Create new invitation
                token = secrets.token_urlsafe(32)
                invitation = SessionInvitation(
                    session_id=session_id,
                    email=email,
                    role=role,
                    token=token
                )
                invitation.save()
            
            # Send email
            frontend_base_url = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173')
            join_link = f"{frontend_base_url}/interview-session?session={session_id}&role={role}"
            role_display = 'Interviewer' if role == 'interviewer' else 'Candidate'
            
            send_mail(
                subject=f'Interview Session Invitation - {session.title}',
                message=f'''You have been invited to an interview session.
\nSession Title: {session.title}
Session ID: {session_id}
Role: {role_display}
\nClick the link below to join:
{join_link}
\nBest regards,
The Interview Team''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            
            return Response({
                'status': 'success',
                'message': f'Invitation sent successfully to {email}'
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)