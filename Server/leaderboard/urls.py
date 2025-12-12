from django.urls import path
from .views import (
    LeaderboardView,
    FreezeLeaderboardView,
    RecalculateLeaderboardView
)

urlpatterns = [
    path("contests/<str:contest_id>/leaderboard/", LeaderboardView.as_view()),
    path("contests/<str:contest_id>/leaderboard/freeze/", FreezeLeaderboardView.as_view()),
    path("contests/<str:contest_id>/leaderboard/recalculate/", RecalculateLeaderboardView.as_view()),
]
