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
    """Suppress RuntimeErrors that occur when Daphne reloads while a request
    or WebSocket handshake is still in flight on Python 3.13.
    Covers both HTTP and WebSocket scopes.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        try:
            return await self.app(scope, receive, send)
        except RuntimeError as e:
            msg = str(e).lower()
            # Catch all shutdown-related futures errors regardless of exact wording
            if 'cannot schedule new futures' in msg or 'interpreter shutdown' in msg:
                return
            raise
        except Exception as e:
            # Also suppress asyncio CancelledError noise on reload
            if isinstance(e, asyncio.CancelledError):
                return
            raise


application = ProtocolTypeRouter({
    "http": GracefulShutdownMiddleware(get_asgi_application()),
    "websocket": GracefulShutdownMiddleware(
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        )
    ),
})