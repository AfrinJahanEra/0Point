# interview/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('api/sessions/create/', views.CreateSessionAPI.as_view(), name='create_session'),
    path('api/sessions/create-with-email/', views.CreateSessionWithEmailAPI.as_view(), name='create_session_with_email'),
    path('api/sessions/send-invitation/', views.SendSessionInvitationAPI.as_view(), name='send_session_invitation'),
    path('api/sessions/validate-invitation/', views.ValidateInvitationAPI.as_view(), name='validate_invitation'),
    path('api/sessions/use-invitation/', views.UseInvitationAPI.as_view(), name='use_invitation'),
    path('api/sessions/<str:session_id>/', views.GetSessionAPI.as_view(), name='get_session'),
    path('api/sessions/<str:session_id>/code/', views.UpdateCodeAPI.as_view(), name='update_code'),
    path('api/sessions/<str:session_id>/question/', views.UpdateQuestionAPI.as_view(), name='update_question'),
    path('api/sessions/<str:session_id>/timer/', views.UpdateTimerAPI.as_view(), name='update_timer'),
    path('api/sessions/active/', views.GetActiveSessionsAPI.as_view(), name='active_sessions'),
    path('api/health/', views.HealthCheckAPI.as_view(), name='health_check'),
    path('api/execute/', views.ExecuteCodeAPI.as_view(), name='execute_code'),
]