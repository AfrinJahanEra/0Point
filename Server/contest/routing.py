from django.urls import path
from .consumers import ContestConsumer, GlobalContestConsumer

websocket_urlpatterns = [
    path("ws/contest/<str:contest_id>/", ContestConsumer.as_asgi()),
    path("ws/contest/global/", GlobalContestConsumer.as_asgi()),
]
