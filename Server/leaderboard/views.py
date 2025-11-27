from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from contest.utils.auth import get_user_from_request
from contest.models import Contest
from .models import ContestLeaderboard, LeaderboardEntry
from .serializers import FreezeSerializer, RecalculateSerializer
from .services import calculate_leaderboard


class LeaderboardView(APIView):
    """
    GET /contests/<id>/leaderboard/
    """
    def get(self, request, contest_id):
        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=404)

        lb = LeaderboardEntry.objects(contest=contest).order_by("rank")

        results = []
        for e in lb:
            results.append({
                "user": e.user.name,
                "user_id": str(e.user.id),
                "rank": e.rank,
                "score": e.total_score,
                "penalty": e.total_penalty,
                "problem_results": e.problem_results,
                "is_frozen": e.is_frozen
            })

        return Response({"leaderboard": results})

class FreezeLeaderboardView(APIView):
    """
    PATCH /contests/<id>/leaderboard/freeze/
    """
    def patch(self, request, contest_id):
        user = get_user_from_request(request)
        if not user or user.role != "admin":
            return Response({"error": "Admin only"}, status=403)

        serializer = FreezeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=404)

        is_frozen = serializer.validated_data["is_frozen"]

        # MongoEngine version of get_or_create
        lb = ContestLeaderboard.objects(contest=contest).first()
        if not lb:
            lb = ContestLeaderboard(contest=contest)

        lb.is_frozen = is_frozen
        if is_frozen:
            lb.frozen_at = datetime.utcnow()

        lb.save()

        return Response({"message": f"Leaderboard {'frozen' if is_frozen else 'unfrozen'}"})


class RecalculateLeaderboardView(APIView):
    """
    POST /contests/<id>/leaderboard/recalculate/
    """
    def post(self, request, contest_id):
        user = get_user_from_request(request)
        if not user or user.role != "admin":
            return Response({"error": "Admin only"}, status=403)

        serializer = RecalculateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        apply_freeze = serializer.validated_data["apply_freeze"]

        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Not found"}, status=404)

        entries = calculate_leaderboard(contest, apply_freeze=apply_freeze)

        return Response({
            "message": "Leaderboard recalculated",
            "entries": len(entries)
        })
