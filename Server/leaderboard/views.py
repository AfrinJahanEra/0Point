from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from contest.views import get_contest_status
from contest.utils.auth import get_user_from_request
from contest.models import Contest
from .models import ContestLeaderboard, LeaderboardEntry
from .serializers import FreezeSerializer, RecalculateSerializer
from .services import calculate_leaderboard

# Import submission model
from submission.models import Submission


class LeaderboardView(APIView):
    """
    GET /contests/<id>/leaderboard/
    """
    def get(self, request, contest_id):
        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=404)

        # Get contest status from the contest object
        contest_status = get_contest_status(contest)
        
        # Get current user
        current_user = get_user_from_request(request)
        current_user_id = str(current_user.id) if current_user else None
        
        # ========== CRITICAL FIX: Calculate contest end time ==========
        contest_end_time = None
        if contest.start_time and contest.duration:
            # Convert start_time to aware datetime if needed
            if contest.start_time.tzinfo is None:
                import pytz
                # If naive, assume it's Asia/Dhaka
                dhaka_tz = pytz.timezone('Asia/Dhaka')
                start_time_dhaka = dhaka_tz.localize(contest.start_time)
            else:
                start_time_dhaka = contest.start_time
            
            # Calculate end time
            contest_end_time = start_time_dhaka + timedelta(minutes=contest.duration * 60)
        
        # ========== Get only submissions within contest duration ==========
        if contest_end_time:
            # Filter submissions that are within contest time window
            valid_submissions = Submission.objects(
                contest=contest,
                submitted_at__gte=contest.start_time,  # After contest start
                submitted_at__lte=contest_end_time     # Before contest end
            ).order_by("submitted_at")
            print(f"DEBUG: Contest duration filtering active. Contest runs from {contest.start_time} to {contest_end_time}")
            print(f"DEBUG: Found {valid_submissions.count()} submissions within contest duration")
        else:
            # If no contest timing info, get all submissions
            valid_submissions = Submission.objects(contest=contest).order_by("submitted_at")
            print(f"DEBUG: No contest timing info, using all {valid_submissions.count()} submissions")
        
        # Group submissions by user
        user_submissions = {}
        
        for submission in valid_submissions:
            user_id = str(submission.user.id)
            if user_id not in user_submissions:
                user_submissions[user_id] = {
                    'user': submission.user,
                    'submissions': [],
                    'problem_results': {},
                    'total_score': 0,
                    'total_penalty': 0
                }
            user_submissions[user_id]['submissions'].append(submission)
        
        # Get actual problem indices from contest
        actual_problems = [problem.index for problem in contest.problems]
        actual_problems.sort()
        
        results = []
        
        for user_id, data in user_submissions.items():
            user = data['user']
            problem_results = {}
            
            # Group submissions by problem
            problem_submissions = {}
            for sub in data['submissions']:
                problem_index = sub.problem_index
                if problem_index not in problem_submissions:
                    problem_submissions[problem_index] = []
                problem_submissions[problem_index].append(sub)
            
            # Calculate results for each problem
            total_score = 0
            total_penalty = 0
            problems_solved = 0
            
            # Get problem points from contest
            problem_points = {}
            for problem in contest.problems:
                problem_points[problem.index] = problem.points if hasattr(problem, 'points') else 100
            
            for problem_index, submissions_list in problem_submissions.items():
                # Sort submissions by time
                submissions_list.sort(key=lambda x: x.submitted_at)
                
                accepted = False
                tries = 0
                penalty = 0
                solved_time = 0
                points_earned = 0
                
                for sub in submissions_list:
                    tries += 1
                    
                    if sub.verdict == "AC":
                        accepted = True
                        # Calculate contest time in minutes
                        if contest.start_time:
                            time_diff = sub.submitted_at - contest.start_time
                            solved_time = time_diff.total_seconds() / 60
                        
                        base_points = problem_points.get(problem_index, 100)
                        points_earned = base_points
                        
                        if tries > 1:
                            penalty += (tries - 1) * 20  # 20 minute penalty per wrong attempt
                        
                        break
                
                time_penalty = solved_time + penalty
                
                problem_results[problem_index] = {
                    "tries": tries,
                    "time": solved_time,
                    "penalty": penalty,
                    "verdict": "ACCEPTED" if accepted else "WRONG_ANSWER",
                    "points": points_earned,
                    "max_points": problem_points.get(problem_index, 100),
                    "accepted": accepted,
                    "has_submissions": tries > 0
                }
                
                if accepted:
                    total_score += points_earned
                    total_penalty += time_penalty
                    problems_solved += 1
            
            # Check if this is the current user
            is_current_user = current_user_id == user_id if current_user_id else False
            
            # Get user rating
            user_rating = user.rating if hasattr(user, 'rating') else 1500
            
            # Format problem status for frontend
            submissions_display = []
            
            for problem in actual_problems:
                problem_data = problem_results.get(problem)
                status = "NA"
                points = 0
                tries = 0
                
                if problem_data:
                    tries = problem_data.get("tries", 0)
                    if problem_data.get("accepted"):
                        status = "AC"
                        points = problem_data.get("points", 0)
                    elif tries > 0:
                        status = "WA"
                        points = 0
                
                submissions_display.append({
                    "problem": problem,
                    "status": status,
                    "points": points,
                    "tries": tries
                })
            
            results.append({
                "rank": 0,
                "username": user.username if hasattr(user, 'username') and user.username else user.name,
                "name": user.name if hasattr(user, 'name') else "Anonymous",
                "country": user.country if hasattr(user, 'country') else "Unknown",
                "institution": user.institution if hasattr(user, 'institution') else "Unknown",
                "score": total_score,
                "points": total_score,
                "problemsSolved": problems_solved,
                "penalty": total_penalty,
                "rating": user_rating,
                "ratingChange": 0,  # Will be calculated below if contest is past
                "isCurrentUser": is_current_user,
                "submissions": submissions_display,
                "problemResults": problem_results
            })
        
        # Sort and rank participants
        results.sort(key=lambda x: (-x['score'], x['penalty']))
        
        # Assign ranks
        for i, participant in enumerate(results):
            participant['rank'] = i + 1
        
        # ========== ADD RATING CALCULATION HERE ==========
        # Only calculate rating changes if contest is over
        if contest_status == "past":
            # Collect all ratings for calculation
            all_ratings = [p['rating'] for p in results]
            
            # Simple rating calculation (simplified Codeforces style)
            for participant in results:
                expected_rank = self.calculate_expected_rank(participant['rating'], all_ratings)
                actual_rank = participant['rank']
                participant['ratingChange'] = self.calculate_rating_change(
                    participant['rating'], 
                    expected_rank, 
                    actual_rank, 
                    len(results)
                )
        
        return Response({
            "leaderboard": results,
            "contest_status": contest_status,
            "total_participants": len(results),
            "problems": actual_problems,
            "contest_info": {
                "start_time": contest.start_time.isoformat() if contest.start_time else None,
                "end_time": contest_end_time.isoformat() if contest_end_time else None,
                "duration": contest.duration
            }
        })
    
    # Helper methods for rating calculation (keep these as is)
    def calculate_expected_rank(self, user_rating, all_ratings):
        """Calculate expected rank based on Elo/Codeforces formula"""
        expected_score = 0
        for other_rating in all_ratings:
            if user_rating != other_rating:
                expected_score += 1 / (1 + 10 ** ((other_rating - user_rating) / 400))
        return expected_score + 1
    
    def calculate_rating_change(self, user_rating, expected_rank, actual_rank, total_participants):
        """Calculate rating change using simplified Codeforces formula"""
        # Codeforces-like formula
        expected_performance = expected_rank
        actual_performance = actual_rank
        
        # K-factor (how much ratings can change)
        k_factor = 32  # For new users this could be higher
        
        # Simplified calculation
        performance_diff = expected_performance - actual_performance
        rating_change = performance_diff * (k_factor / total_participants)
        
        # Round to nearest integer
        return int(round(rating_change))
    

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
    

