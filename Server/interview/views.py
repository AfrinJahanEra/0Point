# interview/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.core.mail import send_mail
from django.conf import settings
from .models import (
    InterviewSession, CodeDocument, QuestionDocument,
    UserPresence, InterviewTimer, SessionInvitation,
    ActiveSessionParticipant, CollaborationState
)
from datetime import datetime, timedelta
import json
import uuid
import requests
import os
import secrets

# ==================== SESSION MANAGEMENT ====================

class CreateSessionAPI(APIView):
    """Create a new interview session"""
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
                'join_url': f'ws://{request.get_host()}/ws/interview/{session_id}/'
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetSessionAPI(APIView):
    """Get session details"""
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


class SessionStatusAPI(APIView):
    """Get real-time session status with participant counts"""
    def get(self, request):
        session_id = request.GET.get('session_id')
        
        if not session_id:
            return Response({
                'status': 'error',
                'message': 'session_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            session = InterviewSession.objects.get(session_id=session_id)
            
            # Filter active participants (last activity within 30 seconds)
            active_participants = []
            now = datetime.utcnow()
            for participant in session.active_participants:
                time_diff = now - participant.last_activity
                if time_diff.total_seconds() < 30:
                    active_participants.append({
                        'user_id': participant.user_id,
                        'username': participant.username,
                        'role': participant.role,
                        'joined_at': participant.joined_at.isoformat(),
                        'last_activity': participant.last_activity.isoformat()
                    })
            
            response_data = {
                'status': 'success',
                'session_id': session.session_id,
                'title': session.title,
                'is_active': session.is_active,
                'created_at': session.created_at.isoformat(),
                'interviewer_count': session.interviewer_count,
                'candidate_count': session.candidate_count,
                'active_participants': active_participants,
                'total_participants': len(active_participants),
                'document_version': session.document_version,
                'timestamp': datetime.utcnow().isoformat()
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


class JoinSessionAPI(APIView):
    """API to join a session programmatically"""
    def post(self, request):
        try:
            data = request.data
            session_id = data.get('session_id')
            username = data.get('username', 'User')
            role = data.get('role', 'candidate')
            
            if not session_id:
                return Response({
                    'status': 'error',
                    'message': 'session_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            session = InterviewSession.objects.filter(session_id=session_id).first()
            if not session:
                # Create session if it doesn't exist
                session = InterviewSession(
                    session_id=session_id,
                    title=f'Interview Session {session_id}',
                    is_active=True
                )
                session.save()
            
            # Generate user ID
            user_id = str(uuid.uuid4())[:8]
            
            # Create participant
            participant = ActiveSessionParticipant(
                user_id=user_id,
                username=username,
                role=role,
                joined_at=datetime.utcnow(),
                last_activity=datetime.utcnow()
            )
            
            session.active_participants.append(participant)
            
            # Update counters
            if role == 'interviewer':
                session.interviewer_count += 1
            elif role == 'candidate':
                session.candidate_count += 1
            
            session.save()
            
            # Generate WebSocket URL
            ws_url = f"ws://{request.get_host()}/ws/interview/{session_id}/?role={role}&username={username}&user_id={user_id}"
            
            return Response({
                'status': 'success',
                'message': 'Joined session successfully',
                'session_id': session_id,
                'user_id': user_id,
                'username': username,
                'role': role,
                'websocket_url': ws_url,
                'interviewer_count': session.interviewer_count,
                'candidate_count': session.candidate_count,
                'joined_at': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActiveSessionsAPI(APIView):
    """Get all active sessions with participant counts"""
    def get(self, request):
        try:
            # Get sessions active in last 24 hours
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            
            sessions = InterviewSession.objects.filter(
                updated_at__gte=cutoff_time,
                is_active=True
            ).order_by('-updated_at')
            
            response_data = []
            for session in sessions:
                # Count active participants
                active_participants = []
                now = datetime.utcnow()
                for participant in session.active_participants:
                    time_diff = now - participant.last_activity
                    if time_diff.total_seconds() < 30:
                        active_participants.append(participant)
                
                response_data.append({
                    'session_id': session.session_id,
                    'title': session.title,
                    'created_at': session.created_at.isoformat(),
                    'updated_at': session.updated_at.isoformat(),
                    'interviewer_count': session.interviewer_count,
                    'candidate_count': session.candidate_count,
                    'active_participants': len(active_participants),
                    'is_live': len(active_participants) > 0,
                    'document_version': session.document_version
                })
            
            return Response({
                'status': 'success',
                'sessions': response_data,
                'total_sessions': len(response_data),
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== CODE COLLABORATION ====================

class UpdateCodeAPI(APIView):
    """Update code in session"""
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


class SessionCodeAPI(APIView):
    """Get/Set session code with version control"""
    def get(self, request):
        session_id = request.GET.get('session_id')
        version = request.GET.get('version')
        
        if not session_id:
            return Response({
                'status': 'error',
                'message': 'session_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            code_doc = CodeDocument.objects.filter(session_id=session_id).first()
            collab_state = CollaborationState.objects.filter(
                session_id=session_id, 
                document_type='code'
            ).first()
            
            if not code_doc:
                # Return default state
                response_data = {
                    'status': 'success',
                    'session_id': session_id,
                    'content': '// Write your code here',
                    'language': 'python',
                    'version': 0,
                    'last_modified_by': None,
                    'last_modified_at': None
                }
            else:
                # Check if specific version is requested
                if version and int(version) != code_doc.version:
                    # Return version mismatch info
                    response_data = {
                        'status': 'version_mismatch',
                        'session_id': session_id,
                        'server_version': code_doc.version,
                        'client_version': int(version),
                        'content': code_doc.content,
                        'language': code_doc.language,
                        'last_modified_by': collab_state.last_modified_by if collab_state else None,
                        'last_modified_at': collab_state.last_modified_at.isoformat() if collab_state else None
                    }
                else:
                    response_data = {
                        'status': 'success',
                        'session_id': session_id,
                        'content': code_doc.content,
                        'language': code_doc.language,
                        'version': code_doc.version,
                        'last_modified_by': collab_state.last_modified_by if collab_state else None,
                        'last_modified_at': collab_state.last_modified_at.isoformat() if collab_state else None
                    }
            
            return Response(response_data)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Update session code with conflict detection"""
        try:
            data = request.data
            session_id = data.get('session_id')
            content = data.get('content', '')
            language = data.get('language')
            client_version = data.get('version', 0)
            
            if not session_id:
                return Response({
                    'status': 'error',
                    'message': 'session_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            code_doc = CodeDocument.objects.filter(session_id=session_id).first()
            if not code_doc:
                code_doc = CodeDocument(session_id=session_id)
            
            # Version conflict detection
            server_version = code_doc.version
            if client_version < server_version:
                # Conflict - client has outdated version
                return Response({
                    'status': 'conflict',
                    'message': 'Version conflict detected',
                    'server_version': server_version,
                    'client_version': client_version,
                    'server_content': code_doc.content,
                    'server_language': code_doc.language
                }, status=status.HTTP_409_CONFLICT)
            
            # Update document
            code_doc.content = content
            if language:
                code_doc.language = language
            code_doc.version = max(server_version, client_version) + 1
            code_doc.updated_at = datetime.utcnow()
            code_doc.save()
            
            # Update collaboration state
            collab_state = CollaborationState.objects.filter(
                session_id=session_id, 
                document_type='code'
            ).first()
            if not collab_state:
                collab_state = CollaborationState(
                    session_id=session_id,
                    document_type='code'
                )
            
            collab_state.content = json.dumps({
                'type': 'code',
                'language': code_doc.language,
                'line_count': len(content.split('\n'))
            })
            collab_state.version = code_doc.version
            collab_state.last_modified_by = data.get('user_id', 'unknown')
            collab_state.last_modified_at = datetime.utcnow()
            collab_state.save()
            
            return Response({
                'status': 'success',
                'message': 'Code updated successfully',
                'session_id': session_id,
                'version': code_doc.version,
                'updated_at': code_doc.updated_at.isoformat()
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== QUESTION/DOCUMENT MANAGEMENT ====================

class UpdateQuestionAPI(APIView):
    """Update questions in session"""
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


class SessionDocumentAPI(APIView):
    """Get/Set session documents (questions/PDFs)"""
    def get(self, request):
        session_id = request.GET.get('session_id')
        
        if not session_id:
            return Response({
                'status': 'error',
                'message': 'session_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            doc = QuestionDocument.objects.filter(session_id=session_id).first()
            
            if doc:
                response_data = {
                    'status': 'success',
                    'session_id': session_id,
                    'content': doc.content,
                    'file_name': doc.file_name,
                    'file_type': doc.file_type,
                    'file_size': doc.file_size,
                    'uploaded_at': doc.updated_at.isoformat(),
                    'document_version': doc.version if hasattr(doc, 'version') else 0
                }
                
                # Include file data if requested
                if request.GET.get('include_file_data') == 'true' and doc.file_data:
                    response_data['file_data'] = doc.file_data
            else:
                response_data = {
                    'status': 'success',
                    'session_id': session_id,
                    'content': '',
                    'file_name': None,
                    'file_type': None,
                    'file_size': None,
                    'uploaded_at': None,
                    'document_version': 0
                }
            
            return Response(response_data)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Update session document"""
        try:
            data = request.data
            session_id = data.get('session_id')
            
            if not session_id:
                return Response({
                    'status': 'error',
                    'message': 'session_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            doc = QuestionDocument.objects.filter(session_id=session_id).first()
            if not doc:
                doc = QuestionDocument(session_id=session_id)
            
            doc.content = data.get('content', '')
            
            # Handle file upload
            file_data = data.get('file_data')
            if file_data:
                doc.file_name = file_data.get('file_name')
                doc.file_type = file_data.get('file_type')
                doc.file_size = file_data.get('file_size')
                doc.file_data = file_data.get('file_blob')
            
            doc.updated_at = datetime.utcnow()
            doc.save()
            
            # Update session version
            session = InterviewSession.objects.get(session_id=session_id)
            session.document_version += 1
            session.save()
            
            return Response({
                'status': 'success',
                'message': 'Document updated successfully',
                'session_id': session_id,
                'document_version': session.document_version,
                'updated_at': doc.updated_at.isoformat()
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== TIMER MANAGEMENT ====================

class UpdateTimerAPI(APIView):
    """Update timer in session"""
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


# ==================== INVITATION SYSTEM ====================

class SendSessionInvitationAPI(APIView):
    """Send email invitation for session"""
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
            join_link = f"{frontend_base_url}/interview-session?session={session_id}&role={role}&token={token}"
            role_display = 'Interviewer' if role == 'interviewer' else 'Candidate'
            
            send_mail(
                subject=f'Interview Session Invitation - {session.title}',
                message=f'''You have been invited to an interview session.

Session Title: {session.title}
Session ID: {session_id}
Role: {role_display}

Click the link below to join:
{join_link}

Best regards,
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


class CreateSessionWithEmailAPI(APIView):
    """Create session and send invitations via email"""
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
            
            # Send emails if provided
            if data.get('interviewer_email'):
                interviewer_link = f"{request.build_absolute_uri('/')}interview-session?session={session_id}&role=interviewer"
                send_mail(
                    subject=f'Interview Session Invitation - {session.title}',
                    message=f'''You have been invited to an interview session.

Session Title: {session.title}
Session ID: {session_id}
Role: Interviewer

Click the link below to join:
{interviewer_link}

Best regards,
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

Session Title: {session.title}
Session ID: {session_id}
Role: Candidate

Click the link below to join:
{candidate_link}

Best regards,
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
                'message': 'Session created successfully and invitations sent.'
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ValidateInvitationAPI(APIView):
    """Validate invitation token"""
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
    """Use invitation token (mark as used)"""
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
                'join_link': f'/interview-session?session={invitation.session_id}&role={invitation.role}&token={token}'
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== CODE EXECUTION ====================

class ExecuteCodeAPI(APIView):
    """Execute code via JDoodle API"""
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


# ==================== HEALTH & MONITORING ====================

class HealthCheckAPI(APIView):
    """Health check endpoint"""
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


# ==================== WEBRTC SIGNALING (Optional) ====================

class WebRTCOfferAPI(APIView):
    """Handle WebRTC offer (for future video implementation)"""
    def post(self, request, session_id):
        return Response({
            'status': 'success',
            'message': 'WebRTC signaling endpoint (to be implemented)'
        })


class WebRTCAnswerAPI(APIView):
    """Handle WebRTC answer (for future video implementation)"""
    def post(self, request, session_id):
        return Response({
            'status': 'success',
            'message': 'WebRTC signaling endpoint (to be implemented)'
        })


class WebRTCICECandidateAPI(APIView):
    """Handle WebRTC ICE candidate (for future video implementation)"""
    def post(self, request, session_id):
        return Response({
            'status': 'success',
            'message': 'WebRTC signaling endpoint (to be implemented)'
        })