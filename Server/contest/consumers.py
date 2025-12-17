import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

class ContestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.contest_id = self.scope["url_route"]["kwargs"]["contest_id"]
            self.group_name = f"contest_{self.contest_id}"

            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            await self.accept()
            await self.send(json.dumps({
                "message": "connected",
                "contest_id": self.contest_id
            }))
            
            logger.info(f"WebSocket connected: contest_{self.contest_id}")
            
        except Exception as e:
            logger.error(f"Error connecting to contest WebSocket: {e}")
            await self.close()

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            logger.info(f"WebSocket disconnected: contest_{self.contest_id}, code: {close_code}")
        except Exception as e:
            logger.error(f"Error disconnecting from contest WebSocket: {e}")

    async def receive(self, text_data):
        """Handle messages from WebSocket client"""
        try:
            data = json.loads(text_data)
            # You can add ping/pong or other client messages here
            if data.get("type") == "ping":
                await self.send(json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received: {text_data}")
        except Exception as e:
            logger.error(f"Error receiving message: {e}")

    async def broadcast_update(self, event):
        """Receive message from group and send to WebSocket"""
        try:
            await self.send(text_data=json.dumps(event["data"]))
        except Exception as e:
            logger.error(f"Error broadcasting update: {e}")


class GlobalContestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.group_name = "contest_global"

            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            await self.accept()
            await self.send(json.dumps({
                "message": "global connected"
            }))
            
            logger.info("Global WebSocket connected")
            
        except Exception as e:
            logger.error(f"Error connecting to global WebSocket: {e}")
            await self.close()

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            logger.info(f"Global WebSocket disconnected, code: {close_code}")
        except Exception as e:
            logger.error(f"Error disconnecting from global WebSocket: {e}")

    async def receive(self, text_data):
        """Handle messages from WebSocket client"""
        try:
            data = json.loads(text_data)
            if data.get("type") == "ping":
                await self.send(json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received: {text_data}")
        except Exception as e:
            logger.error(f"Error receiving message: {e}")

    async def broadcast_update(self, event):
        """Receive message from group and send to WebSocket"""
        try:
            await self.send(text_data=json.dumps(event["data"]))
        except Exception as e:
            logger.error(f"Error broadcasting global update: {e}")

            