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
    ContestUpdateAPIView,
    ContestProblemsAPIView,
    ContestProblemDetailAPIView,
    UserProblemStatusAPIView,
    ContestProblemTutorialAPIView,
    ContestEditorialAPIView,
    ContestPublishTestAPIView,
    ContestRecordingStatusAPIView,
    StartContestRecordingAPIView,
    StopContestRecordingAPIView,
    UploadContestRecordingAPIView,
    ContestRecordingSettingsAPIView,
    ContestRecordingsListAPIView,
    ContestUserRecordingsAPIView,
    UpcomingContestListCreateAPIView,
    PastContestsListCreateView,
    SoonestUpcomingContestView,
    LiveContestsView,
    HomeDashboardAPIView,
    ContestsDashboardAPIView,
    ContestInsideAPIView,
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
    TestContestProblemsAPIView,
    TestContestProblemDetailAPIView,
    UserTestContestsAPIView,
    TestContestSubmissionCreateAPIView,
    TestContestExecuteAPIView,
    TestContestProblemExecuteAPIView,
    TestContestSubmissionsAPIView,
    TestContestSubmissionDetailAPIView,
    TestContestLeaderboardAPIView,
)

urlpatterns = [
    # In your urls.py - CORRECT ORDER (specific first, generic last)

# Home dashboard - unified endpoint for faster loading
path('home/dashboard/', HomeDashboardAPIView.as_view(), name='home-dashboard'),

# Contests dashboard - unified endpoint for Contests page
path('contests/dashboard/', ContestsDashboardAPIView.as_view(), name='contests-dashboard'),

# FIRST: All specific named routes without parameters
path('contests/soonest/', SoonestUpcomingContestView.as_view(), name='soonest-upcoming-contest'),
path('contests/upcoming/', UpcomingContestListCreateAPIView.as_view(), name='upcoming-contests'),
path('contests/past/', PastContestsListCreateView.as_view(), name='past-contests'),
path('contests/live/', LiveContestsView.as_view(), name='live-contests'),
path('contests/registrations/', MyContestRegistrationsAPIView.as_view()),
path('contests/create-full/', ContestFullCreateAPIView.as_view(), name='create-full'),

# NEXT: Routes with specific action names (like problems/status)
path('contests/<contest_id>/inside/', ContestInsideAPIView.as_view(), name='contest-inside'),
path('contests/<contest_id>/problems/status/', UserProblemStatusAPIView.as_view(), name='user-problem-status'),
path('contests/<contest_id>/problems/list/', ContestProblemsListAPIView.as_view(), name='contest-problems-list'),
path('contests/<contest_id>/problems/<problem_index>/', ContestProblemDetailAPIView.as_view(), name='contest-problem-detail'),
path('contests/<contest_id>/problems/<problem_index>/tutorial/', ContestProblemTutorialAPIView.as_view(), name='contest-problem-tutorial'),
path('contests/<contest_id>/editorial/', ContestEditorialAPIView.as_view(), name='contest-editorial'),
path('contests/<contest_id>/announcements/', ContestAnnouncementsAPIView.as_view(), name='contest-announcements'),
path('contests/<contest_id>/standings/', LeaderboardView.as_view()), 
path('contests/<contest_id>/submissions/', ContestSubmissionsAPIView.as_view(), name='contest-submissions'),
path('contests/<contest_id>/problems/', ContestProblemsAPIView.as_view(), name='contest-problems'),

# THEN: Routes with simple parameters (register, publish, update)
path('contests/<contest_id>/register/', ContestRegisterAPIView.as_view()),
path('contests/<contest_id>/publish/', ContestPublishAPIView.as_view(), name='publish-contest'),
path('contests/<contest_id>/update/', ContestUpdateAPIView.as_view(), name='update-contest'),

# LAST: The most generic route - this catches ANY contest_id
path('contests/<contest_id>/', ContestDetailAPIView.as_view()),

# FINALLY: The base list route (this is fine at the end)
path('contests/', ContestListCreateAPIView.as_view()),

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
    path('contests/<str:contest_id>/problems/<str:problem_index>/run/', CodeExecuteAPIView.as_view(), name='code-run'),
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
    path('test-contests/<test_contest_id>/problems/', TestContestProblemsAPIView.as_view(), name='test-contest-problems'),
    path('test-contests/<test_contest_id>/problems/<problem_index>/', TestContestProblemDetailAPIView.as_view(), name='test-contest-problem-detail'),

    # Test contest submission endpoints
    path('test-contests/submit/', TestContestSubmissionCreateAPIView.as_view(), name='test-contest-submit'),
    path('test-contests/<str:test_contest_id>/problems/<str:problem_index>/run/', TestContestExecuteAPIView.as_view(), name='test-contest-execute'),
    path('test-contests/<str:test_contest_id>/problems/<str:problem_index>/execute/', TestContestProblemExecuteAPIView.as_view(), name='test-contest-problem-execute'),
    path('test-contests/<str:test_contest_id>/submissions/', TestContestSubmissionsAPIView.as_view(), name='test-contest-submissions'),
    path('test-contests/<str:test_contest_id>/submissions/<str:submission_id>/', TestContestSubmissionDetailAPIView.as_view(), name='test-contest-submission-detail'),

    path('test-contests/<str:test_contest_id>/standings/', TestContestLeaderboardAPIView.as_view(), name='test-contest-standings'),


    path('contests/<contest_id>/recording/status/', ContestRecordingStatusAPIView.as_view(), name='contest-recording-status'),
    path('contests/<contest_id>/recording/start/', StartContestRecordingAPIView.as_view(), name='start-contest-recording'),
    path('contests/<contest_id>/recording/<recording_id>/stop/', StopContestRecordingAPIView.as_view(), name='stop-contest-recording'),
    path('contests/<contest_id>/recording/<recording_id>/upload/', UploadContestRecordingAPIView.as_view(), name='upload-contest-recording'),
    path('admin/contests/<contest_id>/recording-settings/', ContestRecordingSettingsAPIView.as_view(), name='contest-recording-settings'),
    path('contests/<contest_id>/recordings/', ContestRecordingsListAPIView.as_view(), name='contest-recordings-list'),
    path('contests/<contest_id>/recordings/user/<user_id>/', ContestUserRecordingsAPIView.as_view(), name='contest-user-recordings'),
]