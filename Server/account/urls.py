#Server/account/urls.py
from django.urls import path
from .views import   CodeforcesCalendarView,LeetCodeCalendarView, CodeChefCalendarView, AtCoderCalendarView ,SignupView, LoginView, TagStatsView, UserProfileView, AddPlatformProfileView, ContestHistoryView, ExternalSubmissionView, VerdictStatsView
from recommendation.views import RecommendationView, RefreshRecommendationView

urlpatterns = [
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("profile/<str:user_id>/", UserProfileView.as_view(), name="user_profile"),
    path("profile/", UserProfileView.as_view(), name="current_user_profile"),
    path("platform/add/", AddPlatformProfileView.as_view(), name="add_platform"),
    path("contest-history/<str:user_id>/", ContestHistoryView.as_view(), name="contest_history_user"),
    path("contest-history/", ContestHistoryView.as_view(), name="contest_history"),
    path("external-submissions/", ExternalSubmissionView.as_view(), name="external_submissions"),
    path("tag-stats/", TagStatsView.as_view(), name="tag_stats"),
    path("verdict-stats/", VerdictStatsView.as_view(), name="verdict_stats"),
   
    path("leetcode-calendar/", LeetCodeCalendarView.as_view(), name="leetcode_calendar"),
    path("codechef-calendar/", CodeChefCalendarView.as_view(), name="codechef_calendar"),
    path("atcoder-calendar/", AtCoderCalendarView.as_view(), name="atcoder_calendar"),
    path("codeforces-calendar/", CodeforcesCalendarView.as_view(), name="codeforces_calendar"),

    

    path("recommend-problems/", RecommendationView.as_view(), name="recommend_problems"),
    path("refresh-recommendations/", RefreshRecommendationView.as_view(), name="refresh_recommendations"),
]
