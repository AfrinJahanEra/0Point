"""
URL routing for Difficulty Prediction API
"""

from django.urls import path
from .views import (
    PredictDifficultyAPIView,
    PredictBatchDifficultyAPIView,
    PredictionHistoryAPIView,
    ModelInfoAPIView
)

urlpatterns = [
    # Prediction endpoints
    path('predict/', PredictDifficultyAPIView.as_view(), name='predict-difficulty'),
    path('predict-batch/', PredictBatchDifficultyAPIView.as_view(), name='predict-difficulty-batch'),
    
    # History and info
    path('history/', PredictionHistoryAPIView.as_view(), name='prediction-history'),
    path('model-info/', ModelInfoAPIView.as_view(), name='model-info'),
]
