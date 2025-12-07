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

class SubmissionCreateAPIView(APIView):
    """Create a new submission for a contest problem"""
    
    def post(self, request):

        print(f"DEBUG - Request data: {request.data}")
        print(f"DEBUG - User: {get_user_from_request(request)}")

        serializer = SubmissionCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            print(f"DEBUG - Validated data: {serializer.validated_data}")
            contest = serializer.validated_data.get('contest')
            if contest:
                print(f"DEBUG - Contest ID: {contest.id}")
                print(f"DEBUG - Contest status: {contest.status}")
                print(f"DEBUG - Contest start_time: {contest.start_time}")
                print(f"DEBUG - Contest duration: {contest.duration}")
                print(f"DEBUG - Start time tzinfo: {contest.start_time.tzinfo if contest.start_time else None}")
                print(f"DEBUG - Current UTC time: {datetime.utcnow()}")
                
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Create submission
        submission = Submission(
            contest=data['contest'],
            problem_index=data['problem_index'],
            problem_code=data['problem_code'],
            problem_title=data['problem_title'],
            user=data['user'],
            user_id=str(data['user'].id),
            code=data['code'],
            language=data['language'],
            verdict='PENDING'
        )
        
        # Calculate contest time
        submission.calculate_contest_time(data['contest'].start_time)
        
        # Save submission
        try:
            submission.save()
        except Exception as e:
            return Response(
                {"error": f"Failed to save submission: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # TODO: Add to judge queue (RabbitMQ/Redis)
        # For now, just return success
        
        # Convert submitted_at to Asia/Dhaka timezone
        dhaka_tz = pytz.timezone('Asia/Dhaka')
        submitted_at_dhaka = submission.submitted_at.astimezone(dhaka_tz) if submission.submitted_at.tzinfo else dhaka_tz.localize(submission.submitted_at)
        
        return Response({
            "message": "Submission received and queued for judging",
            "submission_id": submission.id,
            "problem": data['problem_code'],
            "language": data['language'],
            "submitted_at": submitted_at_dhaka.isoformat()
        }, status=status.HTTP_201_CREATED)

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
                
                if contest.status != "past":
                    # For live contests, check if contest has ended
                    if contest.start_time and contest.duration:
                        end_time = contest.start_time + timedelta(minutes=contest.duration * 60)
                        current_time = datetime.utcnow()
                        
                        if current_time <= end_time:
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
    
# submission/views.py - Add this new view
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
        
        if contest.status == "past":
            can_access = True
        elif contest.status == "draft":
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
        elif contest.status in ["live", "upcoming", "test"]:
            if user:
                is_registered = ContestRegistration.objects.filter(
                    user=user, contest=contest
                ).first()
                can_access = bool(is_registered)
        
        if not can_access and contest.status != "past":
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
            "contest_status": contest.status,
            "problems": problems_list
        })
    




    """Get all submissions for a contest with filtering"""
    
    def get(self, request, contest_id):
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
        
        # Get query parameters
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
        
        # Apply verdict filter
        if verdict != 'all':
            query &= Q(verdict=verdict)
            print(f"DEBUG: Applied verdict filter: {verdict}")
        
        # Apply problem filter
        if problem != 'all':
            query &= Q(problem_index=problem)
            print(f"DEBUG: Applied problem filter: {problem}")
        
        # Fetch submissions with user details
        submissions = Submission.objects(query).order_by('-submitted_at').limit(100)
        print(f"DEBUG: Found {len(submissions)} submissions")
        
        # Prepare response data with user details
        submissions_data = []
        for submission in submissions:
            sub_data = submission.to_dict()
            
            # Get user details
            try:
                from account.models import Account
                user_account = Account.objects.get(id=submission.user.id)
                # Add more user details
                sub_data['user_name'] = user_account.name or user_account.email.split('@')[0]
                sub_data['user_email'] = user_account.email
                sub_data['user_avatar'] = getattr(user_account, 'avatar_url', None)
                sub_data['user_rating'] = getattr(user_account, 'rating', 0)
            except Exception as e:
                print(f"DEBUG: Error fetching user details: {str(e)}")
                sub_data['user_name'] = f"User_{submission.user.id[:8]}"
                sub_data['user_email'] = ""
            
            # Add computed fields
            sub_data['is_current_user'] = (current_user_id == sub_data['user'])
            sub_data['can_view_code'] = self._can_view_code(sub_data, user, contest)
            
            submissions_data.append(sub_data)
            print(f"DEBUG: Added submission {sub_data['id']} by {sub_data['user_name']}")
        
        # Sort if needed (backend sorting is already done in query)
        
        # Get unique problems for filter dropdown
        contest_problems = []
        for problem in contest.problems:
            contest_problems.append({
                'code': problem.index,
                'title': problem.title,
                'value': problem.index
            })
        
        # Get submission counts
        all_submissions = Submission.objects(contest=contest)
        submission_problems = {}
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
            'contest_status': contest.status,
            'contest_ended': self._is_contest_ended(contest),
            'current_user_id': current_user_id,
            'current_user_name': user.name if user else None
        })
    
# submission/views.py - Updated with Asia/Dhaka timezone
from datetime import datetime, timedelta
import pytz

class ContestSubmissionsAPIView(APIView):
    """Get all submissions for a contest with filtering"""
    
    def get(self, request, contest_id):
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
        
        # Get query parameters
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
        
        # Apply verdict filter
        if verdict != 'all':
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
            
            # Get user details
            try:
                from account.models import Account
                user_account = Account.objects.get(id=submission.user.id)
                # Add more user details
                sub_data['user_name'] = user_account.name or user_account.email.split('@')[0]
                sub_data['user_email'] = user_account.email
                sub_data['user_avatar'] = getattr(user_account, 'avatar_url', None)
                sub_data['user_rating'] = getattr(user_account, 'rating', 0)
            except Exception as e:
                print(f"DEBUG: Error fetching user details: {str(e)}")
                sub_data['user_name'] = f"User_{submission.user.id[:8]}"
                sub_data['user_email'] = ""
            
            # Add computed fields
            sub_data['is_current_user'] = (current_user_id == sub_data['user'])
            sub_data['can_view_code'] = self._can_view_code(sub_data, user, contest)
            
            submissions_data.append(sub_data)
            print(f"DEBUG: Added submission {sub_data['id']} by {sub_data['user_name']}")
        
        # Sort if needed (backend sorting is already done in query)
        
        # Get unique problems for filter dropdown
        # Get ALL problems from the contest (not just those with submissions)
        contest_problems = []
        for problem in contest.problems:
            contest_problems.append({
                'code': problem.index,
                'title': problem.title,
                'value': problem.index
            })
        
        # Also get problems that have submissions (for count display)
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
            'contest_status': contest.status,
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
        if contest.status == "past":
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
        if contest.status == "past":
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
    

    