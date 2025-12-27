# testcontest/views.py
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta
from mongoengine.errors import ValidationError as MEValidationError
import pytz
from django.utils import timezone

from .models import TestContest, TestContestRegistration
from .serializers import TestContestCreateSerializer, TestContestSerializer
from contest.models import Contest
from contest.utils.auth import get_user_from_request
from account.models import Account

# Import from contest app to reuse functionality
from contest.views import get_contest_status as get_regular_contest_status
from contest.broadcast import broadcast_contest_update, broadcast_global_update

def get_test_contest_status(test_contest):
    """Calculate test contest status based on test_start_time"""
    dhaka_tz = pytz.timezone('Asia/Dhaka')
    now = datetime.now(dhaka_tz)
    
    # Use test_start_time for TestContest
    start_time = test_contest.test_start_time
    
    # Ensure start_time is in Dhaka timezone
    if start_time.tzinfo is None:
        start_time = dhaka_tz.localize(start_time)
    elif str(start_time.tzinfo) != 'Asia/Dhaka':
        start_time = start_time.astimezone(dhaka_tz)
    
    # Calculate end time (duration is in hours)
    duration_minutes = test_contest.duration * 60 if test_contest.duration else 0
    end_time = start_time + timedelta(minutes=duration_minutes)
    
    # Determine status
    if now < start_time:
        return "upcoming"
    elif start_time <= now <= end_time:
        return "live"
    else:
        return "past"

class TestContestCreateAPIView(APIView):
    """Create a test contest from draft"""
    
    def post(self, request, contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            # Get original draft contest
            original_contest = Contest.objects.get(id=contest_id, created_by=user)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found or access denied"}, status=404)
        
        # Ensure contest is a draft
        if original_contest.status != "draft":
            return Response({
                "error": "Only draft contests can be published as test",
                "current_status": original_contest.status
            }, status=400)
        
        # Validate test contest data
        serializer = TestContestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        try:
            # Create a deep copy of problems
            problems_copy = []
            for problem in original_contest.problems:
                # Create new test cases list
                test_cases_copy = []
                for tc in problem.test_cases:
                    test_cases_copy.append(TestCase(
                        input=tc.input,
                        output=tc.output,
                        explanation=tc.explanation,
                        difficulty=tc.difficulty,
                        sample=tc.sample,
                        hidden=tc.hidden
                    ))
                
                # Create problem copy
                problem_copy = ContestProblem(
                    index=problem.index,
                    title=problem.title,
                    statement=problem.statement,
                    time_limit_seconds=problem.time_limit_seconds,
                    memory_limit_mb=problem.memory_limit_mb,
                    tags=problem.tags.copy() if problem.tags else [],
                    difficulty=problem.difficulty,
                    tutorial=problem.tutorial,
                    points=problem.points,
                    test_cases=test_cases_copy
                )
                problems_copy.append(problem_copy)
            
            # Get test start time from serializer
            test_start_time = serializer.validated_data['test_start_time']
            
            # Create test contest
            test_contest = TestContest(
                original_contest=original_contest,
                title=f"[TEST] {original_contest.title}",
                description=original_contest.description,
                start_time=test_start_time,
                test_start_time=test_start_time,
                duration=serializer.validated_data.get('duration', original_contest.duration),
                type=original_contest.type,
                platform=original_contest.platform,
                testers=serializer.validated_data['testers'],
                problems=problems_copy,
                created_by=user,
                # Copy contest settings
                registration_required=original_contest.registration_required,
                email_notifications=original_contest.email_notifications,
                leaderboard_public=original_contest.leaderboard_public,
                allow_practice=original_contest.allow_practice,
                rating_changes=original_contest.rating_changes,
                editorial_published=original_contest.editorial_published
            )
            
            # Save test contest
            test_contest.save()
            
            # Calculate status
            test_status = get_test_contest_status(test_contest)
            test_contest.status = test_status
            test_contest.save()
            
            # Mark original contest as having test version
            original_contest.has_test_version = True
            original_contest.save()
            
            return Response({
                "message": "Test contest published successfully",
                "test_contest_id": str(test_contest.id),
                "original_contest_id": str(original_contest.id),
                "test_status": test_status,
                "test_start_time": test_contest.test_start_time,
                "testers_count": len(test_contest.testers),
                "problems_count": len(test_contest.problems)
            }, status=201)
            
        except Exception as e:
            print(f"DEBUG: Error creating test contest: {str(e)}")
            return Response({
                "error": f"Failed to create test contest: {str(e)}"
            }, status=400)

class TestContestDetailAPIView(APIView):
    """Get test contest details"""
    
    def get(self, request, test_contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            test_contest = TestContest.objects.get(id=test_contest_id)
        except TestContest.DoesNotExist:
            return Response({"error": "Test contest not found"}, status=404)
        
        # Check access: only testers or creator can view
        can_access = False
        if str(test_contest.created_by.id) == str(user.id):
            can_access = True
        elif user.email in test_contest.testers:
            can_access = True
        
        if not can_access:
            return Response({
                "error": "Access denied",
                "message": "You are not authorized to view this test contest"
            }, status=403)
        
        # Check registration status
        is_registered = False
        try:
            registration = TestContestRegistration.objects.filter(
                user=user, contest=test_contest
            ).first()
            is_registered = bool(registration)
        except:
            pass
        
        # Calculate current status
        current_status = get_test_contest_status(test_contest)
        test_contest.status = current_status
        test_contest.save()
        
        participant_count = TestContestRegistration.objects(contest=test_contest).count()
        
        response_data = {
            "id": str(test_contest.id),
            "original_contest_id": str(test_contest.original_contest.id),
            "title": test_contest.title,
            "description": test_contest.description or "",
            "test_start_time": test_contest.test_start_time.isoformat(),
            "start_time": test_contest.start_time.isoformat(),
            "duration": test_contest.duration,
            "duration_minutes": test_contest.duration * 60 if test_contest.duration else None,
            "type": test_contest.type,
            "platform": test_contest.platform,
            "status": current_status,
            "participants": participant_count,
            "problems_count": len(test_contest.problems) if test_contest.problems else 0,
            "is_creator": str(test_contest.created_by.id) == str(user.id),
            "created_by": {
                "id": str(test_contest.created_by.id) if test_contest.created_by else None,
                "name": test_contest.created_by.name if test_contest.created_by else None,
                "email": test_contest.created_by.email if test_contest.created_by else None
            } if test_contest.created_by else None,
            "editorial_published": test_contest.editorial_published,
            "testers_count": len(test_contest.testers),
            "access": {
                "can_access": can_access,
                "is_registered": is_registered,
                "can_register": current_status in ["upcoming", "live"]
            },
            "is_test_contest": True
        }
        
        return Response(response_data)

class TestContestRegisterAPIView(APIView):
    """Register for a test contest"""
    
    def post(self, request, test_contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            test_contest = TestContest.objects.get(id=test_contest_id)
        except TestContest.DoesNotExist:
            return Response({"error": "Test contest not found"}, status=404)
        
        # Check if user is authorized to register (tester or creator)
        if user.email not in test_contest.testers and str(test_contest.created_by.id) != str(user.id):
            return Response({
                "error": "Access denied",
                "message": "You are not authorized to register for this test contest"
            }, status=403)
        
        # Check contest status
        current_status = get_test_contest_status(test_contest)
        if current_status not in ["upcoming", "live"]:
            return Response({"error": "Registration is closed for this test contest"}, status=400)
        
        # Check if already registered
        existing = TestContestRegistration.objects(user=user, contest=test_contest).first()
        if existing:
            return Response({"message": "Already registered"}, status=200)
        
        # Create registration
        registration = TestContestRegistration(user=user, contest=test_contest)
        try:
            registration.save()
        except Exception as e:
            return Response({"error": str(e)}, status=400)
        
        return Response({"message": "Successfully registered for test contest"}, status=201)

class TestContestProblemsAPIView(APIView):
    """Get problems for a test contest"""
    
    def get(self, request, test_contest_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            test_contest = TestContest.objects.get(id=test_contest_id)
        except TestContest.DoesNotExist:
            return Response({"error": "Test contest not found"}, status=404)
        
        # Check access
        if user.email not in test_contest.testers and str(test_contest.created_by.id) != str(user.id):
            return Response({
                "error": "Access denied",
                "message": "You are not authorized to view this test contest"
            }, status=403)
        
        # Check registration for live/upcoming contests
        current_status = get_test_contest_status(test_contest)
        if current_status in ["upcoming", "live"]:
            is_registered = TestContestRegistration.objects.filter(
                user=user, contest=test_contest
            ).first()
            if not is_registered:
                return Response({
                    "error": "Registration required",
                    "message": "You need to register for this test contest"
                }, status=403)
        
        # Prepare problems list
        problems_list = []
        for idx, problem in enumerate(test_contest.problems):
            problem_data = {
                "id": idx + 1,
                "problem_id": problem.index,
                "title": problem.title,
                "slug": f"problem-{problem.index.lower()}",
                "code": problem.index,
                "difficulty": problem.difficulty or "Medium",
                "time_limit": problem.time_limit_seconds,
                "memory_limit": problem.memory_limit_mb,
                "tags": problem.tags,
                "points": getattr(problem, 'points', 0) or 0,
                "solved_count": 0,
                "attempted_count": 0,
                "status": "unsolved"
            }
            problems_list.append(problem_data)
        
        # Contest info
        participant_count = TestContestRegistration.objects(contest=test_contest).count()
        
        contest_info = {
            "id": str(test_contest.id),
            "title": test_contest.title,
            "status": current_status,
            "start_time": test_contest.test_start_time.isoformat(),
            "duration": test_contest.duration,
            "platform": test_contest.platform,
            "type": test_contest.type,
            "description": test_contest.description,
            "total_problems": len(test_contest.problems),
            "participants": participant_count,
            "is_test_contest": True
        }
        
        return Response({
            "problems": problems_list,
            "contest_info": contest_info
        })

class TestContestProblemDetailAPIView(APIView):
    """Get specific problem details from test contest"""
    
    def get(self, request, test_contest_id, problem_index):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            test_contest = TestContest.objects.get(id=test_contest_id)
        except TestContest.DoesNotExist:
            return Response({"error": "Test contest not found"}, status=404)
        
        # Check access
        if user.email not in test_contest.testers and str(test_contest.created_by.id) != str(user.id):
            return Response({
                "error": "Access denied",
                "message": "You are not authorized to view this test contest"
            }, status=403)
        
        # Check registration for live/upcoming contests
        current_status = get_test_contest_status(test_contest)
        if current_status in ["upcoming", "live"]:
            is_registered = TestContestRegistration.objects.filter(
                user=user, contest=test_contest
            ).first()
            if not is_registered:
                return Response({
                    "error": "Registration required",
                    "message": "You need to register for this test contest"
                }, status=403)
        
        # Find the problem
        problem = None
        for p in test_contest.problems:
            if p.index == problem_index.upper():
                problem = p
                break
        
        if not problem:
            return Response({"error": "Problem not found"}, status=404)
        
        # Prepare problem data
        problem_data = {
            "contest_id": str(test_contest.id),
            "contest_title": test_contest.title,
            "problem_index": problem.index,
            "problem_code": problem.index,
            "title": problem.title,
            "contest_status": current_status,
            "contest_platform": test_contest.platform,
            "contest_type": test_contest.type,
            "statement": problem.statement,
            "input_format": "",
            "output_format": "",
            "constraints": "",
            "time_limit": problem.time_limit_seconds,
            "memory_limit": problem.memory_limit_mb,
            "difficulty": problem.difficulty or "Medium",
            "tags": problem.tags,
            "tutorial": problem.tutorial or "",
            "tutorial_available": bool(problem.tutorial and problem.tutorial.strip()),
            "points": getattr(problem, 'points', 0) or 0,
            "sample_test_cases": [],
            "test_cases": [],
            "is_test_contest": True
        }
        
        # Add sample test cases
        for test_case in problem.test_cases:
            if test_case.sample and not getattr(test_case, 'hidden', False):
                problem_data["sample_test_cases"].append({
                    "input": test_case.input,
                    "output": test_case.output,
                    "explanation": test_case.explanation
                })
        
        # Add full test cases if user is creator
        if str(test_contest.created_by.id) == str(user.id):
            problem_data["test_cases"] = [
                {
                    "input": tc.input,
                    "output": tc.output,
                    "explanation": tc.explanation,
                    "sample": tc.sample,
                    "hidden": getattr(tc, 'hidden', False)
                }
                for tc in problem.test_cases
            ]
        
        return Response(problem_data)

class UserTestContestsAPIView(APIView):
    """Get test contests accessible to the user"""
    
    def get(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        # Get test contests where user is tester or creator
        test_contests = TestContest.objects.filter(
            __raw__={
                "$or": [
                    {"testers": user.email},
                    {"created_by": user.id}
                ]
            }
        ).order_by("-test_start_time").limit(100)
        
        data = []
        for tc in test_contests:
            status_value = get_test_contest_status(tc)
            tc.status = status_value
            tc.save()
            
            participant_count = TestContestRegistration.objects(contest=tc).count()
            is_registered = bool(TestContestRegistration.objects(user=user, contest=tc).first())
            
            data.append({
                "id": str(tc.id),
                "title": tc.title,
                "description": tc.description,
                "start_time": tc.test_start_time.isoformat() if tc.test_start_time else None,
                "duration": tc.duration,
                "type": tc.type,
                "platform": tc.platform,
                "created_by": str(tc.created_by.id) if tc.created_by else None,
                "is_creator": user and tc.created_by and str(tc.created_by.id) == str(user.id),
                "status": status_value,
                "participants": participant_count,
                "is_registered": is_registered,
                "is_test_contest": True,
                "original_contest_id": str(tc.original_contest.id) if tc.original_contest else None,
                "testers_count": len(tc.testers)
            })
        
        return Response({"test_contests": data})
    

    