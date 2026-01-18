# zeropoint/urls.py
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("auth/", include("account.urls")),
    path("", include("contest.urls")),
    path("", include("problem.urls")), 
    path("", include("testcase.urls")),
    path("", include("leaderboard.urls")),
    path("", include("announcement.urls")),
    path("", include("tutorial.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
