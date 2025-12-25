import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from urllib.parse import parse_qs
from .models import VideoSession

# In-memory tracking for 1:1 sessions
# Format: { session_id: { "interviewer": { "email": "...", ... }, "client": { ... } } }
connected = {}

class VideoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'video_{self.session_id}'

        query_string = self.scope['query_string'].decode()
        params = parse_qs(query_string)
        self.role = params.get('role', [None])[0]

        if self.role not in ['interviewer', 'client']:
            await self.close()
            return

        try:
            session = await sync_to_async(VideoSession.objects.get)(id=uuid.UUID(self.session_id))
            self.email = session.interviewer_email if self.role == 'interviewer' else session.candidate_email
        except VideoSession.DoesNotExist:
            await self.close()
            return
        except ValueError:
            await self.close()
            return

        # Prevent duplicate role in same room
        if self.session_id not in connected:
            connected[self.session_id] = {}

        if self.role in connected[self.session_id]:
            await self.close()
            return

        connected[self.session_id][self.role] = {
            'email': self.email,
        }

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Broadcast updated participant list to all (including self)
        await self.broadcast_participant_list()

    async def disconnect(self, close_code):
        if self.session_id in connected and self.role in connected[self.session_id]:
            del connected[self.session_id][self.role]
            if not connected[self.session_id]:
                del connected[self.session_id]

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await self.broadcast_participant_list()

    async def broadcast_participant_list(self):
        participants = []
        session_data = connected.get(self.session_id, {})
        for role_key, info in session_data.items():
            participants.append({
                'role': 'Interviewer' if role_key == 'interviewer' else 'Candidate',
                'email': info['email'],
                'status': 'online'
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
            await self.send(text_data=json.dumps({'error': 'Invalid JSON'}))
            return

        msg_type = data.get('type')

        # 👇 WebRTC Signaling: offer / answer / ICE
        if msg_type in ['offer', 'answer', 'ice_candidate']:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'signal',
                    'signal_type': msg_type,
                    'data': data[msg_type] if msg_type != 'ice_candidate' else data.get('ice_candidate'),
                    'sender': self.channel_name
                }
            )

        # 👇 NEW: Media State Updates (audio/video toggle)
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

    async def signal(self, event):
        # Relay signaling messages to peers (except sender)
        if event['sender'] != self.channel_name:
            payload = {
                'type': event['signal_type'],
            }
            if event['signal_type'] == 'ice_candidate':
                payload['ice_candidate'] = event['data']
            else:
                payload[event['signal_type']] = event['data']
            await self.send(text_data=json.dumps(payload))

    async def participant_list_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'participant_list',
            'participants': event['participants'],
            'count': event['count']
        }))

    # 👇 NEW: Broadcast media state to *other* peers only
    async def media_state_broadcast(self, event):
        # Do NOT echo back to the sender
        if self.role != event['sender_role']:
            await self.send(text_data=json.dumps({
                'type': 'media_update',
                'media_type': event['media_type'],
                'enabled': event['enabled'],
                'role': event['sender_role'],      # 'interviewer' or 'client'
                'email': event['email'],
            }))