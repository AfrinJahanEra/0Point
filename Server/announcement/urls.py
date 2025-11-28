from django.urls import path
from .views import (
    AnnouncementCreateAPIView,
    AnnouncementListAPIView,
    AnnouncementUpdateAPIView,
    AnnouncementDeleteAPIView
)

urlpatterns = [
    path("announcements/", AnnouncementCreateAPIView.as_view()),
    path("contests/<str:contest_id>/announcements/", AnnouncementListAPIView.as_view()),
    path("announcements/<str:announcement_id>/", AnnouncementUpdateAPIView.as_view()),
    path("announcements/<str:announcement_id>/delete/", AnnouncementDeleteAPIView.as_view()),
]
