import os
import django
import asyncio
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "zeropoint.settings")
django.setup()

from .routing import websocket_urlpatterns

class GracefulShutdownMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        try:
            return await self.app(scope, receive, send)
        except RuntimeError as e:
            if 'cannot schedule new futures after interpreter shutdown' in str(e):
                # Silently ignore shutdown errors
                return
            raise

application = ProtocolTypeRouter({
    "http": GracefulShutdownMiddleware(get_asgi_application()),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})