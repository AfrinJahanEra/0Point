# apps/contest/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
from mongoengine.errors import ValidationError as MEValidationError
from .models import Contest, ContestProblem, ContestRegistration
from .serializers import ContestCreateSerializer, ContestRegistrationSerializer
from .utils.auth import get_user_from_request
from account.models import Account  # your existing Account document

class ContestListCreateAPIView(APIView):
    """
    GET: list contests
    POST: create contest (creator must have rating >= 1500 if rating field exists on Account)
    """
    def get(self, request):
        contests = Contest.objects.order_by("-start_time").limit(200)
        data = []
        for c in contests:
            data.append({
                "id": str(c.id),
                "title": c.title,
                "description": c.description,
                "start_time": c.start_time.isoformat() if c.start_time else None,
                "duration_minutes": c.duration,
                "type": c.type,
                "platform": c.platform,
                "created_by": str(c.created_by.id) if c.created_by else None,
                "is_live_now": c.is_live_now,
            })
        return Response({"contests": data})

    def post(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = ContestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Check creator rating if available
        rating = getattr(user, "rating", None)
        if rating is not None:
            try:
                rating_val = int(rating)
            except Exception:
                rating_val = None
            if rating_val is not None and rating_val < 1500:
                return Response({"error": "You must have rating >= 1500 to create contest"}, status=status.HTTP_403_FORBIDDEN)

        # If rating not present, allow but include warning
        contest_obj = serializer.create(serializer.validated_data)
        contest_obj.created_by = user
        try:
            contest_obj.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        resp = {
            "message": "Contest created",
            "contest": {
                "id": str(contest_obj.id),
                "title": contest_obj.title,
            }
        }
        if getattr(user, "rating", None) is None:
            resp["warning"] = "Creator Account has no 'rating' field; rating check skipped."

        return Response(resp, status=status.HTTP_201_CREATED)


class ContestDetailAPIView(APIView):
    def get(self, request, contest_id):
        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)
        resp = {
            "id": str(contest.id),
            "title": contest.title,
            "description": contest.description,
            "start_time": contest.start_time.isoformat() if contest.start_time else None,
            "duration_minutes": contest.duration,
            "type": contest.type,
            "platform": contest.platform,
            "created_by": str(contest.created_by.id) if contest.created_by else None,
            "is_live_now": contest.is_live_now,
        }
        # Get problems (if any)
        problems = ContestProblem.objects(contest=contest).order_by("index")
        resp["problems"] = [{"problem_id": p.problem_id, "index": p.index} for p in problems]
        # Announcements: optional, contest may have zero announcements
        try:
            from announcement.models import Announcement
            resp["num_announcements"] = Announcement.objects(contest=contest).count()
        except ImportError:
            # announcement app not installed
            resp["num_announcements"] = 0
        # Registrations: always safe to count
        resp["num_registrations"] = ContestRegistration.objects(contest=contest).count()
        return Response(resp)


class ContestRegisterAPIView(APIView):
    """
    POST /contests/<id>/register/
    For individual contests: registers the authenticated user.
    For team contests: expects 'team_id' in body (you can change to reference your Team document).
    """
    def post(self, request, contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ContestRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # If contest is individual
        if contest.type == "individual":
            # Check if already registered
            existing = ContestRegistration.objects(contest=contest, user_id=user).first()
            if existing:
                return Response({"message": "Already registered"}, status=status.HTTP_200_OK)

            reg = ContestRegistration(contest=contest, user_id=user)
            reg.save()
            return Response({"message": "Registered successfully", "registration_id": str(reg.id)})

        # If contest is team
        team_id = serializer.validated_data.get("team_id")
        if not team_id:
            return Response({"error": "team_id required for team contests"}, status=status.HTTP_400_BAD_REQUEST)

        # NOTE: you might want to validate team existence and that the user is a member.
        existing = ContestRegistration.objects(contest=contest, team_id=team_id).first()
        if existing:
            return Response({"message": "Team already registered"}, status=status.HTTP_200_OK)

        reg = ContestRegistration(contest=contest, team_id=team_id)
        reg.save()
        return Response({"message": "Team registered successfully", "registration_id": str(reg.id)})
