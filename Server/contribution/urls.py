# contribution/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Simple ranking endpoint
    path('contributions/ranking/', views.ContributionRankingAPIView.as_view(), name='contribution-ranking'),
]