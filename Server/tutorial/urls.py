from django.urls import path
from .views import (
    TutorialCreateAPIView,
    TutorialListByProblemAPIView,
    TutorialDetailAPIView
)

urlpatterns = [
    path("tutorials/", TutorialCreateAPIView.as_view()),
    path("problems/<str:problem_id>/tutorials/", TutorialListByProblemAPIView.as_view()),
    path("tutorials/<str:tutorial_id>/", TutorialDetailAPIView.as_view()),
]
