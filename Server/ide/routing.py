# ide/routing.py
from django.urls import re_path
from .consumers import CodeConsumer

websocket_urlpatterns = [
    re_path(r'ws/code/(?P<session_id>[\w-]+)/$', CodeConsumer.as_asgi()),
]