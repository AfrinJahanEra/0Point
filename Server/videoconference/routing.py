from django.urls import re_path
from .consumers import VideoConsumer

websocket_urlpatterns = [
    re_path(r'ws/video/(?P<session_id>[\w-]+)/$', VideoConsumer.as_asgi()),
]