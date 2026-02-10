from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('login/', views.AdminLoginView.as_view(), name='admin-login'),
    
    # Dashboard
    path('dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    
    # Users Management
    path('users/', views.AdminUsersView.as_view(), name='admin-users'),
    path('users/<str:user_id>/', views.AdminUsersView.as_view(), name='admin-user-delete'),
    path('banned-users/', views.AdminBannedAccountsView.as_view(), name='admin-banned-users'),
    
    # Blogs Management
    path('blogs/', views.AdminBlogsView.as_view(), name='admin-blogs'),
    path('blogs/<str:blog_id>/', views.AdminBlogsView.as_view(), name='admin-blog-delete'),
    path('blog-comments/', views.AdminBlogCommentsView.as_view(), name='admin-blog-comments'),
    path('blog-comments/<str:comment_id>/', views.AdminBlogCommentsView.as_view(), name='admin-blog-comment-delete'),
    
    # Contests Management
    path('contests/', views.AdminContestsView.as_view(), name='admin-contests'),
    path('contests/<str:contest_id>/', views.AdminContestsView.as_view(), name='admin-contest-delete'),
    path('test-contests/', views.AdminTestContestsView.as_view(), name='admin-test-contests'),
    path('test-contests/<str:test_contest_id>/', views.AdminTestContestsView.as_view(), name='admin-test-contest-delete'),
    path('virtual-contests/', views.AdminVirtualContestsView.as_view(), name='admin-virtual-contests'),
    path('virtual-contests/<str:virtual_contest_id>/', views.AdminVirtualContestsView.as_view(), name='admin-virtual-contest-delete'),
    
    # Problems Management
    path('problems/', views.AdminProblemsView.as_view(), name='admin-problems'),
    path('problems/<str:problem_id>/', views.AdminProblemsView.as_view(), name='admin-problem-delete'),
    
    # Submissions Management
    path('submissions/', views.AdminSubmissionsView.as_view(), name='admin-submissions'),
    path('submissions/<str:submission_id>/', views.AdminSubmissionsView.as_view(), name='admin-submission-delete'),
    
    # Announcements Management
    path('announcements/', views.AdminAnnouncementsView.as_view(), name='admin-announcements'),
    path('announcements/<str:announcement_id>/', views.AdminAnnouncementsView.as_view(), name='admin-announcement-delete'),
    
    # Tutorials Management
    path('tutorials/', views.AdminTutorialsView.as_view(), name='admin-tutorials'),
    path('tutorials/<str:tutorial_id>/', views.AdminTutorialsView.as_view(), name='admin-tutorial-delete'),
]