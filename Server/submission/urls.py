# submission/urls.py
from django.urls import path
from .views import (
    UserSubmissionsAPIView,
    SubmissionDetailAPIView,
)

urlpatterns = [
    path('submissions/user/', UserSubmissionsAPIView.as_view(), name='user-submissions'),
    path('submissions/<str:submission_id>/', SubmissionDetailAPIView.as_view(), name='submission-detail'),
]
