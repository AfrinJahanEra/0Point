from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.AdminLoginView.as_view(), name='admin-login'),
    path('dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('users/', views.AdminUsersView.as_view(), name='admin-users'),
    path('users/<str:user_id>/', views.AdminUsersView.as_view(), name='admin-user-delete'),
    path('banned-users/', views.AdminBannedAccountsView.as_view(), name='admin-banned-users'),
    path('blogs/', views.AdminBlogsView.as_view(), name='admin-blogs'),
    path('blogs/<str:blog_id>/', views.AdminBlogsView.as_view(), name='admin-blog-delete'),
    path('contests/', views.AdminContestsView.as_view(), name='admin-contests'),
    path('contests/<str:contest_id>/', views.AdminContestsView.as_view(), name='admin-contest-delete'),
    path('problems/', views.AdminProblemsView.as_view(), name='admin-problems'),
    path('problems/<str:problem_id>/', views.AdminProblemsView.as_view(), name='admin-problem-delete'),
    path('submissions/', views.AdminSubmissionsView.as_view(), name='admin-submissions'),
    path('submissions/<str:submission_id>/', views.AdminSubmissionsView.as_view(), name='admin-submission-delete'),
]