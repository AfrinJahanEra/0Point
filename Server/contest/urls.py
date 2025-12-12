# contest/urls.py
from django.urls import path, include

from submission.views import (
    SubmissionCreateAPIView,
    SubmissionListByProblemAPIView,
    SubmissionDetailAPIView,
    ContestSubmissionsAPIView,
    ContestProblemsListAPIView
)

from leaderboard.views import LeaderboardView, FreezeLeaderboardView, RecalculateLeaderboardView
from announcement.views import AnnouncementCreateAPIView, AnnouncementDeleteAPIView, AnnouncementDetailAPIView, AnnouncementUpdateAPIView
from .views import (
    ContestAnnouncementsAPIView,
    ContestListCreateAPIView,
    ContestDetailAPIView,
    ContestRegisterAPIView,
    MyContestRegistrationsAPIView,
    ContestFullCreateAPIView,
    ContestPublishAPIView,
    ContestUpdateAPIView,  # Import the new view
    ContestProblemsAPIView,
    ContestProblemDetailAPIView,
    UserProblemStatusAPIView,
    ContestProblemTutorialAPIView,  # Import the new view
    ContestEditorialAPIView,  # Import the new v,
)

# contest/urls.py
# contest/urls.py
from django.urls import path
from .views import (
    ContestAnnouncementsAPIView,
    ContestListCreateAPIView,
    ContestDetailAPIView,
    ContestRegisterAPIView,
    MyContestRegistrationsAPIView,
    ContestFullCreateAPIView,
    ContestPublishAPIView,
    ContestUpdateAPIView,
    ContestProblemsAPIView,
    ContestProblemDetailAPIView,
    UserProblemStatusAPIView,
    ContestProblemTutorialAPIView,
    ContestEditorialAPIView,
)

urlpatterns = [
    path('contests/', ContestListCreateAPIView.as_view()),
    path('contests/registrations/', MyContestRegistrationsAPIView.as_view()),
    path('contests/create-full/', ContestFullCreateAPIView.as_view(), name='create-full'),
    path('contests/<contest_id>/', ContestDetailAPIView.as_view()),
    path('contests/<contest_id>/register/', ContestRegisterAPIView.as_view()),
    path('contests/<contest_id>/publish/', ContestPublishAPIView.as_view(), name='publish-contest'),
    path('contests/<contest_id>/update/', ContestUpdateAPIView.as_view(), name='update-contest'),
    path('contests/<contest_id>/problems/', ContestProblemsAPIView.as_view(), name='contest-problems'),
    # IMPORTANT: Put the specific 'status' route BEFORE the generic problem_index route
    path('contests/<contest_id>/problems/status/', UserProblemStatusAPIView.as_view(), name='user-problem-status'),
    path('contests/<contest_id>/problems/<problem_index>/', ContestProblemDetailAPIView.as_view(), name='contest-problem-detail'),
    path('contests/<contest_id>/problems/<problem_index>/tutorial/', ContestProblemTutorialAPIView.as_view(), name='contest-problem-tutorial'),
    path('contests/<contest_id>/editorial/', ContestEditorialAPIView.as_view(), name='contest-editorial'),
    path('contests/<contest_id>/announcements/', ContestAnnouncementsAPIView.as_view(), name='contest-announcements'),
    path('announcements/create/', AnnouncementCreateAPIView.as_view(), name='announcement-create'),   
    path('contests/<str:contest_id>/leaderboard/', LeaderboardView.as_view()), 
    path('contests/<str:contest_id>/submissions/', ContestSubmissionsAPIView.as_view(), name='contest-submissions'),
    # Keep this for problem submissions:
    path('problems/<str:problem_id>/submissions/', SubmissionListByProblemAPIView.as_view(), name='problem-submissions'),
    path('contests/<str:contest_id>/problems/list/', ContestProblemsListAPIView.as_view(), name='contest-problems-list'),
    path('submissions/create/', SubmissionCreateAPIView.as_view(), name='submission-create'),
    path('contests/<str:contest_id>/editorial/', ContestEditorialAPIView.as_view()),
]