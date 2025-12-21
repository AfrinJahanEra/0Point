# interview/views.py - ADD THESE NEW ENDPOINTS
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from .models import InterviewSession, ActiveSessionParticipant
from datetime import datetime
import json

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
            from .models import QuestionDocument
            
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
            
            from .models import QuestionDocument
            
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
            from .models import CodeDocument, CollaborationState
            
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
            
            from .models import CodeDocument, CollaborationState
            
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


class ActiveSessionsAPI(APIView):
    """Get all active sessions with participant counts"""
    
    def get(self, request):
        try:
            # Get sessions active in last 24 hours
            from datetime import timedelta
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
                return Response({
                    'status': 'error',
                    'message': 'Session not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Generate user ID
            import uuid
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