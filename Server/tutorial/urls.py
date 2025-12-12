# tutorial/urls.py (create this file)
from django.urls import path
from .views import (
    TutorialListCreateAPIView,
    TutorialDetailAPIView,
    TutorialBulkUpdateAPIView
)

urlpatterns = [
    path('tutorials/<contest_id>/', TutorialListCreateAPIView.as_view(), name='tutorial-list-create'),
    path('tutorials/<contest_id>/bulk/', TutorialBulkUpdateAPIView.as_view(), name='tutorial-bulk-update'),
    path('tutorials/<contest_id>/<problem_index>/', TutorialDetailAPIView.as_view(), name='tutorial-detail'),
]