from django.urls import path, include
from django.contrib import admin

urlpatterns = [
    path("auth/", include("account.urls")),
    path("", include("contest.urls")),
    path("", include("problem.urls")),
    path("", include("testcase.urls")),
    path("", include("leaderboard.urls")),
    path("", include("announcement.urls")),
    path("", include("tutorial.urls")),
    path('admin/', admin.site.urls),
    path('api/', include('executor.urls')),
    path('mock-interview/', include('mock_interview.urls')),
    path('videoconference/', include('videoconference.urls')),
]