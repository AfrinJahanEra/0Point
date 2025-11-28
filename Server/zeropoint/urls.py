# zeropoint/urls.py
from django.urls import path, include

urlpatterns = [
    path("auth/", include("account.urls")),
    path("", include("contest.urls")),
    path("", include("problem.urls")), 
    path("", include("testcase.urls")),
    path("", include("submission.urls")),
    path("", include("leaderboard.urls")),
    path("", include("announcement.urls")),
    path("", include("tutorial.urls")),
]
