from django.urls import path
from .views import (
    SignupView,
    LoginView,
    UserProfileView,
    AddPlatformProfileView,
    ContestHistoryView,
    ExternalSubmissionView,
    TagStatsView,
    UpdateProfileView
)

urlpatterns = [
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("profile/update/", UpdateProfileView.as_view(), name="update_profile"),
    path("profile/<str:user_id>/", UserProfileView.as_view(), name="user_profile"),
    path("profile/", UserProfileView.as_view(), name="current_user_profile"),
    path("platform/add/", AddPlatformProfileView.as_view(), name="add_platform"),
    path("contest-history/<str:user_id>/", ContestHistoryView.as_view(), name="contest_history_user"),
    path("contest-history/", ContestHistoryView.as_view(), name="contest_history"),
    path("external-submissions/", ExternalSubmissionView.as_view(), name="external_submissions"),
    path("tag-stats/", TagStatsView.as_view(), name="tag_stats"),
]