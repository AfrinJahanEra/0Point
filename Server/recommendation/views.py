from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import jwt
from django.conf import settings
from account.models import Account
from .service import get_recommendations


class RecommendationView(APIView):
    """Fast endpoint - always < 100ms when cache exists"""
    def get(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return Response({"error": "Unauthorized"}, status=401)

        try:
            token = auth_header[7:]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except:
            return Response({"error": "Invalid token"}, status=401)

        try:
            data = get_recommendations(user_id, force_refresh=False)
            return Response({
                "success": True,
                **data
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class RefreshRecommendationView(APIView):
    """User clicks this when they want fresh AI plan (takes 3-8s)"""
    def post(self, request):
        # same auth code as above...
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return Response({"error": "Unauthorized"}, status=401)

        try:
            token = auth_header[7:]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
        except:
            return Response({"error": "Invalid token"}, status=401)

        try:
            data = get_recommendations(user_id, force_refresh=True)
            return Response({
                "success": True,
                "message": "Fresh AI recommendations generated",
                **data
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)