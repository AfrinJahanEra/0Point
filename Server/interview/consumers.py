# interview/consumers.py - COMPLETE REVISED VERSION
import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from datetime import datetime
import uuid
from .models import (
    InterviewSession, CodeDocument, QuestionDocument, 
    UserPresence, InterviewTimer, ActiveSessionParticipant,
    CollaborationState
)

class InterviewConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.user_id = str(uuid.uuid4())[:8]
        
        # Get user info from query params
        query_params = self.scope['query_string'].decode()
        params = dict(param.split('=') for param in query_params.split('&') if '=' in param)
        
        self.role = params.get('role', 'candidate')
        self.username = params.get('username', f'{self.role.capitalize()}_{self.user_id}')
        
        self.group_name = f"interview_{self.session_id}"
        self.socket_id = self.channel_name
        
        # Create or get session
        session = await self.create_or_get_session()
        
        # Add user to active participants
        await self.add_user_to_session()
        
        # Join room group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial state to ALL users
        await self.send_initial_state()
        
        # Broadcast user joined event
        await self.broadcast_user_presence('joined')
        
        # Start heartbeat
        asyncio.create_task(self.heartbeat())
    
    async def disconnect(self, close_code):
        # Remove user from active participants
        await self.remove_user_from_session()
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        
        # Broadcast user left event
        await self.broadcast_user_presence('left')
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            
            # Update last activity
            await self.update_user_activity()
            
            # Route messages
            handlers = {
                "code_change": self.handle_code_change,
                "cursor_move": self.handle_cursor_move,
                "question_update": self.handle_question_update,
                "document_upload": self.handle_document_upload,
                "language_change": self.handle_language_change,
                "chat_message": self.handle_chat_message,
                "heartbeat": self.handle_heartbeat,
                "user_typing": self.handle_user_typing,
                "selection_change": self.handle_selection_change,
                "execution_request": self.handle_execution_request,
                "timer_control": self.handle_timer_control,
                "role_change": self.handle_role_change
            }
            
            handler = handlers.get(message_type)
            if handler:
                await handler(data)
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            await self.send_error(str(e))
    
    # ==================== DATABASE OPERATIONS ====================
    
    @database_sync_to_async
    def create_or_get_session(self):
        session = InterviewSession.objects(session_id=self.session_id).first()
        if not session:
            session = InterviewSession(
                session_id=self.session_id,
                title=f"Interview Session {self.session_id}",
                created_by=self.username,
                interviewer_count=1 if self.role == 'interviewer' else 0,
                candidate_count=1 if self.role == 'candidate' else 0,
                is_active=True
            )
            session.save()
        return session
    
    @database_sync_to_async
    def add_user_to_session(self):
        session = InterviewSession.objects(session_id=self.session_id).first()
        
        # Check if user already exists
        existing_user = None
        for participant in session.active_participants:
            if participant.user_id == self.user_id:
                existing_user = participant
                break
        
        if not existing_user:
            # Add new participant
            participant = ActiveSessionParticipant(
                user_id=self.user_id,
                username=self.username,
                role=self.role,
                socket_id=self.socket_id,
                joined_at=datetime.utcnow(),
                last_activity=datetime.utcnow()
            )
            session.active_participants.append(participant)
            
            # Update counters
            if self.role == 'interviewer':
                session.interviewer_count += 1
            elif self.role == 'candidate':
                session.candidate_count += 1
        else:
            # Update existing participant
            existing_user.socket_id = self.socket_id
            existing_user.last_activity = datetime.utcnow()
        
        session.save()
        return session
    
    @database_sync_to_async
    def remove_user_from_session(self):
        session = InterviewSession.objects(session_id=self.session_id).first()
        if not session:
            return
        
        # Remove participant
        new_participants = []
        for participant in session.active_participants:
            if participant.user_id != self.user_id:
                new_participants.append(participant)
            else:
                # Update counters
                if participant.role == 'interviewer':
                    session.interviewer_count = max(0, session.interviewer_count - 1)
                elif participant.role == 'candidate':
                    session.candidate_count = max(0, session.candidate_count - 1)
        
        session.active_participants = new_participants
        
        # If no participants left, mark session as inactive after 5 minutes
        if len(new_participants) == 0:
            session.is_active = False
        
        session.save()
    
    @database_sync_to_async
    def update_user_activity(self):
        session = InterviewSession.objects(session_id=self.session_id).first()
        if session:
            for participant in session.active_participants:
                if participant.user_id == self.user_id:
                    participant.last_activity = datetime.utcnow()
                    break
            session.save()
    
    @database_sync_to_async
    def get_session_state(self):
        """Get complete session state for initialization"""
        session = InterviewSession.objects(session_id=self.session_id).first()
        
        # Get code document
        code_doc = CodeDocument.objects(session_id=self.session_id).first()
        if not code_doc:
            code_doc = CodeDocument(
                session_id=self.session_id,
                content=self.get_default_code('python'),
                language='python',
                version=0
            )
            code_doc.save()
        
        # Get question document
        question_doc = QuestionDocument.objects(session_id=self.session_id).first()
        
        # Get timer
        timer = InterviewTimer.objects(session_id=self.session_id).first()
        if not timer:
            timer = InterviewTimer(
                session_id=self.session_id,
                total_duration=3600,
                remaining_time=3600,
                is_running=True
            )
            timer.save()
        
        # Get collaboration state
        collaboration_state = CollaborationState.objects(session_id=self.session_id, document_type='code').first()
        
        return {
            'session': session,
            'code': code_doc,
            'question': question_doc,
            'timer': timer,
            'collaboration': collaboration_state
        }
    
    @database_sync_to_async
    def update_code_document(self, content, language=None, version=None):
        doc = CodeDocument.objects(session_id=self.session_id).first()
        if not doc:
            doc = CodeDocument(session_id=self.session_id)
        
        doc.content = content
        if language:
            doc.language = language
        if version is not None:
            doc.version = version
        else:
            doc.version += 1
        
        doc.updated_at = datetime.utcnow()
        doc.save()
        
        # Update collaboration state
        collab = CollaborationState.objects(session_id=self.session_id, document_type='code').first()
        if not collab:
            collab = CollaborationState(
                session_id=self.session_id,
                document_type='code',
                content=json.dumps({'type': 'code', 'language': doc.language}),
                version=doc.version
            )
        else:
            collab.content = json.dumps({'type': 'code', 'language': doc.language})
            collab.version = doc.version
        
        collab.last_modified_by = self.user_id
        collab.last_modified_at = datetime.utcnow()
        collab.save()
        
        return doc
    
    @database_sync_to_async
    def update_question_document(self, content, file_data=None):
        doc = QuestionDocument.objects(session_id=self.session_id).first()
        if not doc:
            doc = QuestionDocument(session_id=self.session_id)
        
        doc.content = content
        if file_data:
            doc.file_name = file_data.get('file_name')
            doc.file_type = file_data.get('file_type')
            doc.file_size = file_data.get('file_size')
            doc.file_data = file_data.get('file_blob')
        
        doc.updated_at = datetime.utcnow()
        doc.save()
        
        # Update session document version
        session = InterviewSession.objects(session_id=self.session_id).first()
        if session:
            session.document_version += 1
            session.save()
        
        return doc
    
    @database_sync_to_async
    def get_active_participants_data(self):
        session = InterviewSession.objects(session_id=self.session_id).first()
        if not session:
            return []
        
        # Remove inactive participants (last activity > 30 seconds)
        active_participants = []
        for participant in session.active_participants:
            time_diff = datetime.utcnow() - participant.last_activity
            if time_diff.total_seconds() < 30:  # 30 seconds timeout
                active_participants.append(participant)
        
        # Update session with only active participants
        session.active_participants = active_participants
        session.save()
        
        return active_participants
    
    # ==================== MESSAGE HANDLERS ====================
    
    async def handle_code_change(self, data):
        """Handle real-time code changes with conflict resolution"""
        content = data.get("content", "")
        language = data.get("language")
        client_version = data.get("version", 0)
        
        # Get current server version
        state = await self.get_session_state()
        server_version = state['code'].version
        
        # Simple conflict resolution: Use latest version
        if client_version >= server_version:
            doc = await self.update_code_document(content, language, client_version)
            
            # Broadcast to all except sender
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "broadcast_code_change",
                    "content": content,
                    "language": language,
                    "user_id": self.user_id,
                    "username": self.username,
                    "version": doc.version,
                    "timestamp": datetime.utcnow().isoformat(),
                    "exclude_socket": self.socket_id
                }
            )
        else:
            # Send server state to client
            await self.send(text_data=json.dumps({
                "type": "code_sync",
                "content": state['code'].content,
                "language": state['code'].language,
                "version": server_version,
                "message": "Sync with server version"
            }))
    
    async def handle_question_update(self, data):
        """Handle question/document updates"""
        content = data.get("content", "")
        file_data = data.get("file_data")
        
        doc = await self.update_question_document(content, file_data)
        
        # Broadcast document update
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_question_update",
                "content": content,
                "file_data": file_data,
                "user_id": self.user_id,
                "username": self.username,
                "timestamp": datetime.utcnow().isoformat(),
                "exclude_socket": self.socket_id
            }
        )
    
    async def handle_document_upload(self, data):
        """Handle file uploads (PDF/DOCX)"""
        file_data = data.get("file_data")
        
        if not file_data:
            return
        
        # Create content description
        content = f"""File Uploaded:
Name: {file_data.get('file_name')}
Type: {file_data.get('file_type')}
Size: {file_data.get('file_size')} bytes
Uploaded by: {self.username}
Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"""
        
        # Update document
        await self.handle_question_update({
            "content": content,
            "file_data": file_data
        })
    
    async def handle_cursor_move(self, data):
        """Broadcast cursor position"""
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_cursor_move",
                "user_id": self.user_id,
                "username": self.username,
                "line": data.get("line", 1),
                "column": data.get("column", 1),
                "timestamp": datetime.utcnow().isoformat(),
                "exclude_socket": self.socket_id
            }
        )
    
    async def handle_selection_change(self, data):
        """Broadcast text selection"""
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_selection",
                "user_id": self.user_id,
                "username": self.username,
                "selection": data.get("selection", {}),
                "timestamp": datetime.utcnow().isoformat(),
                "exclude_socket": self.socket_id
            }
        )
    
    async def handle_user_typing(self, data):
        """Broadcast typing status"""
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_typing",
                "user_id": self.user_id,
                "username": self.username,
                "is_typing": data.get("is_typing", False),
                "timestamp": datetime.utcnow().isoformat(),
                "exclude_socket": self.socket_id
            }
        )
    
    async def handle_language_change(self, data):
        """Handle programming language change"""
        language = data.get("language", "python")
        
        # Update code document with new language
        state = await self.get_session_state()
        await self.update_code_document(state['code'].content, language)
        
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_language_change",
                "language": language,
                "user_id": self.user_id,
                "username": self.username,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_chat_message(self, data):
        """Handle chat messages"""
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_chat_message",
                "message": data.get("message", ""),
                "user_id": self.user_id,
                "username": self.username,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_execution_request(self, data):
        """Forward execution request to backend API"""
        # This would call the ExecuteCodeAPI
        pass
    
    async def handle_timer_control(self, data):
        """Handle timer controls"""
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_timer_control",
                "action": data.get("action"),  # start, pause, reset
                "duration": data.get("duration"),
                "user_id": self.user_id,
                "username": self.username,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_role_change(self, data):
        """Handle role changes (interviewer/candidate)"""
        new_role = data.get("role", self.role)
        old_role = self.role
        self.role = new_role
        
        # Update session counters
        session = await database_sync_to_async(InterviewSession.objects(session_id=self.session_id).first)()
        if session:
            if old_role == 'interviewer' and new_role == 'candidate':
                session.interviewer_count = max(0, session.interviewer_count - 1)
                session.candidate_count += 1
            elif old_role == 'candidate' and new_role == 'interviewer':
                session.candidate_count = max(0, session.candidate_count - 1)
                session.interviewer_count += 1
            session.save()
        
        # Broadcast role change
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_role_change",
                "user_id": self.user_id,
                "username": self.username,
                "old_role": old_role,
                "new_role": new_role,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_heartbeat(self, data):
        """Handle heartbeat/ping"""
        await self.update_user_activity()
        await self.send(text_data=json.dumps({
            "type": "heartbeat_ack",
            "timestamp": datetime.utcnow().isoformat()
        }))
    
    # ==================== BROADCAST HANDLERS ====================
    
    async def broadcast_code_change(self, event):
        """Send code change to all clients except sender"""
        if event.get("exclude_socket") == self.socket_id:
            return
            
        await self.send(text_data=json.dumps({
            "type": "code_change",
            "content": event["content"],
            "language": event.get("language"),
            "user_id": event["user_id"],
            "username": event["username"],
            "version": event.get("version", 0),
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_question_update(self, event):
        """Send question update to all clients except sender"""
        if event.get("exclude_socket") == self.socket_id:
            return
            
        await self.send(text_data=json.dumps({
            "type": "question_update",
            "content": event["content"],
            "file_data": event.get("file_data"),
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_cursor_move(self, event):
        """Send cursor move to all clients except sender"""
        if event.get("exclude_socket") == self.socket_id:
            return
            
        await self.send(text_data=json.dumps({
            "type": "cursor_move",
            "user_id": event["user_id"],
            "username": event["username"],
            "line": event["line"],
            "column": event["column"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_selection(self, event):
        """Send selection change to all clients except sender"""
        if event.get("exclude_socket") == self.socket_id:
            return
            
        await self.send(text_data=json.dumps({
            "type": "selection_change",
            "user_id": event["user_id"],
            "username": event["username"],
            "selection": event["selection"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_typing(self, event):
        """Send typing status to all clients except sender"""
        if event.get("exclude_socket") == self.socket_id:
            return
            
        await self.send(text_data=json.dumps({
            "type": "user_typing",
            "user_id": event["user_id"],
            "username": event["username"],
            "is_typing": event["is_typing"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_user_presence(self, action):
        """Broadcast user join/leave to all clients"""
        participants = await self.get_active_participants_data()
        
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_presence_update",
                "action": action,
                "user_id": self.user_id,
                "username": self.username,
                "role": self.role,
                "participants": [
                    {
                        "user_id": p.user_id,
                        "username": p.username,
                        "role": p.role,
                        "joined_at": p.joined_at.isoformat()
                    }
                    for p in participants
                ],
                "interviewer_count": len([p for p in participants if p.role == 'interviewer']),
                "candidate_count": len([p for p in participants if p.role == 'candidate']),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def broadcast_presence_update(self, event):
        """Send presence update to all clients"""
        await self.send(text_data=json.dumps({
            "type": "presence_update",
            "action": event["action"],
            "user_id": event["user_id"],
            "username": event["username"],
            "role": event["role"],
            "participants": event["participants"],
            "interviewer_count": event["interviewer_count"],
            "candidate_count": event["candidate_count"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_language_change(self, event):
        """Send language change to all clients"""
        await self.send(text_data=json.dumps({
            "type": "language_change",
            "language": event["language"],
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_chat_message(self, event):
        """Send chat message to all clients"""
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "message": event["message"],
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_timer_control(self, event):
        """Send timer control to all clients"""
        await self.send(text_data=json.dumps({
            "type": "timer_control",
            "action": event["action"],
            "duration": event.get("duration"),
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_role_change(self, event):
        """Send role change to all clients"""
        await self.send(text_data=json.dumps({
            "type": "role_change",
            "user_id": event["user_id"],
            "username": event["username"],
            "old_role": event["old_role"],
            "new_role": event["new_role"],
            "timestamp": event["timestamp"]
        }))
    
    # ==================== UTILITY METHODS ====================
    
    async def send_initial_state(self):
        """Send complete initial state to newly connected client"""
        state = await self.get_session_state()
        participants = await self.get_active_participants_data()
        
        await self.send(text_data=json.dumps({
            "type": "initial_state",
            "session_id": self.session_id,
            "user_id": self.user_id,
            "username": self.username,
            "role": self.role,
            "code": {
                "content": state['code'].content,
                "language": state['code'].language,
                "version": state['code'].version
            },
            "question": {
                "content": state['question'].content if state['question'] else "",
                "file_name": state['question'].file_name if state['question'] else None,
                "file_type": state['question'].file_type if state['question'] else None,
                "file_data": state['question'].file_data if state['question'] else None
            },
            "timer": {
                "remaining_time": state['timer'].remaining_time,
                "is_running": state['timer'].is_running
            },
            "participants": [
                {
                    "user_id": p.user_id,
                    "username": p.username,
                    "role": p.role,
                    "joined_at": p.joined_at.isoformat()
                }
                for p in participants
            ],
            "interviewer_count": len([p for p in participants if p.role == 'interviewer']),
            "candidate_count": len([p for p in participants if p.role == 'candidate']),
            "timestamp": datetime.utcnow().isoformat()
        }))
    
    async def send_error(self, message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            "type": "error",
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }))
    
    def get_default_code(self, language):
        """Get default code template for language"""
        templates = {
            'python': '# Write your Python code here\nprint("Hello World!")',
            'javascript': '// Write your JavaScript code here\nconsole.log("Hello World!");',
            'java': '// Write your Java code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}',
            'cpp': '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}',
            'c': '// Write your C code here\n#include <stdio.h>\n\nint main() {\n    printf("Hello World!\\n");\n    return 0;\n}'
        }
        return templates.get(language, '// Write your code here')
    
    async def heartbeat(self):
        """Send periodic heartbeat to keep connection alive"""
        while True:
            try:
                await asyncio.sleep(25)  # Send heartbeat every 25 seconds
                if self.connected:
                    await self.send(text_data=json.dumps({
                        "type": "heartbeat",
                        "timestamp": datetime.utcnow().isoformat()
                    }))
            except:
                break