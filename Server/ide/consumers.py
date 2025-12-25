# ide/consumers.py
import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import CodeSession

class CodeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'code_{self.session_id}'

        # Join group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Send current code on connect
        try:
            code_session = await sync_to_async(CodeSession.objects.get)(
                video_session_id=uuid.UUID(self.session_id)
            )
            await self.send(text_data=json.dumps({
                'type': 'code_update',
                'code': code_session.code,
                'language': code_session.language
            }))
        except CodeSession.DoesNotExist:
            # Create initial code session
            await sync_to_async(CodeSession.objects.create)(
                video_session_id=uuid.UUID(self.session_id),
                code='# Welcome to the collaborative IDE!\nprint("Hello, Interview!")',
                language='python'
            )
            # Send initial code to new joiner
            await self.send(text_data=json.dumps({
                'type': 'code_update',
                'code': '# Welcome to the collaborative IDE!\nprint("Hello, Interview!")',
                'language': 'python'
            }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        if msg_type == 'code_update':
            code = data.get('code', '')
            language = data.get('language', 'python')

            # Save to DB
            await sync_to_async(CodeSession.objects.update_or_create)(
                video_session_id=uuid.UUID(self.session_id),
                defaults={'code': code, 'language': language}
            )

            # Broadcast to all
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_code_update',
                    'code': code,
                    'language': language
                }
            )

    async def broadcast_code_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'code_update',
            'code': event['code'],
            'language': event['language']
        }))