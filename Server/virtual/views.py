# virtual/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta
from mongoengine.queryset.visitor import Q

from .models import VirtualContest, VirtualContestSubmission
from .serializers import VirtualContestStartSerializer, VirtualContestSerializer
from contest.models import Contest, ContestProblem
from contest.utils.auth import get_user_from_request
from submission.models import Submission
from compiler.views import ContestProblemExecuteAPIView
from contest.models import Contest
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta
from mongoengine.queryset.visitor import Q

from .models import VirtualContest, VirtualContestSubmission
from contest.utils.auth import get_user_from_request

import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta
from mongoengine.queryset.visitor import Q

from .models import VirtualContest, VirtualContestSubmission
from contest.utils.auth import get_user_from_request
from contest.models import Contest  # ADD THIS IMPORT

class VirtualContestStartAPIView(APIView):
    """Start a virtual contest"""
    
    def post(self, request, contest_id):  # Accept contest_id from URL
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Only allow virtual contests for past contests
        from contest.views import get_contest_status
        if get_contest_status(contest) != "past":
            return Response({"error": "Virtual contests can only be started for past contests"}, status=400)
        
        # Check if user already has an active virtual contest for this contest
        existing_virtual = VirtualContest.objects.filter(
            original_contest=contest,
            user=user,
            is_completed=False
        ).first()
        
        if existing_virtual:
            return Response({
                "error": "You already have an active virtual contest for this contest",
                "virtual_contest_id": str(existing_virtual.id)
            }, status=400)
        
        # Set virtual contest timing
        start_time_from_request = request.data.get('start_time')
        if start_time_from_request:
            try:
                virtual_start_time = datetime.fromisoformat(start_time_from_request.replace('Z', '+00:00'))
            except ValueError:
                return Response({"error": "Invalid start_time format. Use ISO format"}, status=400)
        else:
            virtual_start_time = datetime.now()
        
        # Duration in hours (from original contest)
        duration_hours = contest.duration if contest.duration else 2
        virtual_end_time = virtual_start_time + timedelta(hours=duration_hours)

        current_time = datetime.now()

        if virtual_start_time > current_time:
            status = "upcoming"
        elif virtual_start_time <= current_time <= virtual_end_time:
            status = "live"
        else:
            status = "past"
        
        # Create virtual contest
        virtual_contest = VirtualContest(
            original_contest=contest,
            user=user,
            virtual_start_time=virtual_start_time,
            virtual_end_time=virtual_end_time,
            status=status,  # Set status based on timing
            user_progress={}
        )
        
        # Initialize progress for all problems
        for problem in contest.problems:
            virtual_contest.user_progress[problem.index] = {
                "attempts": 0,
                "solved": False,
                "best_time": None,
                "submissions": []
            }
        
        try:
            virtual_contest.save()
        except Exception as e:
            return Response({"error": f"Failed to create virtual contest: {str(e)}"}, status=400)
        
        return Response({
            "message": "Virtual contest started successfully",
            "virtual_contest_id": str(virtual_contest.id),
            "original_contest_id": str(contest.id),
            "contest_title": contest.title,
            "start_time": virtual_start_time.isoformat(),
            "end_time": virtual_end_time.isoformat(),
            "duration_hours": duration_hours,
            "status": status  # Always past for virtual contests
        }, status=201)

class VirtualContestSubmitAPIView(APIView):
    """Submit solution in virtual contest"""
    
    def post(self, request, contest_id, virtual_contest_id):  # Accept both IDs
        # Authenticate user
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        # Get virtual contest
        try:
            virtual_contest = VirtualContest.objects.get(id=virtual_contest_id, user=user)
        except VirtualContest.DoesNotExist:
            return Response({"error": "Virtual contest not found or access denied"}, status=404)
        
        # Check if virtual contest is still active
        current_time = datetime.now()
        if current_time > virtual_contest.virtual_end_time:
            virtual_contest.is_completed = True
            virtual_contest.save()
            return Response({"error": "Virtual contest has ended"}, status=400)
        
        # Get submission data from request
        problem_index = request.data.get('problem_index')
        code = request.data.get('code')
        language = request.data.get('language')
        
        if not all([problem_index, code, language]):
            return Response({"error": "Missing required fields"}, status=400)
        
        # Find the problem in original contest
        problem = None
        for p in virtual_contest.original_contest.problems:
            if p.index == problem_index.upper():
                problem = p
                break
        
        if not problem:
            return Response({"error": "Problem not found"}, status=404)
        
        # Calculate virtual contest time
        time_diff = current_time - virtual_contest.virtual_start_time
        virtual_contest_time = time_diff.total_seconds() / 60
        
        # Create virtual submission record (pending)
        virtual_submission = VirtualContestSubmission(
            virtual_contest=virtual_contest,
            user=user,
            contest=virtual_contest.original_contest,
            problem_index=problem_index.upper(),
            problem_code=problem_index.upper(),
            problem_title=problem.title,
            code=code[:1000],  # Store first 1000 chars for reference
            language=language,
            verdict='RUNNING',
            virtual_submitted_at=current_time,
            virtual_contest_time=virtual_contest_time
        )
        
        try:
            virtual_submission.save()
        except Exception as e:
            return Response({"error": f"Failed to create virtual submission: {str(e)}"}, status=500)
        
        # Prepare to call actual contest submission API
        contest = virtual_contest.original_contest
        contest_id = str(contest.id)
        
        # Get base URL from request or settings
        if hasattr(request, 'get_host'):
            base_url = f"{request.scheme}://{request.get_host()}"
        else:
            base_url = "http://localhost:8000"  # Default for development
        
        # Prepare payload for contest submission
        payload = {
            'code': code,
            'language': language,
            'version_index': '0'  # Default from compiler views
        }
        
        # Copy optional fields if present
        if 'input_data' in request.data:
            payload['input_data'] = request.data.get('input_data')
        if 'expected_output' in request.data:
            payload['expected_output'] = request.data.get('expected_output')
        
        # Prepare headers with authentication
        headers = {
            'Content-Type': 'application/json',
        }
        
        # Copy authorization from original request
        if 'HTTP_AUTHORIZATION' in request.META:
            headers['Authorization'] = request.META['HTTP_AUTHORIZATION']
        
        try:
            # Make API call to actual contest submission endpoint
            contest_submit_url = f"{base_url}/contests/{contest_id}/problems/{problem_index}/execute/"
            
            print(f"DEBUG: Calling contest API: {contest_submit_url}")
            print(f"DEBUG: Headers: {headers}")
            
            response = requests.post(
                contest_submit_url,
                json=payload,
                headers=headers,
                timeout=30  # 30 second timeout
            )
            
            print(f"DEBUG: Contest API response status: {response.status_code}")
            print(f"DEBUG: Contest API response: {response.text[:500]}...")
            
            if response.status_code in [200, 201]:
                # Success - contest submission created
                contest_result = response.json()
                
                # Update virtual submission with actual results
                virtual_submission.verdict = contest_result.get('verdict', 'WA')
                virtual_submission.execution_time = contest_result.get('execution_time', 0)
                virtual_submission.memory = contest_result.get('memory_used', 0)
                virtual_submission.passed_test_cases = contest_result.get('passed_test_cases', 0)
                virtual_submission.total_test_cases = contest_result.get('total_test_cases', 0)
                
                if contest_result.get('failed_test_case'):
                    virtual_submission.failed_test_case = contest_result.get('failed_test_case')
                
                if contest_result.get('error_message'):
                    virtual_submission.error_message = contest_result.get('error_message')
                
                if contest_result.get('compile_output'):
                    virtual_submission.compile_output = contest_result.get('compile_output')
                
                virtual_submission.judged_at = datetime.now()
                virtual_submission.save()
                
                # Update virtual contest progress
                progress = virtual_contest.user_progress.get(problem_index.upper(), {
                    "attempts": 0,
                    "solved": False,
                    "best_time": None,
                    "submissions": []
                })
                
                progress['attempts'] = progress.get('attempts', 0) + 1
                progress['submissions'].append(str(virtual_submission.id))
                
                # If solved and it's the first AC or faster than previous best
                if virtual_submission.verdict == 'AC':
                    progress['solved'] = True
                    if progress['best_time'] is None or virtual_contest_time < progress['best_time']:
                        progress['best_time'] = virtual_contest_time
                
                virtual_contest.user_progress[problem_index.upper()] = progress
                virtual_contest.save()
                
                # Return success response with virtual contest context
                return Response({
                    "message": "Virtual contest submission processed successfully",
                    "virtual_submission_id": str(virtual_submission.id),
                    "virtual_contest_time": virtual_contest_time,
                    "virtual_progress": progress,
                    "contest_submission_result": contest_result,
                    "is_virtual": True
                })
                
            else:
                # Contest API returned an error
                virtual_submission.verdict = 'SE'
                virtual_submission.error_message = f"Contest API error: {response.status_code} - {response.text[:200]}"
                virtual_submission.judged_at = datetime.now()
                virtual_submission.save()
                
                # Still update attempts in progress
                progress = virtual_contest.user_progress.get(problem_index.upper(), {
                    "attempts": 0,
                    "solved": False,
                    "best_time": None,
                    "submissions": []
                })
                progress['attempts'] = progress.get('attempts', 0) + 1
                progress['submissions'].append(str(virtual_submission.id))
                virtual_contest.user_progress[problem_index.upper()] = progress
                virtual_contest.save()
                
                return Response({
                    "error": f"Contest submission failed: {response.text}",
                    "virtual_submission_id": str(virtual_submission.id),
                    "status_code": response.status_code
                }, status=response.status_code)
                
        except requests.exceptions.Timeout:
            virtual_submission.verdict = 'TLE'
            virtual_submission.error_message = "API call timeout (30 seconds)"
            virtual_submission.judged_at = datetime.now()
            virtual_submission.save()
            
            return Response({
                "error": "Contest submission API timeout",
                "virtual_submission_id": str(virtual_submission.id),
                "status": "timeout"
            }, status=408)
            
        except requests.exceptions.ConnectionError:
            virtual_submission.verdict = 'SE'
            virtual_submission.error_message = "Cannot connect to contest submission API"
            virtual_submission.judged_at = datetime.now()
            virtual_submission.save()
            
            return Response({
                "error": "Cannot connect to contest submission service",
                "virtual_submission_id": str(virtual_submission.id),
                "status": "connection_error"
            }, status=502)
            
        except Exception as e:
            virtual_submission.verdict = 'SE'
            virtual_submission.error_message = f"System error: {str(e)}"
            virtual_submission.judged_at = datetime.now()
            virtual_submission.save()
            
            return Response({
                "error": f"Virtual contest submission error: {str(e)}",
                "virtual_submission_id": str(virtual_submission.id),
                "status": "system_error"
            }, status=500)

class VirtualContestDetailAPIView(APIView):
    """Get virtual contest details"""
    
    def get(self, request, contest_id, virtual_contest_id):  # Accept both IDs
        user = get_user_from_request(request)
        
        try:
            virtual_contest = VirtualContest.objects.get(id=virtual_contest_id)
        except VirtualContest.DoesNotExist:
            return Response({"error": "Virtual contest not found"}, status=404)
        
        # Check access
        if user and str(virtual_contest.user.id) != str(user.id):
            return Response({"error": "Access denied"}, status=403)
        
        # Calculate current status dynamically
        current_time = datetime.now()
        if virtual_contest.virtual_start_time > current_time:
            current_status = "upcoming"
        elif virtual_contest.virtual_start_time <= current_time <= virtual_contest.virtual_end_time:
            current_status = "live"
        else:
            current_status = "past"
        
        # Update the stored status if it's different
        if virtual_contest.status != current_status:
            virtual_contest.status = current_status
            
            # Mark as completed if contest has ended
            if current_status == "past" and not virtual_contest.is_completed:
                virtual_contest.is_completed = True
            
            virtual_contest.save()
        
        serializer = VirtualContestSerializer(virtual_contest)
        
        # Calculate time remaining
        time_remaining = 0
        is_active = False
        if current_time < virtual_contest.virtual_end_time:
            if current_time >= virtual_contest.virtual_start_time:
                # Contest is currently running
                time_remaining = (virtual_contest.virtual_end_time - current_time).total_seconds() / 60
                is_active = True
            else:
                # Contest hasn't started yet
                time_remaining = (virtual_contest.virtual_end_time - virtual_contest.virtual_start_time).total_seconds() / 60
        
        # Get contest details
        contest = virtual_contest.original_contest
        
        # Prepare response
        response_data = serializer.data
        response_data.update({
            "original_contest": {
                "id": str(contest.id),
                "title": contest.title,
                "description": contest.description,
                "duration_hours": contest.duration,
                "problems_count": len(contest.problems)
            },
            "time_remaining_minutes": time_remaining,
            "is_active": is_active,
            "current_status": current_status,  # Add current status explicitly
            "virtual_submissions_count": VirtualContestSubmission.objects.filter(
                virtual_contest=virtual_contest
            ).count()
        })
        
        return Response(response_data)

class VirtualContestProblemsAPIView(APIView):
    """Get problems for a virtual contest"""
    
    def get(self, request, contest_id, virtual_contest_id):  # Accept both IDs
        user = get_user_from_request(request)
        
        try:
            virtual_contest = VirtualContest.objects.get(id=virtual_contest_id)
        except VirtualContest.DoesNotExist:
            return Response({"error": "Virtual contest not found"}, status=404)
        
        # Check access
        if user and str(virtual_contest.user.id) != str(user.id):
            return Response({"error": "Access denied"}, status=403)
        
        contest = virtual_contest.original_contest
        problems_list = []
        
        for problem in contest.problems:
            progress = virtual_contest.user_progress.get(problem.index, {})
            
            problem_data = {
                "index": problem.index,
                "title": problem.title,
                "difficulty": problem.difficulty or "Medium",
                "time_limit": problem.time_limit_seconds,
                "memory_limit": problem.memory_limit_mb,
                "tags": problem.tags,
                "points": getattr(problem, 'points', 0),
                "virtual_status": "unsolved",
                "attempts": progress.get('attempts', 0),
                "solved": progress.get('solved', False),
                "best_time": progress.get('best_time')
            }
            
            if progress.get('solved'):
                problem_data['virtual_status'] = "solved"
            elif progress.get('attempts', 0) > 0:
                problem_data['virtual_status'] = "attempted"
            
            problems_list.append(problem_data)
        
        return Response({
            "virtual_contest_id": str(virtual_contest.id),
            "original_contest_id": str(contest.id),
            "contest_title": contest.title,
            "virtual_start_time": virtual_contest.virtual_start_time.isoformat(),
            "virtual_end_time": virtual_contest.virtual_end_time.isoformat(),
            "is_active": not virtual_contest.is_completed and datetime.now() <= virtual_contest.virtual_end_time,
            "problems": problems_list
        })

class VirtualContestProblemDetailAPIView(APIView):
    """Get specific problem details for a virtual contest"""
    
    def get(self, request, contest_id, virtual_contest_id, problem_index):  # Accept all three params
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            virtual_contest = VirtualContest.objects.get(id=virtual_contest_id)
        except VirtualContest.DoesNotExist:
            return Response({"error": "Virtual contest not found"}, status=404)
        
        # Check access - only virtual contest owner can access
        if str(virtual_contest.user.id) != str(user.id):
            return Response({"error": "Access denied"}, status=403)
        
        contest = virtual_contest.original_contest
        
        # Find the problem in original contest
        problem = None
        for p in contest.problems:
            if p.index == problem_index.upper():
                problem = p
                break
        
        if not problem:
            return Response({"error": "Problem not found in original contest"}, status=404)
        
        # Get virtual contest progress for this problem
        progress = virtual_contest.user_progress.get(problem_index.upper(), {})
        
        # Fetch virtual submissions for this problem
        virtual_submissions = VirtualContestSubmission.objects.filter(
            virtual_contest=virtual_contest,
            problem_index=problem_index.upper()
        ).order_by('-virtual_submitted_at')
        
        # Prepare problem data
        try:
            problem_data = {
                "contest_id": str(contest.id),
                "contest_title": contest.title,
                "virtual_contest_id": str(virtual_contest.id),
                "virtual_start_time": virtual_contest.virtual_start_time.isoformat(),
                "virtual_end_time": virtual_contest.virtual_end_time.isoformat(),
                "is_active": not virtual_contest.is_completed and datetime.now() <= virtual_contest.virtual_end_time,
                
                # Problem details
                "problem_index": problem.index,
                "problem_code": problem.index,
                "title": problem.title,
                "statement": problem.statement,
                "input_format": "",  # Could parse from statement if needed
                "output_format": "",  # Could parse from statement if needed
                "constraints": "",  # Could parse from statement if needed
                "time_limit": problem.time_limit_seconds,
                "memory_limit": problem.memory_limit_mb,
                "difficulty": problem.difficulty or "Medium",
                "tags": problem.tags,
                "tutorial": problem.tutorial or "",
                "points": getattr(problem, 'points', 0),
                
                # Virtual contest specific
                "virtual_status": "unsolved",
                "virtual_attempts": progress.get('attempts', 0),
                "virtual_solved": progress.get('solved', False),
                "virtual_best_time": progress.get('best_time'),
                "virtual_submissions": [],
                
                # Sample test cases
                "sample_test_cases": [],
                "test_cases": []  # Only sample test cases for users
            }
            
            # Set virtual status
            if progress.get('solved'):
                problem_data["virtual_status"] = "solved"
            elif progress.get('attempts', 0) > 0:
                problem_data["virtual_status"] = "attempted"
            
            # Add sample test cases
            for test_case in problem.test_cases:
                if test_case.sample and not getattr(test_case, 'hidden', False):
                    problem_data["sample_test_cases"].append({
                        "input": test_case.input,
                        "output": test_case.output,
                        "explanation": test_case.explanation
                    })
            
            # Add virtual submissions
            for submission in virtual_submissions:
                problem_data["virtual_submissions"].append({
                    "id": str(submission.id),
                    "virtual_submission_id": str(submission.id),
                    "problem_index": submission.problem_index,
                    "problem_title": submission.problem_title,
                    "language": submission.language,
                    "verdict": submission.verdict,
                    "execution_time": submission.execution_time,
                    "memory": submission.memory,
                    "passed_test_cases": submission.passed_test_cases,
                    "total_test_cases": submission.total_test_cases,
                    "failed_test_case": submission.failed_test_case,
                    "virtual_submitted_at": submission.virtual_submitted_at.isoformat(),
                    "virtual_contest_time": submission.virtual_contest_time,
                    "code": submission.code if user and str(user.id) == str(virtual_contest.user.id) else None  # Only show code to owner
                })
            
            return Response(problem_data)
            
        except Exception as e:
            print(f"DEBUG: Error preparing virtual problem data: {str(e)}")
            return Response({"error": f"Error preparing problem data: {str(e)}"}, status=500)

class VirtualContestLeaderboardAPIView(APIView):
    """Get leaderboard for a virtual contest (self-only for now)"""
    
    def get(self, request, contest_id, virtual_contest_id):  # Accept both IDs
        user = get_user_from_request(request)
        
        try:
            virtual_contest = VirtualContest.objects.get(id=virtual_contest_id)
        except VirtualContest.DoesNotExist:
            return Response({"error": "Virtual contest not found"}, status=404)
        
        # For now, only show user's own progress
        # In future, you might want to add friends or public leaderboards
        
        progress = virtual_contest.user_progress
        
        # Calculate statistics
        solved_count = sum(1 for p in progress.values() if p.get('solved'))
        total_problems = len(virtual_contest.original_contest.problems)
        total_attempts = sum(p.get('attempts', 0) for p in progress.values())
        
        # Prepare user data
        user_data = {
            "user_id": str(virtual_contest.user.id),
            "user_name": virtual_contest.user.name,
            "virtual_start_time": virtual_contest.virtual_start_time.isoformat(),
            "problems_solved": solved_count,
            "total_problems": total_problems,
            "total_attempts": total_attempts,
            "progress_percentage": (solved_count / total_problems * 100) if total_problems > 0 else 0,
            "problem_details": []
        }
        
        # Add details for each problem
        for problem in virtual_contest.original_contest.problems:
            p_progress = progress.get(problem.index, {})
            user_data['problem_details'].append({
                "index": problem.index,
                "title": problem.title,
                "solved": p_progress.get('solved', False),
                "attempts": p_progress.get('attempts', 0),
                "best_time": p_progress.get('best_time'),
                "points": getattr(problem, 'points', 0)
            })
        
        return Response({
            "virtual_contest_id": str(virtual_contest.id),
            "contest_title": virtual_contest.original_contest.title,
            "leaderboard": [user_data],  # Single user for now
            "total_participants": 1,
            "is_public": virtual_contest.leaderboard_public
        })

class UserVirtualContestsAPIView(APIView):
    """Get all virtual contests for a user"""
    
    def get(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        # Get query parameters
        status_filter = request.GET.get('status', 'all')  # all, active, completed
        limit = int(request.GET.get('limit', 20))
        skip = int(request.GET.get('skip', 0))
        
        # Build query
        query = Q(user=user)
        
        if status_filter == 'active':
            query &= Q(is_completed=False)
        elif status_filter == 'completed':
            query &= Q(is_completed=True)
        
        # Fetch virtual contests
        virtual_contests = VirtualContest.objects(query).order_by('-virtual_start_time').skip(skip).limit(limit)
        
        # Serialize data
        serializer = VirtualContestSerializer(virtual_contests, many=True)
        
        # Add additional info
        contests_data = []
        for vc, data in zip(virtual_contests, serializer.data):
            contest = vc.original_contest
            current_time = datetime.now()
            
            data['is_active'] = not vc.is_completed and current_time <= vc.virtual_end_time
            data['time_remaining'] = None
            
            if data['is_active']:
                time_remaining = (vc.virtual_end_time - current_time).total_seconds() / 60
                data['time_remaining_minutes'] = time_remaining
            
            data['original_contest_title'] = contest.title
            data['original_contest_duration'] = contest.duration
            
            contests_data.append(data)
        
        return Response({
            "virtual_contests": contests_data,
            "total": VirtualContest.objects(Q(user=user)).count(),
            "active_count": VirtualContest.objects(Q(user=user) & Q(is_completed=False)).count(),
            "completed_count": VirtualContest.objects(Q(user=user) & Q(is_completed=True)).count()
        })


