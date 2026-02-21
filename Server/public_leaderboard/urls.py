# leaderboard/urls.py

from django.urls import path
from .views import GlobalLeaderboardView

urlpatterns = [
    path('leaderboard/', GlobalLeaderboardView.as_view(), name='leaderboard'),
]
