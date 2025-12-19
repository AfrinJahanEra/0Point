# submission/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta
from django.http import JsonResponse
from mongoengine.queryset.visitor import Q
import pytz

from .models import Submission
from .serializers import SubmissionCreateSerializer, SubmissionSerializer
from contest.models import Contest, ContestRegistration
from contest.utils.auth import get_user_from_request
from account.models import Account
from contest.views import get_contest_status

class SubmissionDetailAPIView(APIView):
    """Get details of a specific submission"""
    
    def get(self, request, submission_id):
        try:
            submission = Submission.objects.get(id=submission_id)
        except Submission.DoesNotExist:
            return Response({"error": "Submission not found"}, status=404)
        
        # Check access
        user = get_user_from_request(request)
        
        # Always allow users to view their own submissions
        if user and str(submission.user.id) == str(user.id):
            pass
        else:
            # For others, check contest status
            try:
                contest = submission.contest
                
                if get_contest_status(contest) != "past":
                    # For live contests, check if contest has ended
                    if contest.start_time and contest.duration:
                        dhaka_tz = pytz.timezone('Asia/Dhaka')

                        if contest.start_time.tzinfo is None:
                            # If naive, assume it's Asia/Dhaka
                            start_time_dhaka = dhaka_tz.localize(contest.start_time)
                        else:
                            # Convert to Dhaka timezone
                            start_time_dhaka = contest.start_time.astimezone(dhaka_tz)
                        end_time_dhaka = start_time_dhaka + timedelta(minutes=contest.duration * 60)
            
                        # Get current time in Dhaka
                        current_time_dhaka = datetime.now(dhaka_tz)
                        
                        if current_time_dhaka <= end_time_dhaka:
                            # Contest still running, restrict access
                            return Response({
                                "error": "You can only view other users' code after the contest ends"
                            }, status=403)
            except Exception:
                pass
        
        serializer = SubmissionSerializer(
            submission.to_dict(),
            context={'request': request}
        )
        
        return Response(serializer.data)

class SubmissionListByProblemAPIView(APIView):
    """Get submissions for a specific problem"""
    
    def get(self, request, problem_id):
        # This endpoint might be for non-contest problems
        # For now, return empty or implement based on your needs
        return Response({"submissions": []})

class UserSubmissionsAPIView(APIView):
    """Get submissions for the current user across all contests"""
    
    def get(self, request):
        user = get_user_from_request(request)
        
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        # Get query parameters
        contest_id = request.GET.get('contest')
        verdict = request.GET.get('verdict')
        limit = int(request.GET.get('limit', 50))
        skip = int(request.GET.get('skip', 0))
        
        # Build query
        query = Q(user=user)
        
        if contest_id:
            try:
                contest = Contest.objects.get(id=contest_id)
                query &= Q(contest=contest)
            except Contest.DoesNotExist:
                pass
        
        if verdict and verdict != 'all':
            query &= Q(verdict=verdict)
        
        # Fetch submissions
        submissions = Submission.objects(query).order_by('-submitted_at').skip(skip).limit(limit)
        
        # Prepare response
        submissions_data = []
        for submission in submissions:
            sub_data = submission.to_dict()
            sub_data['is_current_user'] = True
            sub_data['can_view_code'] = True  # Always true for own submissions
            submissions_data.append(sub_data)
        
        # Get total count for pagination
        total_count = Submission.objects(query).count()
        
        return Response({
            'submissions': submissions_data,
            'total': total_count,
            'limit': limit,
            'skip': skip
        })
       
class ContestProblemsListAPIView(APIView):
    """Get all problems for a contest (for dropdown)"""
    
    def get(self, request, contest_id):
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check access
        user = get_user_from_request(request)
        can_access = False
        
        if get_contest_status(contest) == "past":
            can_access = True
        elif get_contest_status(contest) == "draft":
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
        elif get_contest_status(contest) in ["live", "upcoming", "test"]:
            if user:
                is_registered = ContestRegistration.objects.filter(
                    user=user, contest=contest
                ).first()
                can_access = bool(is_registered)
        
        if not can_access and get_contest_status(contest) != "past":
            return Response({
                "error": "Access denied",
                "message": "You don't have access to this contest"
            }, status=403)
        
        # Get problems with submission counts
        problems_list = []
        for problem in contest.problems:
            # Count submissions for this problem
            submission_count = Submission.objects(
                contest=contest,
                problem_index=problem.index
            ).count()
            
            problem_data = {
                "index": problem.index,
                "code": problem.index,
                "title": problem.title,
                "difficulty": problem.difficulty or "Medium",
                "time_limit": problem.time_limit_seconds,
                "memory_limit": problem.memory_limit_mb,
                "tags": problem.tags,
                "submission_count": submission_count,
                "accepted_count": Submission.objects(
                    contest=contest,
                    problem_index=problem.index,
                    verdict="AC"
                ).count()
            }
            problems_list.append(problem_data)
        
        return Response({
            "contest_id": str(contest.id),
            "contest_title": contest.title,
            "contest_status": get_contest_status(contest),
            "problems": problems_list
        })
    
class ContestSubmissionsAPIView(APIView):
    """Get all submissions for a contest with filtering"""
    
    def get(self, request, contest_id):  # FIXED: Use contest_id parameter
        print(f"DEBUG: ContestSubmissionsAPIView called for contest: {contest_id}")
        print(f"DEBUG: Query params: {request.GET}")
        
        try:
            contest = Contest.objects.get(id=contest_id)
            print(f"DEBUG: Found contest: {contest.title}")
        except Contest.DoesNotExist:
            print(f"DEBUG: Contest not found: {contest_id}")
            return Response({"error": "Contest not found"}, status=404)
        
        # Get current user
        user = get_user_from_request(request)
        current_user_id = str(user.id) if user else None
        print(f"DEBUG: User ID: {current_user_id}")
        
        # Get query parameters - FIXED: Use proper parameter names
        filter_type = request.GET.get('filter', 'my')  # 'my' or 'all'
        verdict = request.GET.get('verdict', 'all')
        problem = request.GET.get('problem', 'all')
        
        print(f"DEBUG: Filter type: {filter_type}, Verdict: {verdict}, Problem: {problem}")
        
        # Build query
        query = Q(contest=contest)
        
        # Apply user filter
        if filter_type == 'my' and user:
            query &= Q(user=user)
            print(f"DEBUG: Applied user filter for user: {user.id}")
        
        # Apply verdict filter - handle both AC and ACCEPTED
        if verdict != 'all':
            if verdict == 'AC':
                # Match both "AC" and "ACCEPTED" for accepted submissions
                query &= (Q(verdict='AC') | Q(verdict='ACCEPTED'))
                print(f"DEBUG: Applied AC filter (including ACCEPTED)")
            elif verdict == 'WA':
                # Similarly handle WA variations if needed
                query &= (Q(verdict='WA') | Q(verdict='WRONG_ANSWER') | Q(verdict='WRONG ANSWER'))
                print(f"DEBUG: Applied WA filter")
            else:
                # For other verdicts, use exact match
                query &= Q(verdict=verdict)
                print(f"DEBUG: Applied verdict filter: {verdict}")
        
        # Apply problem filter
        if problem != 'all':
            query &= Q(problem_index=problem)
            print(f"DEBUG: Applied problem filter: {problem}")
        
        # Fetch submissions
        submissions = Submission.objects(query).order_by('-submitted_at').limit(100)
        print(f"DEBUG: Found {len(submissions)} submissions")
        
        # Set timezone
        dhaka_tz = pytz.timezone('Asia/Dhaka')
        
        # Prepare response data
        submissions_data = []
        for submission in submissions:
            sub_data = submission.to_dict()
            
            # Normalize verdict for frontend
            if submission.verdict == 'ACCEPTED':
                sub_data['verdict'] = 'AC'
            elif submission.verdict == 'WRONG_ANSWER':
                sub_data['verdict'] = 'WA'
            elif submission.verdict == 'TIME_LIMIT_EXCEEDED':
                sub_data['verdict'] = 'TLE'
            elif submission.verdict == 'MEMORY_LIMIT_EXCEEDED':
                sub_data['verdict'] = 'MLE'
            elif submission.verdict == 'COMPILATION_ERROR':
                sub_data['verdict'] = 'CE'
            elif submission.verdict == 'RUNTIME_ERROR':
                sub_data['verdict'] = 'RE'
            
            # Convert timestamps to Asia/Dhaka timezone
            if submission.submitted_at:
                # Ensure the datetime is timezone aware
                if submission.submitted_at.tzinfo is None:
                    # If naive, assume it's UTC and convert to Dhaka
                    submitted_at_utc = pytz.utc.localize(submission.submitted_at)
                    submitted_at_dhaka = submitted_at_utc.astimezone(dhaka_tz)
                else:
                    # Already has timezone, convert to Dhaka
                    submitted_at_dhaka = submission.submitted_at.astimezone(dhaka_tz)
                
                # Update the timestamps in the response
                sub_data['submitted_at'] = submitted_at_dhaka.isoformat()
                sub_data['time'] = submitted_at_dhaka.isoformat()
            
            if submission.judged_at:
                if submission.judged_at.tzinfo is None:
                    judged_at_utc = pytz.utc.localize(submission.judged_at)
                    judged_at_dhaka = judged_at_utc.astimezone(dhaka_tz)
                else:
                    judged_at_dhaka = submission.judged_at.astimezone(dhaka_tz)
                sub_data['judged_at'] = judged_at_dhaka.isoformat()
            
            # Add computed fields
            sub_data['is_current_user'] = (current_user_id == sub_data['user'])
            sub_data['can_view_code'] = self._can_view_code(sub_data, user, contest)
            
            submissions_data.append(sub_data)
            print(f"DEBUG: Added submission {sub_data['id']} by {sub_data['user_name']}")
        
        # Get ALL problems from the contest
        contest_problems = []
        for problem in contest.problems:
            contest_problems.append({
                'code': problem.index,
                'title': problem.title,
                'value': problem.index
            })
        
        # Get submission counts for each problem
        submission_problems = {}
        all_submissions = Submission.objects(contest=contest)
        for sub in all_submissions:
            if sub.problem_index not in submission_problems:
                submission_problems[sub.problem_index] = {
                    'code': sub.problem_index,
                    'title': sub.problem_title or sub.problem_index,
                    'submission_count': 1
                }
            else:
                submission_problems[sub.problem_index]['submission_count'] += 1
        
        # Merge contest problems with submission counts
        for problem in contest_problems:
            if problem['code'] in submission_problems:
                problem['submission_count'] = submission_problems[problem['code']]['submission_count']
            else:
                problem['submission_count'] = 0
        
        # Sort problems by code (A, B, C, etc.)
        contest_problems.sort(key=lambda x: x['code'])
        
        print(f"DEBUG: Returning {len(submissions_data)} submissions")
        
        return Response({
            'submissions': submissions_data,
            'filters': {
                'problems': contest_problems,
                'verdicts': [
                    {'value': 'all', 'label': 'All Verdicts'},
                    {'value': 'AC', 'label': 'Accepted'},
                    {'value': 'WA', 'label': 'Wrong Answer'},
                    {'value': 'TLE', 'label': 'Time Limit Exceeded'},
                    {'value': 'MLE', 'label': 'Memory Limit Exceeded'},
                    {'value': 'CE', 'label': 'Compilation Error'},
                    {'value': 'RE', 'label': 'Runtime Error'},
                    {'value': 'PENDING', 'label': 'Pending'},
                    {'value': 'RUNNING', 'label': 'Running'},
                ]
            },
            'total': len(submissions_data),
            'contest_id': str(contest.id),
            'contest_status': get_contest_status(contest),
            'contest_ended': self._is_contest_ended(contest),
            'current_user_id': current_user_id,
            'current_user_name': user.name if user else None
        })
    
    def _can_view_code(self, submission_data, user, contest):
        """Check if current user can view submission code"""
        if not user:
            return False
        
        # Always allow users to view their own submissions
        if submission_data['user'] == str(user.id):
            return True
        
        # Check contest status
        if get_contest_status(contest) == "past":
            return True
        
        # For live contests, check if contest has ended
        if contest.start_time and contest.duration:
            # Convert contest times to UTC for comparison
            dhaka_tz = pytz.timezone('Asia/Dhaka')
            
            # Ensure contest start_time is timezone aware
            if contest.start_time.tzinfo is None:
                # If naive, assume it's Asia/Dhaka
                start_time_dhaka = dhaka_tz.localize(contest.start_time)
            else:
                # Convert to Dhaka timezone
                start_time_dhaka = contest.start_time.astimezone(dhaka_tz)
            
            # Calculate end time in Dhaka
            end_time_dhaka = start_time_dhaka + timedelta(minutes=contest.duration * 60)
            
            # Get current time in Dhaka
            current_time_dhaka = datetime.now(dhaka_tz)
            
            print(f"DEBUG: Contest timing check (Asia/Dhaka):")
            print(f"  Current time (Dhaka): {current_time_dhaka}")
            print(f"  Contest start time (Dhaka): {start_time_dhaka}")
            print(f"  Contest end time (Dhaka): {end_time_dhaka}")
            
            if current_time_dhaka > end_time_dhaka:
                return True
        
        return False
    
    def _is_contest_ended(self, contest):
        """Check if contest has ended"""
        if get_contest_status(contest) == "past":
            return True
        
        if contest.start_time and contest.duration:
            # Convert contest times to Asia/Dhaka for comparison
            dhaka_tz = pytz.timezone('Asia/Dhaka')
            
            # Ensure contest start_time is timezone aware
            if contest.start_time.tzinfo is None:
                # If naive, assume it's Asia/Dhaka
                start_time_dhaka = dhaka_tz.localize(contest.start_time)
            else:
                # Convert to Dhaka timezone
                start_time_dhaka = contest.start_time.astimezone(dhaka_tz)
            
            # Calculate end time in Dhaka
            end_time_dhaka = start_time_dhaka + timedelta(minutes=contest.duration * 60)
            
            # Get current time in Dhaka
            current_time_dhaka = datetime.now(dhaka_tz)
            
            return current_time_dhaka > end_time_dhaka
        
        return False    

# Add this import at the top of views.py if not already present
from collections import defaultdict

# Add this new class to submission/views.py
class ProblemStatisticsAPIView(APIView):
    """Get detailed statistics for a specific problem in a contest"""
    
    def get(self, request, contest_id, problem_index):
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check if problem exists in contest
        problem = None
        for p in contest.problems:
            if p.index == problem_index.upper():
                problem = p
                break
        
        if not problem:
            return Response({"error": "Problem not found in contest"}, status=404)
        
        # Get current user for personalized stats
        user = get_user_from_request(request)
        user_id = str(user.id) if user else None
        
        # Get all submissions for this problem
        submissions = Submission.objects.filter(
            contest=contest,
            problem_index=problem_index.upper()
        )
        
        # Calculate basic statistics
        total_submissions = submissions.count()
        accepted_submissions = submissions.filter(
            verdict__in=['AC', 'ACCEPTED']
        ).count()
        
        # Calculate unique users who attempted/solved
        all_users = submissions.distinct('user')
        users_attempted = len(all_users)
        
        solved_users = Submission.objects.filter(
            contest=contest,
            problem_index=problem_index.upper(),
            verdict__in=['AC', 'ACCEPTED']
        ).distinct('user')
        users_solved = len(solved_users)
        
        # Calculate accuracy (if there are submissions)
        accuracy = 0
        if total_submissions > 0:
            accuracy = round((accepted_submissions / total_submissions) * 100, 2)
        
        # Get user's personal status
        user_status = "unsolved"
        user_attempts = 0
        
        if user:
            user_submissions = submissions.filter(user=user)
            user_attempts = user_submissions.count()
            
            # Check if user has solved it
            user_solved = user_submissions.filter(
                verdict__in=['AC', 'ACCEPTED']
            ).first()
            
            if user_solved:
                user_status = "solved"
            elif user_attempts > 0:
                user_status = "attempted"
        
        # Get verdict distribution
        verdict_counts = defaultdict(int)
        for sub in submissions:
            verdict = sub.verdict
            # Normalize verdict names
            if verdict == 'ACCEPTED':
                verdict = 'AC'
            elif verdict == 'WRONG_ANSWER':
                verdict = 'WA'
            elif verdict == 'TIME_LIMIT_EXCEEDED':
                verdict = 'TLE'
            elif verdict == 'MEMORY_LIMIT_EXCEEDED':
                verdict = 'MLE'
            elif verdict == 'COMPILATION_ERROR':
                verdict = 'CE'
            elif verdict == 'RUNTIME_ERROR':
                verdict = 'RE'
            
            verdict_counts[verdict] += 1
        
        # Convert to list for frontend
        verdict_distribution = [
            {"verdict": k, "count": v} 
            for k, v in sorted(verdict_counts.items())
        ]
        
        # Get recent successful submissions (for average time/memory)
        accepted_subs = submissions.filter(verdict__in=['AC', 'ACCEPTED'])
        avg_time = 0
        avg_memory = 0
        
        if accepted_subs.count() > 0:
            total_time = sum(sub.execution_time or 0 for sub in accepted_subs)
            total_memory = sum(sub.memory or 0 for sub in accepted_subs)
            avg_time = int(total_time / accepted_subs.count())
            avg_memory = int(total_memory / accepted_subs.count())
        
        # Get fastest submission
        fastest_sub = accepted_subs.order_by('execution_time').first()
        fastest_time = fastest_sub.execution_time if fastest_sub else 0
        
        # Get most memory efficient submission
        mem_efficient_sub = accepted_subs.order_by('memory').first()
        min_memory = mem_efficient_sub.memory if mem_efficient_sub else 0
        
        return Response({
            "problem": {
                "index": problem.index,
                "title": problem.title,
                "difficulty": problem.difficulty or "Medium",
                "time_limit": problem.time_limit_seconds,
                "memory_limit": problem.memory_limit_mb,
                "points": getattr(problem, 'points', 100)
            },
            "statistics": {
                "total_submissions": total_submissions,
                "accepted_submissions": accepted_submissions,
                "users_attempted": users_attempted,
                "users_solved": users_solved,
                "accuracy": f"{accuracy}%",
                "accuracy_percentage": accuracy,
                "user_status": user_status,
                "user_attempts": user_attempts,
                "average_time": avg_time,
                "average_memory": avg_memory,
                "fastest_time": fastest_time,
                "min_memory": min_memory,
                "verdict_distribution": verdict_distribution
            },
            "contest_info": {
                "id": str(contest.id),
                "title": contest.title,
                "status": get_contest_status(contest)
            }
        })


