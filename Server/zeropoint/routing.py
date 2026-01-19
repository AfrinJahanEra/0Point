from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path, include
import contest.routing
import videoconference.routing
import ide.routing

# Combine all WebSocket URL patterns
websocket_urlpatterns = [
    *contest.routing.websocket_urlpatterns,
    *videoconference.routing.websocket_urlpatterns,
    *ide.routing.websocket_urlpatterns,
]

# For backward compatibility with the asgi.py file
combined_websocket_urlpatterns = URLRouter(websocket_urlpatterns)