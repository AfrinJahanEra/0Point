from django.urls import path
from . import views

urlpatterns = [
    path('api/sessions/create/', views.CreateSessionAPI.as_view(), name='create_session'),
    path('api/sessions/<str:session_id>/', views.GetSessionAPI.as_view(), name='get_session'),
    path('api/sessions/<str:session_id>/code/', views.UpdateCodeAPI.as_view(), name='update_code'),
    path('api/sessions/<str:session_id>/question/', views.UpdateQuestionAPI.as_view(), name='update_question'),
    path('api/sessions/<str:session_id>/timer/', views.UpdateTimerAPI.as_view(), name='update_timer'),
    path('api/sessions/active/', views.GetActiveSessionsAPI.as_view(), name='active_sessions'),
    path('api/health/', views.HealthCheckAPI.as_view(), name='health_check'),
]