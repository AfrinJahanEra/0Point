from django.urls import path
from . import views

urlpatterns = [
    path("chat/", views.chat_api),
    path("chat/sessions/", views.chat_sessions, name="chat_sessions"),
]
