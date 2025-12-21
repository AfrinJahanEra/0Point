# interview/urls.py - UPDATED VERSION
from django.urls import path
from . import views

urlpatterns = [
    # NEW ENDPOINTS FOR REAL-TIME FEATURES
    path('api/sessions/status/', views.SessionStatusAPI.as_view(), name='session_status'),
    path('api/sessions/active/', views.ActiveSessionsAPI.as_view(), name='active_sessions'),
    path('api/sessions/join/', views.JoinSessionAPI.as_view(), name='join_session'),
    
    # Document management
    path('api/sessions/document/', views.SessionDocumentAPI.as_view(), name='session_document'),
    path('api/sessions/code/', views.SessionCodeAPI.as_view(), name='session_code'),
]