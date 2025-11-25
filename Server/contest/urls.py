# apps/contest/urls.py
from django.urls import path
from .views import ContestListCreateAPIView, ContestDetailAPIView, ContestRegisterAPIView

urlpatterns = [
    path("contests/", ContestListCreateAPIView.as_view(), name="contest-list-create"),
    path("contests/<str:contest_id>/", ContestDetailAPIView.as_view(), name="contest-detail"),
    path("contests/<str:contest_id>/register/", ContestRegisterAPIView.as_view(), name="contest-register"),
]
