from django.urls import path
from .views import CfTagStatsView, SignupView, LoginView, UserProfileView, AddPlatformProfileView, ContestHistoryView, ExternalSubmissionView

urlpatterns = [
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("profile/<str:user_id>/", UserProfileView.as_view(), name="user_profile"),
    path("profile/", UserProfileView.as_view(), name="current_user_profile"),
    path("platform/add/", AddPlatformProfileView.as_view(), name="add_platform"),
    path("contest-history/<str:user_id>/", ContestHistoryView.as_view(), name="contest_history_user"),
    path("contest-history/", ContestHistoryView.as_view(), name="contest_history"),
    path("external-submissions/", ExternalSubmissionView.as_view(), name="external_submissions"),
    path("cf-tag-stats/", CfTagStatsView.as_view(), name="cf_tag_stats")
]
