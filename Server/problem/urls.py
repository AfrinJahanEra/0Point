from django.urls import path
from .views import (
    ProblemCreateAPIView, ProblemListByContestAPIView,
    ProblemDetailAPIView, ProblemUpdateAPIView, ProblemDeleteAPIView
)

urlpatterns = [
    path("problems/", ProblemCreateAPIView.as_view(), name="problem-create"),
    path("contests/<str:contest_id>/problems/", ProblemListByContestAPIView.as_view(), name="contest-problems"),
    path("problems/<str:problem_id>/", ProblemDetailAPIView.as_view(), name="problem-detail"),
    path("problems/<str:problem_id>/update/", ProblemUpdateAPIView.as_view(), name="problem-update"),
    path("problems/<str:problem_id>/delete/", ProblemDeleteAPIView.as_view(), name="problem-delete"),
]
