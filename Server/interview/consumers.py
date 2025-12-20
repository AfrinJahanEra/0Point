import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from datetime import datetime
import uuid
from .models import (
    InterviewSession, CodeDocument, QuestionDocument, 
    UserCursor, UserPresence, InterviewTimer
)

class InterviewConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.user_id = str(uuid.uuid4())[:8]
        self.username = f"User_{self.user_id}"
        self.role = self.scope['query_string'].decode().split('role=')[1] if 'role=' in self.scope['query_string'].decode() else 'candidate'
        
        self.group_name = f"interview_{self.session_id}"
        
        # Create or get session
        await self.create_or_get_session()
        
        # Join room group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Initialize user presence
        await self.update_user_presence(is_online=True)
        
        # Send current session state to new user
        await self.send_initial_state()
        
        # Notify others about new user
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "user_joined",
                "user_id": self.user_id,
                "username": self.username,
                "role": self.role
            }
        )
    
    async def disconnect(self, close_code):
        # Update user presence
        await self.update_user_presence(is_online=False)
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        
        # Notify others about user leaving
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "user_left",
                "user_id": self.user_id,
                "username": self.username
            }
        )
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            
            if message_type == "code_change":
                await self.handle_code_change(data)
            elif message_type == "cursor_move":
                await self.handle_cursor_move(data)
            elif message_type == "question_update":
                await self.handle_question_update(data)
            elif message_type == "video_toggle":
                await self.handle_video_toggle(data)
            elif message_type == "timer_update":
                await self.handle_timer_update(data)
            elif message_type == "language_change":
                await self.handle_language_change(data)
            elif message_type == "run_code":
                await self.handle_run_code(data)
            elif message_type == "chat_message":
                await self.handle_chat_message(data)
            elif message_type == "user_info":
                await self.handle_user_info(data)
            elif message_type == "heartbeat":
                await self.handle_heartbeat(data)
            
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Invalid JSON format"
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": str(e)
            }))
    
    # Database operations
    @database_sync_to_async
    def create_or_get_session(self):
        # Try to get existing session
        session = InterviewSession.objects(session_id=self.session_id).first()
        
        if session is None:
            # Create new session
            session = InterviewSession(
                session_id=self.session_id,
                title=f"Interview Session {self.session_id}",
                is_active=True
            )
            session.save()
        else:
            # Update existing session
            session.updated_at = datetime.utcnow()
            session.save()
        
        return session
    
    @database_sync_to_async
    def update_user_presence(self, is_online=True):
        # Try to get existing user presence
        user = UserPresence.objects(session_id=self.session_id, user_id=self.user_id).first()
        
        if user is None:
            # Create new user presence
            user = UserPresence(
                session_id=self.session_id,
                user_id=self.user_id,
                username=self.username,
                role=self.role,
                is_online=is_online,
                video_enabled=True,
                last_seen=datetime.utcnow()
            )
            user.save()
        else:
            # Update existing user presence
            user.username = self.username
            user.role = self.role
            user.is_online = is_online
            user.video_enabled = True
            user.last_seen = datetime.utcnow()
            user.save()
        
        return user
    
    @database_sync_to_async
    def get_code_document(self):
        # Try to get existing code document
        doc = CodeDocument.objects(session_id=self.session_id).first()
        
        if doc is None:
            # Create new code document
            doc = CodeDocument(
                session_id=self.session_id,
                content='// Write your code here...\nfunction solution() {\n  \n}\n',
                language='javascript'
            )
            doc.save()
        
        return doc
    
    @database_sync_to_async
    def update_code_document(self, content, language=None):
        doc = CodeDocument.objects(session_id=self.session_id).first()
        if doc:
            doc.content = content
            if language:
                doc.language = language
            doc.version += 1
            doc.updated_at = datetime.utcnow()
            doc.save()
        else:
            doc = CodeDocument(
                session_id=self.session_id,
                content=content,
                language=language or 'javascript'
            ).save()
        return doc
    
    @database_sync_to_async
    def update_cursor_position(self, line, column):
        # Try to get existing cursor
        cursor = UserCursor.objects(session_id=self.session_id, user_id=self.user_id).first()
        
        if cursor is None:
            # Create new cursor
            cursor = UserCursor(
                session_id=self.session_id,
                user_id=self.user_id,
                username=self.username,
                line=line,
                column=column,
                updated_at=datetime.utcnow()
            )
            cursor.save()
        else:
            # Update existing cursor
            cursor.username = self.username
            cursor.line = line
            cursor.column = column
            cursor.updated_at = datetime.utcnow()
            cursor.save()
        
        return cursor
    
    @database_sync_to_async
    def get_question_document(self):
        return QuestionDocument.objects(session_id=self.session_id).first()
    
    @database_sync_to_async
    def update_question_document(self, content, file_data=None):
        doc = QuestionDocument.objects(session_id=self.session_id).first()
        if doc:
            doc.content = content
            if file_data:
                doc.file_name = file_data.get('file_name')
                doc.file_type = file_data.get('file_type')
                doc.file_size = file_data.get('file_size')
                doc.file_data = file_data.get('file_blob')  # Store base64 data
            doc.updated_at = datetime.utcnow()
            doc.save()
        else:
            doc = QuestionDocument(
                session_id=self.session_id,
                content=content,
                file_name=file_data.get('file_name') if file_data else None,
                file_type=file_data.get('file_type') if file_data else None,
                file_size=file_data.get('file_size') if file_data else None,
                file_data=file_data.get('file_blob') if file_data else None
            ).save()
        return doc
    
    @database_sync_to_async
    def get_timer(self):
        # Try to get existing timer
        timer = InterviewTimer.objects(session_id=self.session_id).first()
        
        if timer is None:
            # Create new timer
            timer = InterviewTimer(
                session_id=self.session_id,
                total_duration=3600,
                remaining_time=3600,
                is_running=True
            )
            timer.save()
        
        return timer
    
    @database_sync_to_async
    def update_timer(self, remaining_time, is_running=None):
        timer = InterviewTimer.objects(session_id=self.session_id).first()
        if timer:
            timer.remaining_time = remaining_time
            if is_running is not None:
                timer.is_running = is_running
            timer.last_updated = datetime.utcnow()
            timer.save()
        return timer
    
    @database_sync_to_async
    def get_online_users(self):
        users = UserPresence.objects(
            session_id=self.session_id,
            is_online=True
        ).order_by('-last_seen')
        return list(users)
    
    @database_sync_to_async
    def get_user_cursors(self):
        cursors = UserCursor.objects(
            session_id=self.session_id
        ).order_by('-updated_at')
        return list(cursors)
    
    # Message handlers
    async def handle_code_change(self, data):
        content = data.get("content", "")
        language = data.get("language")
        
        # Save to database
        doc = await self.update_code_document(content, language)
        
        # Broadcast to all users in session
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_code_change",
                "content": content,
                "language": language,
                "user_id": self.user_id,
                "username": self.username,
                "version": doc.version,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_cursor_move(self, data):
        line = data.get("line", 1)
        column = data.get("column", 1)
        
        # Save cursor position
        await self.update_cursor_position(line, column)
        
        # Broadcast cursor movement
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_cursor_move",
                "line": line,
                "column": column,
                "user_id": self.user_id,
                "username": self.username,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_question_update(self, data):
        content = data.get("content", "")
        file_data = data.get("file_data")
        
        # Save question
        await self.update_question_document(content, file_data)
        
        # Broadcast question update
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_question_update",
                "content": content,
                "file_data": file_data,
                "user_id": self.user_id,
                "username": self.username,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_video_toggle(self, data):
        enabled = data.get("enabled", True)
        
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_video_toggle",
                "user_id": self.user_id,
                "username": self.username,
                "enabled": enabled,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_timer_update(self, data):
        remaining_time = data.get("remaining_time", 3600)
        is_running = data.get("is_running", True)
        
        # Update timer in database
        await self.update_timer(remaining_time, is_running)
        
        # Broadcast timer update
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_timer_update",
                "remaining_time": remaining_time,
                "is_running": is_running,
                "user_id": self.user_id,
                "username": self.username,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_language_change(self, data):
        language = data.get("language", "javascript")
        
        # Update code document language
        doc = await self.get_code_document()
        doc.language = language
        await database_sync_to_async(doc.save)()
        
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
    
    async def handle_run_code(self, data):
        code = data.get("code", "")
        language = data.get("language", "javascript")
        output = f"Code executed in {language}:\n{code[:100]}..."
        
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_run_code",
                "output": output,
                "language": language,
                "user_id": self.user_id,
                "username": self.username,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_chat_message(self, data):
        message = data.get("message", "")
        
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_chat_message",
                "message": message,
                "user_id": self.user_id,
                "username": self.username,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_user_info(self, data):
        new_username = data.get("username", self.username)
        self.username = new_username
        
        await self.update_user_presence(is_online=True)
        
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_user_info",
                "user_id": self.user_id,
                "username": self.username,
                "role": self.role,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def handle_heartbeat(self, data):
        # Update last seen
        await self.update_user_presence(is_online=True)
    
    async def send_initial_state(self):
        # Get current state from database
        code_doc = await self.get_code_document()
        question_doc = await self.get_question_document()
        timer = await self.get_timer()
        online_users = await self.get_online_users()
        user_cursors = await self.get_user_cursors()
        
        # Send initial state
        await self.send(text_data=json.dumps({
            "type": "initial_state",
            "session_id": self.session_id,
            "user_id": self.user_id,
            "code": {
                "content": code_doc.content,
                "language": code_doc.language,
                "version": code_doc.version
            },
            "question": {
                "content": question_doc.content if question_doc else "",
                "file_name": question_doc.file_name if question_doc else None,
                "file_type": question_doc.file_type if question_doc else None,
                "file_data": question_doc.file_data if question_doc else None
            },
            "timer": {
                "remaining_time": timer.remaining_time,
                "is_running": timer.is_running
            },
            "online_users": [
                {
                    "user_id": user.user_id,
                    "username": user.username,
                    "role": user.role,
                    "video_enabled": user.video_enabled
                }
                for user in online_users
            ],
            "cursors": [
                {
                    "user_id": cursor.user_id,
                    "username": cursor.username,
                    "line": cursor.line,
                    "column": cursor.column
                }
                for cursor in user_cursors
            ]
        }))
    
    # Broadcast handlers
    async def broadcast_code_change(self, event):
        await self.send(text_data=json.dumps({
            "type": "code_change",
            "content": event["content"],
            "language": event.get("language"),
            "user_id": event["user_id"],
            "username": event["username"],
            "version": event.get("version", 0),
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_cursor_move(self, event):
        await self.send(text_data=json.dumps({
            "type": "cursor_move",
            "line": event["line"],
            "column": event["column"],
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_question_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "question_update",
            "content": event["content"],
            "file_data": event.get("file_data"),
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_video_toggle(self, event):
        await self.send(text_data=json.dumps({
            "type": "video_toggle",
            "user_id": event["user_id"],
            "username": event["username"],
            "enabled": event["enabled"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_timer_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "timer_update",
            "remaining_time": event["remaining_time"],
            "is_running": event["is_running"],
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_language_change(self, event):
        await self.send(text_data=json.dumps({
            "type": "language_change",
            "language": event["language"],
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_run_code(self, event):
        await self.send(text_data=json.dumps({
            "type": "run_code",
            "output": event["output"],
            "language": event["language"],
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "message": event["message"],
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": event["timestamp"]
        }))
    
    async def broadcast_user_info(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_info",
            "user_id": event["user_id"],
            "username": event["username"],
            "role": event["role"],
            "timestamp": event["timestamp"]
        }))
    
    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_joined",
            "user_id": event["user_id"],
            "username": event["username"],
            "role": event.get("role", "candidate"),
            "timestamp": datetime.utcnow().isoformat()
        }))
    
    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_left",
            "user_id": event["user_id"],
            "username": event["username"],
            "timestamp": datetime.utcnow().isoformat()
        }))