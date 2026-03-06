# announcement/urls.py
from django.urls import path
from .views import (
    AnnouncementCreateAPIView,
    ContestAnnouncementsAPIView,
    AnnouncementDetailAPIView,
    AnnouncementUpdateAPIView,
    AnnouncementDeleteAPIView,
    TogglePinAnnouncementAPIView,
)

urlpatterns = [
    path('announcements/', AnnouncementCreateAPIView.as_view(), name='create-announcement'),
    path('announcements/<announcement_id>/', AnnouncementDetailAPIView.as_view(), name='announcement-detail'),
    path('announcements/<announcement_id>/update/', AnnouncementUpdateAPIView.as_view(), name='update-announcement'),
    path('announcements/<announcement_id>/delete/', AnnouncementDeleteAPIView.as_view(), name='delete-announcement'),
    path('announcements/<announcement_id>/toggle-pin/', TogglePinAnnouncementAPIView.as_view(), name='toggle-pin-announcement'),
    path('contests/<contest_id>/announcements/', ContestAnnouncementsAPIView.as_view(), name='contest-announcements'),
]