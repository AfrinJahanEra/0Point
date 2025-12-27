# contest/urls.py
from django.urls import path, include

from submission.views import (
    # SubmissionCreateAPIView,
    SubmissionListByProblemAPIView,
    SubmissionDetailAPIView,
    ContestSubmissionsAPIView,
    ContestProblemsListAPIView,
    ProblemStatisticsAPIView,
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
    ContestPublishTestAPIView,
)

from compiler.views import (
    CodeExecuteAPIView,
)

from discussion.views import (
    DiscussionListCreateAPIView,
    DiscussionDetailAPIView,
    DiscussionVoteAPIView,
    DiscussionSaveAPIView,
    CommentListCreateAPIView,
    CommentDetailAPIView,
    MySavedDiscussionsAPIView,
)

from clarification.views import (
    ClarificationListCreateAPIView,
    ClarificationDetailAPIView,
    ClarificationStatusUpdateAPIView,
    ClarificationReplyAPIView,
    ClarificationWatchAPIView,
    ClarificationVoteAPIView,
    MyClarificationsAPIView,
    OrganizerClarificationsAPIView,
)

from compiler.views import (
    CodeExecuteAPIView,
    ContestProblemExecuteAPIView,
)

from virtual.views import (
    VirtualContestStartAPIView,
    VirtualContestSubmitAPIView,
    VirtualContestDetailAPIView,
    VirtualContestProblemsAPIView,
    UserVirtualContestsAPIView,
    VirtualContestLeaderboardAPIView,
    VirtualContestProblemDetailAPIView,
)

from testcontest.views import (
    TestContestCreateAPIView,
    TestContestDetailAPIView,
    TestContestRegisterAPIView,
    TestContestProblemsAPIView,
    TestContestProblemDetailAPIView,
    UserTestContestsAPIView,
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
    path('contests/<str:contest_id>/standings/', LeaderboardView.as_view()), 
    path('contests/<str:contest_id>/submissions/', ContestSubmissionsAPIView.as_view(), name='contest-submissions'),
    # Keep this for problem submissions:
    path('problems/<str:problem_id>/submissions/', SubmissionListByProblemAPIView.as_view(), name='problem-submissions'),
    path('contests/<str:contest_id>/problems/list/', ContestProblemsListAPIView.as_view(), name='contest-problems-list'),
    # path('submissions/create/', SubmissionCreateAPIView.as_view(), name='submission-create'),
    path('contests/<str:contest_id>/editorial/', ContestEditorialAPIView.as_view()),
    # path('contests/<str:contest_id>/execute/', CodeExecuteAPIView.as_view(), name='code-execute'),

    # Discussion endpoints
    path('contests/<contest_id>/discussions/', DiscussionListCreateAPIView.as_view(), name='contest-discussions'),
    path('contests/<contest_id>/discussions/<discussion_id>/', DiscussionDetailAPIView.as_view(), name='discussion-detail'),
    path('contests/<contest_id>/discussions/<discussion_id>/vote/', DiscussionVoteAPIView.as_view(), name='discussion-vote'),
    path('contests/<contest_id>/discussions/<discussion_id>/save/', DiscussionSaveAPIView.as_view(), name='discussion-save'),
    # Discussion Comment endpoints
    path('contests/<contest_id>/discussions/<discussion_id>/comments/', CommentListCreateAPIView.as_view(), name='discussion-comments'),
    path('contests/<contest_id>/discussions/<discussion_id>/comments/<comment_id>/', CommentDetailAPIView.as_view(), name='comment-detail'),
    # User saved discussions
    path('discussions/saved/', MySavedDiscussionsAPIView.as_view(), name='my-saved-discussions'),


    # Contest clarification endpoints
    path('contests/<contest_id>/clarifications/', ClarificationListCreateAPIView.as_view(), name='contest-clarifications'),
    path('contests/<contest_id>/clarifications/<clarification_id>/', ClarificationDetailAPIView.as_view(), name='clarification-detail'),
    
    path('contests/<contest_id>/clarifications/<clarification_id>/status/', ClarificationStatusUpdateAPIView.as_view(), name='clarification-status'),
    
    path('contests/<contest_id>/clarifications/<clarification_id>/reply/', ClarificationReplyAPIView.as_view(), name='clarification-reply'),
    
    path('contests/<contest_id>/clarifications/<clarification_id>/reply/<reply_id>/', ClarificationReplyAPIView.as_view(), name='clarification-reply-edit'),
    
    path('contests/<contest_id>/clarifications/<clarification_id>/watch/', ClarificationWatchAPIView.as_view(), name='clarification-watch'),
    
    path('contests/<contest_id>/clarifications/<clarification_id>/vote/', ClarificationVoteAPIView.as_view(), name='clarification-vote'),
    
    # Organizer-specific endpoints
    path('contests/<contest_id>/clarifications/organizer/', OrganizerClarificationsAPIView.as_view(), name='organizer-clarifications'),
    
    # User clarifications
    path('clarifications/my/', MyClarificationsAPIView.as_view(), name='my-clarifications'),

    # Stats
    path('contests/<str:contest_id>/problems/<str:problem_index>/stats/', ProblemStatisticsAPIView.as_view(), name='problem-statistics'),

    # Keep the compiler endpoints
    path('contests/<str:contest_id>/execute/', CodeExecuteAPIView.as_view(), name='code-execute'),
    path('contests/<str:contest_id>/problems/<str:problem_index>/execute/', ContestProblemExecuteAPIView.as_view(), name='contest-problem-execute'),

    # virtual URLs - FIXED VERSION
    path('contests/<str:contest_id>/virtual-start/', VirtualContestStartAPIView.as_view(), name='virtual-contest-start'),
    path('my-virtual/', UserVirtualContestsAPIView.as_view(), name='user-virtual-contests'),
    path('contests/<str:contest_id>/virtual/<str:virtual_contest_id>/', VirtualContestDetailAPIView.as_view(), name='virtual-contest-detail'),
    path('contests/<str:contest_id>/virtual/<str:virtual_contest_id>/submit/', VirtualContestSubmitAPIView.as_view(), name='virtual-contest-submit'),
    path('contests/<str:contest_id>/virtual/<str:virtual_contest_id>/problems/', VirtualContestProblemsAPIView.as_view(), name='virtual-contest-problems'),
    path('contests/<str:contest_id>/virtual/<str:virtual_contest_id>/problems/<str:problem_index>/', VirtualContestProblemDetailAPIView.as_view(), name='virtual-contest-problem-detail'),

    # Test contest URLs
    path('contests/<contest_id>/publish-test/', ContestPublishTestAPIView.as_view(), name='publish-test-contest'),

    # Get user's accessible test contests
    path('test-contests/my/', UserTestContestsAPIView.as_view(), name='my-test-contests'),
    
    # Test contest operations
    path('test-contests/<test_contest_id>/', TestContestDetailAPIView.as_view(), name='test-contest-detail'),
    path('test-contests/<test_contest_id>/register/', TestContestRegisterAPIView.as_view(), name='test-contest-register'),
    path('test-contests/<test_contest_id>/problems/', TestContestProblemsAPIView.as_view(), name='test-contest-problems'),
    path('test-contests/<test_contest_id>/problems/<problem_index>/', TestContestProblemDetailAPIView.as_view(), name='test-contest-problem-detail'),
]