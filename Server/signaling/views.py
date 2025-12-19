from channels.generic.websocket import AsyncWebsocketConsumer
import json

class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'room_{self.room_name}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data['type']
        message_data = data['data']
        
        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message_type': message_type,
                'message_data': message_data,
                'sender_channel_name': self.channel_name
            }
        )
    
    # Receive message from room group
    async def signal_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': event['message_type'],
            'data': event['message_data']
        }))


# signaling/views.py (additional)
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Room

@api_view(['POST'])
def create_room(request):
    room_name = request.data.get('room_name')
    if not room_name:
        return Response({'error': 'Room name is required'}, status=400)
    
    room, created = Room.objects.get_or_create(name=room_name)
    return Response({
        'room_id': room.id,
        'room_name': room.name,
        'created': created
    })

@api_view(['GET'])
def get_room(request, room_name):
    try:
        room = Room.objects.get(name=room_name)
        return Response({
            'room_id': room.id,
            'room_name': room.name
        })
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=404)