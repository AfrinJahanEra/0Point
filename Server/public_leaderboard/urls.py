# leaderboard/urls.py

from django.urls import path
from .views import GlobalLeaderboardView, LeaderboardMinimalView

urlpatterns = [
    path('leaderboard/', GlobalLeaderboardView.as_view(), name='leaderboard'),
    # In your urls.py
path('leaderboard/minimal/', LeaderboardMinimalView.as_view(), name='leaderboard-minimal'),
]
