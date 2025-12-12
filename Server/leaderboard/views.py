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
        from datetime import datetime
        
        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=404)

        # Get contest status from the contest object
        contest_status = contest.status  # This should be "past", "live", or "upcoming"
        
        # Get current user
        current_user = get_user_from_request(request)
        current_user_id = str(current_user.id) if current_user else None

        lb = LeaderboardEntry.objects(contest=contest).order_by("rank")

        results = []
        for e in lb:
            # Check if this is the current user
            is_current_user = current_user_id == str(e.user.id) if current_user_id else False
            
            # Get user details
            user = e.user
            
            # Format problem status for the frontend
            # Create an array for all problems A-F (assuming 6 problems)
            submissions = []
            problems = ['A', 'B', 'C', 'D', 'E', 'F']
            
            for problem in problems:
                problem_data = e.problem_results.get(problem) if e.problem_results else None
                status = "NA"  # Not Attempted
                
                if problem_data:
                    if problem_data.get("verdict") == "ACCEPTED":
                        status = "AC"
                    elif problem_data.get("tries", 0) > 0:
                        status = "WA"
                
                submissions.append({
                    "problem": problem,
                    "status": status
                })
            
            # Count solved problems
            problems_solved = 0
            if e.problem_results:
                for problem_data in e.problem_results.values():
                    if problem_data.get("verdict") == "ACCEPTED":
                        problems_solved += 1

            results.append({
                "rank": e.rank,
                "username": user.username if hasattr(user, 'username') and user.username else user.name,  # Use name as fallback
                "name": user.name if hasattr(user, 'name') else "Anonymous",
                "country": user.country if hasattr(user, 'country') else "Unknown",
                "institution": user.institution if hasattr(user, 'institution') else "Unknown",
                "score": e.total_score,
                "problemsSolved": problems_solved,
                "penalty": e.total_penalty,
                "rating": user.rating if hasattr(user, 'rating') else 1500,
                "ratingChange": e.rating_change if hasattr(e, 'rating_change') else 0,
                "isCurrentUser": is_current_user,
                "submissions": submissions
            })

        return Response({
            "leaderboard": results,
            "contest_status": contest_status  # Return contest status here
        })
    
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
