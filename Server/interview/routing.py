# interview/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # WebSocket endpoint for real-time collaboration
    re_path(r'ws/interview/(?P<session_id>\w+)/$', consumers.InterviewConsumer.as_asgi()),
    
    # WebSocket endpoint for WebRTC signaling (Optional)
    # re_path(r'ws/webrtc/(?P<session_id>\w+)/$', consumers.WebRTCConsumer.as_asgi()),
]