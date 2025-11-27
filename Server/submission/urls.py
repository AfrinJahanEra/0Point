from django.urls import path
from .views import (
    SubmissionCreateAPIView,
    SubmissionListByProblemAPIView,
    SubmissionDetailAPIView,
    SubmissionVerdictUpdateAPIView
)

urlpatterns = [
    path("submissions/", SubmissionCreateAPIView.as_view(), name="submit"),
    path("problems/<str:problem_id>/submissions/", SubmissionListByProblemAPIView.as_view()),
    path("submissions/<str:submission_id>/", SubmissionDetailAPIView.as_view()),
    path("submissions/<str:submission_id>/verdict/", SubmissionVerdictUpdateAPIView.as_view()),
]
