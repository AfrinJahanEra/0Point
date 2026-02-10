# zeropoint/urls.py
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
urlpatterns = [
    path("auth/", include("account.urls")),
    path("account/", include("account.urls")),
    path("", include("contest.urls")),
    path("", include("submission.urls")),
    path("", include("problem.urls")), 
    path("", include("testcase.urls")),
    path("", include("leaderboard.urls")),
    path("", include("announcement.urls")),
    path('admin/', admin.site.urls),
    path('api/executor/', include('executor.urls')),
    path('mock-interview/', include('mock_interview.urls')),
    path('videoconference/', include('videoconference.urls')),
    path('api/pdf/', include('pdf.urls')),
    path('api/ide/', include('ide.urls')),
    path("", include("crossPlatform.urls")),
    path("blog/", include("blog.urls")),
    path("", include("chatapp.urls")),  # Chat application URLs
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Additional pattern to serve media files directly via Django's built-in serve view
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {
            'document_root': settings.MEDIA_ROOT,
        }),

    ]

