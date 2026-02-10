"""
API Views for Difficulty Prediction
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .prediction_service import get_prediction_service
from .models import PredictionHistory
from datetime import datetime


@method_decorator(csrf_exempt, name='dispatch')
class PredictDifficultyAPIView(APIView):
    """
    POST /api/difficulty-prediction/predict/
    
    Predict difficulty for a single problem
    
    Request body:
    {
        "statement": "problem statement text",
        "tags": ["array", "dp"],
        "test_cases": [
            {"input": "...", "output": "..."},
            ...
        ],
        "title": "Problem Title" (optional)
    }
    
    Response:
    {
        "success": true,
        "prediction": {
            "difficulty": "Medium",
            "confidence": 0.85,
            "probabilities": {
                "Easy": 0.05,
                "Medium": 0.85,
                "Hard": 0.10
            },
            "model_name": "Random Forest"
        }
    }
    """
    
    def post(self, request):
        try:
            data = request.data
            
            # Validate input
            if 'statement' not in data:
                return Response({
                    'success': False,
                    'error': 'statement field is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get prediction service
            service = get_prediction_service()
            if service is None:
                return Response({
                    'success': False,
                    'error': 'Prediction model not available. Please train the model first.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # Prepare problem data
            problem_data = {
                'statement': data.get('statement', ''),
                'tags': data.get('tags', []),
                'test_cases': data.get('test_cases', [])
            }
            
            # Get prediction
            prediction = service.predict(problem_data)
            
            # Save to history (optional)
            try:
                PredictionHistory(
                    problem_title=data.get('title', 'Untitled'),
                    problem_statement=problem_data['statement'][:500],  # Truncate
                    problem_tags=problem_data['tags'],
                    predicted_difficulty=prediction['difficulty'],
                    confidence_score=prediction['confidence'],
                    prediction_details=prediction,
                    created_at=datetime.utcnow()
                ).save()
            except Exception as e:
                print(f"Warning: Could not save prediction history: {e}")
            
            return Response({
                'success': True,
                'prediction': prediction
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PredictBatchDifficultyAPIView(APIView):
    """
    POST /api/difficulty-prediction/predict-batch/
    
    Predict difficulty for multiple problems
    
    Request body:
    {
        "problems": [
            {
                "statement": "...",
                "tags": [...],
                "test_cases": [...]
            },
            ...
        ]
    }
    
    Response:
    {
        "success": true,
        "predictions": [
            {
                "difficulty": "Easy",
                "confidence": 0.92,
                ...
            },
            ...
        ]
    }
    """
    
    def post(self, request):
        try:
            data = request.data
            
            # Validate input
            if 'problems' not in data or not isinstance(data['problems'], list):
                return Response({
                    'success': False,
                    'error': 'problems field must be a list'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get prediction service
            service = get_prediction_service()
            if service is None:
                return Response({
                    'success': False,
                    'error': 'Prediction model not available'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # Get predictions
            predictions = service.predict_batch(data['problems'])
            
            return Response({
                'success': True,
                'predictions': predictions
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PredictionHistoryAPIView(APIView):
    """
    GET /api/difficulty-prediction/history/
    
    Get prediction history
    
    Query params:
    - limit: number of records (default: 50)
    - offset: offset for pagination (default: 0)
    
    Response:
    {
        "success": true,
        "history": [
            {
                "problem_title": "...",
                "predicted_difficulty": "Medium",
                "confidence": 0.85,
                "created_at": "2024-01-01T12:00:00"
            },
            ...
        ],
        "total": 123
    }
    """
    
    def get(self, request):
        try:
            limit = int(request.GET.get('limit', 50))
            offset = int(request.GET.get('offset', 0))
            
            # Get history
            history = PredictionHistory.objects().order_by('-created_at')[offset:offset+limit]
            total = PredictionHistory.objects.count()
            
            # Format response
            history_data = []
            for record in history:
                history_data.append({
                    'problem_title': record.problem_title,
                    'predicted_difficulty': record.predicted_difficulty,
                    'confidence': record.confidence_score,
                    'tags': record.problem_tags,
                    'created_at': record.created_at.isoformat() if record.created_at else None
                })
            
            return Response({
                'success': True,
                'history': history_data,
                'total': total
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ModelInfoAPIView(APIView):
    """
    GET /api/difficulty-prediction/model-info/
    
    Get information about the current model
    
    Response:
    {
        "success": true,
        "model_info": {
            "model_name": "Random Forest",
            "is_loaded": true,
            "feature_count": 20
        }
    }
    """
    
    def get(self, request):
        try:
            service = get_prediction_service()
            
            if service is None:
                return Response({
                    'success': True,
                    'model_info': {
                        'is_loaded': False,
                        'message': 'Model not trained yet'
                    }
                }, status=status.HTTP_200_OK)
            
            return Response({
                'success': True,
                'model_info': {
                    'model_name': service.model_name,
                    'is_loaded': True,
                    'feature_count': len(service.feature_names),
                    'features': service.feature_names
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
