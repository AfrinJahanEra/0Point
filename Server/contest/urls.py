# apps/contest/urls.py
from django.urls import path
from .views import (
    ContestListCreateAPIView,
    ContestDetailAPIView,
    ContestRegisterAPIView,
    ContestUpdateAPIView
)

urlpatterns = [
    path("contests/", ContestListCreateAPIView.as_view()),
    path("contests/<str:contest_id>/", ContestDetailAPIView.as_view()),
    path("contests/<str:contest_id>/register/", ContestRegisterAPIView.as_view()),
    path("contests/<str:contest_id>/update/", ContestUpdateAPIView.as_view()),
]
