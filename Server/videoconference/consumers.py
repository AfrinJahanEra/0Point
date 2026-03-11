# videoconference/consumers.py
import json
import uuid
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from urllib.parse import parse_qs
from .models import VideoSession

connected = {}

# Heartbeat tracking for connection health
connection_heartbeats = {}

class VideoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'video_{self.session_id}'
        self.pdf_group_name = f'pdf_{self.session_id}'

        query_string = self.scope['query_string'].decode()
        params = parse_qs(query_string)
        self.role = params.get('role', [None])[0]
        self.email = params.get('email', [None])[0]

        print(f"[VideoConsumer] Connection attempt - Session: {self.session_id}, Role: {self.role}, Email: {self.email}")

        # Normalize role - accept both 'client' and 'candidate'
        if self.role == 'candidate':
            self.role = 'client'
        
        if self.role not in ['interviewer', 'client']:
            print(f"[VideoConsumer] REJECTED: Invalid role '{self.role}'")
            await self.close()
            return

        # Try to find existing session, or create a placeholder for ad-hoc sessions
        try:
            session = await sync_to_async(VideoSession.objects.get)(id=uuid.UUID(self.session_id))
            if not self.email:
                self.email = session.interviewer_email if self.role == 'interviewer' else session.candidate_email
            print(f"[VideoConsumer] Session found: {session.id}")
        except VideoSession.DoesNotExist:
            # Allow connection for ad-hoc sessions (session will be created when needed)
            print(f"[VideoConsumer] Session {self.session_id} not found, allowing ad-hoc connection")
            # Don't reject - allow WebSocket connection for real-time features
        except ValueError as e:
            print(f"[VideoConsumer] REJECTED: Invalid session ID format: {e}")
            await self.close()
            return

        if self.session_id not in connected:
            connected[self.session_id] = {}

        # Allow reconnection by removing stale connection
        if self.role in connected[self.session_id]:
            print(f"[VideoConsumer] Replacing existing {self.role} connection")
            # Don't reject, just replace the old connection

        connected[self.session_id][self.role] = {'email': self.email}

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.channel_layer.group_add(self.pdf_group_name, self.channel_name)
        await self.accept()
        
        print(f"[VideoConsumer] ACCEPTED: {self.role} connected to session {self.session_id}")
        
        # Start heartbeat for this connection
        self.heartbeat_active = True
        asyncio.create_task(self.heartbeat_loop())

        await self.broadcast_participant_list()
        
        # Notify others that a new participant joined (for WebRTC trigger)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'participant_joined',
                'role': self.role,
                'email': self.email,
            }
        )

    async def disconnect(self, close_code):
        print(f"[VideoConsumer] DISCONNECT: {self.role} from session {self.session_id}, code: {close_code}")
        
        # Stop heartbeat
        self.heartbeat_active = False
        if self.session_id in connection_heartbeats and self.channel_name in connection_heartbeats[self.session_id]:
            del connection_heartbeats[self.session_id][self.channel_name]
        
        if self.session_id in connected and self.role in connected[self.session_id]:
            del connected[self.session_id][self.role]
            if not connected[self.session_id]:
                del connected[self.session_id]
                print(f"[VideoConsumer] Session {self.session_id} is now empty, cleaned up")

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await self.channel_layer.group_discard(self.pdf_group_name, self.channel_name)
        await self.broadcast_participant_list()

    async def broadcast_participant_list(self):
        participants = []
        session_data = connected.get(self.session_id, {})
        for role_key, info in session_data.items():
            # Use lowercase role for frontend consistency
            participants.append({
                'role': 'interviewer' if role_key == 'interviewer' else 'candidate',
                'email': info['email']
            })

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'participant_list_update',
                'participants': participants,
                'count': len(participants)
            }
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type')
        
        # Handle heartbeat pong
        if msg_type == 'pong':
            if self.session_id not in connection_heartbeats:
                connection_heartbeats[self.session_id] = {}
            connection_heartbeats[self.session_id][self.channel_name] = asyncio.get_event_loop().time()
            return

        if msg_type in ['offer', 'answer', 'ice_candidate']:
            # Extract the appropriate data based on message type
            if msg_type == 'offer':
                signal_data = data.get('offer')
            elif msg_type == 'answer':
                signal_data = data.get('answer')
            else:  # ice_candidate
                signal_data = data.get('ice_candidate')
            
            print(f"[VideoConsumer] Relaying {msg_type} from {self.role}")
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'signal',
                    'signal_type': msg_type,
                    'data': signal_data,
                    'sender': self.channel_name
                }
            )

        elif msg_type == 'media_update':
            media_type = data.get('media_type')
            enabled = data.get('enabled')
            if media_type in ['audio', 'video'] and isinstance(enabled, bool):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'media_state_broadcast',
                        'sender_role': self.role,
                        'media_type': media_type,
                        'enabled': enabled,
                        'email': self.email,
                    }
                )

        elif msg_type == 'pdf_page_sync':
            page = data.get('page')
            if isinstance(page, int) and page > 0:
                await self.channel_layer.group_send(
                    self.pdf_group_name,
                    {
                        'type': 'pdf_page_broadcast',
                        'page': page,
                        'sender_role': self.role,
                        'email': self.email,
                    }
                )

    async def signal(self, event):
        if event['sender'] != self.channel_name:
            payload = {'type': event['signal_type']}
            if event['signal_type'] == 'ice_candidate':
                payload['ice_candidate'] = event['data']
            elif event['signal_type'] == 'offer':
                payload['offer'] = event['data']
            elif event['signal_type'] == 'answer':
                payload['answer'] = event['data']
            
            print(f"[VideoConsumer] Sending {event['signal_type']} to {self.role}")
            await self.send(text_data=json.dumps(payload))

    async def participant_list_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'participant_list',
            'participants': event['participants'],
            'count': event['count']
        }))

    async def media_state_broadcast(self, event):
        # Normalize sender_role for comparison (client vs candidate)
        sender_role = event['sender_role']
        my_role = self.role
        if sender_role == 'candidate':
            sender_role = 'client'
        if my_role == 'candidate':
            my_role = 'client'
        
        if my_role != sender_role:
            await self.send(text_data=json.dumps({
                'type': 'media_update',
                'media_type': event['media_type'],
                'enabled': event['enabled'],
                'role': event['sender_role'],
                'email': event['email'],
            }))

    async def pdf_page_broadcast(self, event):
        await self.send(text_data=json.dumps({
            'type': 'pdf_page_sync',
            'page': event['page']
        }))

    async def pdf_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'pdf_update',
            'pdf_url': event['pdf_url'],
            'uploader_email': event['uploader_email'],
            'pdf_id': event['pdf_id'],
        }))

    async def participant_joined(self, event):
        # Notify about new participant joining (for WebRTC initiation)
        if self.role != event['role']:
            await self.send(text_data=json.dumps({
                'type': 'participant_joined',
                'role': event['role'],
                'email': event['email'],
            }))

    async def heartbeat_loop(self):
        """Send periodic ping to check connection health"""
        while self.heartbeat_active:
            try:
                if hasattr(self, 'send') and self.heartbeat_active:
                    await self.send(text_data=json.dumps({'type': 'ping'}))
                await asyncio.sleep(30)  # Ping every 30 seconds
            except Exception as e:
                print(f"[VideoConsumer] Heartbeat error: {e}")
                break