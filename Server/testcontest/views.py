# testcontest/views.py
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta
from mongoengine.errors import ValidationError as MEValidationError
import pytz
from django.utils import timezone

from .models import TestContest, TestContestSubmission
from .serializers import TestContestCreateSerializer, TestContestSerializer, TestContestSubmissionCreateSerializer
from contest.models import Contest, ContestProblem, TestCase
from contest.utils.auth import get_user_from_request
from account.models import Account

# Import from contest app to reuse functionality
from contest.views import get_contest_status as get_regular_contest_status
from contest.broadcast import broadcast_contest_update, broadcast_global_update

# JDoodle credentials (add these near the top of your views.py after other imports)
JD_CLIENT_ID = "6c83bb2cd0b9e9a790f59a2484011318"
JD_CLIENT_SECRET = "2b433bdfaaa947357b8e1e7b22d9facd9fe829f6921fa9f6de2db4a0142319d4"
JD_URL = "https://api.jdoodle.com/v1/execute"

# Map for language -> recommended versionIndex
LANGUAGE_VERSION_MAP = {
    "python": "3",
    "python3": "3",
    "java": "4",
    "c": "5",
    "cpp": "5",
    "javascript": "4"
}

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
                registration_required=False,  # CHANGE THIS: Test contests don't need registration
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
        
        # No registration needed for test contests
        is_registered = True
        
        # Calculate current status
        current_status = get_test_contest_status(test_contest)
        test_contest.status = current_status
        test_contest.save()
        
        # Count testers instead of registrations
        participant_count = len(test_contest.testers)
        
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
                "can_register": False  # No registration needed
            },
            "is_test_contest": True
        }
        
        return Response(response_data)

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
        
        # No registration needed for test contests
        current_status = get_test_contest_status(test_contest)
        
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
        
        # Contest info - count testers
        participant_count = len(test_contest.testers)
        
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
            
            participant_count = len(tc.testers)
            is_registered = True
            
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
    
# testcontest/views.py - Add these imports at the top
from datetime import datetime, timedelta
import requests
from django.conf import settings
from mongoengine.queryset.visitor import Q

# Add these classes after existing views

class TestContestSubmissionCreateAPIView(APIView):
    """Create a submission in test contest"""
    
    def post(self, request):
        serializer = TestContestSubmissionCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        data = serializer.validated_data
        user = data['user']
        test_contest = data['test_contest']
        problem_index = data['problem_index'].upper()
        
        # Calculate test contest time
        current_time = datetime.now()
        test_contest_time = 0
        if test_contest.test_start_time:
            time_diff = current_time - test_contest.test_start_time
            test_contest_time = time_diff.total_seconds() / 60
        
        # Instead of calling the contest API, process directly here
        # Find the problem
        problem = None
        for p in test_contest.problems:
            if p.index == problem_index.upper():
                problem = p
                break
        
        if not problem:
            return Response({"error": "Problem not found"}, status=404)
        
        # Create test contest submission record
        test_submission = TestContestSubmission(
            test_contest=test_contest,
            user=user,
            problem_index=problem_index,
            problem_code=data['problem_code'],
            problem_title=data['problem_title'],
            code=data['code'][:1000],  # Store first 1000 chars
            language=data['language'],
            verdict='RUNNING',
            submitted_at=current_time,
            test_contest_time=test_contest_time
        )
        
        try:
            test_submission.save()
        except Exception as e:
            return Response({"error": f"Failed to create test submission: {str(e)}"}, status=500)
        
        # DIRECT EXECUTION (reuse contest execution logic)
        # Import the actual execution logic from compiler views
        from compiler.views import CodeExecuteAPIView, LANGUAGE_VERSION_MAP
        
        try:
            # Prepare payload for JDoodle
            language = data['language'].lower()
            version_index = LANGUAGE_VERSION_MAP.get(language, "0")
            
            # Test each test case
            all_passed = True
            failed_test_case = None
            actual_output = ""
            passed_count = 0
            total_test_cases = len(problem.test_cases)
            error_message = None
            compile_output = None
            max_execution_time = 0
            max_memory_used = 0
            verdict = "RUNNING"
            
            # Test each test case (similar to ContestProblemExecuteAPIView)
            for i, test_case in enumerate(problem.test_cases):
                # Execute code with this test case
                payload = {
                    "clientId": "6c83bb2cd0b9e9a790f59a2484011318",  # Your JDoodle ID
                    "clientSecret": "2b433bdfaaa947357b8e1e7b22d9facd9fe829f6921fa9f6de2db4a0142319d4",
                    "script": data['code'],
                    "stdin": test_case.input,
                    "language": language,
                    "versionIndex": version_index
                }
                
                try:
                    res = requests.post("https://api.jdoodle.com/v1/execute", 
                                      json=payload, timeout=15)
                    res_data = res.json()
                    
                    jdoodle_output = res_data.get("output", "").strip()
                    cpu_time_str = res_data.get("cpuTime")
                    if cpu_time_str is None:
                        cpu_time_seconds = 0.1
                    else:
                        cpu_time_seconds = float(cpu_time_str)
                    cpu_time_ms = int(cpu_time_seconds * 1000)
                    memory_kb = int(res_data.get("memory", 0))
                    status_code = res_data.get("statusCode", 200)
                    is_execution_success = res_data.get("isExecutionSuccess", False)
                    
                    # Update max values
                    max_execution_time = max(max_execution_time, cpu_time_ms)
                    max_memory_used = max(max_memory_used, memory_kb)
                    
                    # Check for compilation error
                    if status_code == 400 or not is_execution_success:
                        all_passed = False
                        compile_output = jdoodle_output
                        verdict = "CE"
                        break
                    
                    # For first test case, save output
                    if i == 0:
                        actual_output = jdoodle_output
                    
                    # Check time limit
                    time_limit_ms = problem.time_limit_seconds * 1000
                    if cpu_time_ms > time_limit_ms:
                        all_passed = False
                        verdict = "TLE"
                        error_message = f"Time limit exceeded: {cpu_time_ms}ms > {time_limit_ms}ms"
                        break
                    
                    # Check memory limit
                    memory_limit_kb = problem.memory_limit_mb * 1024
                    if memory_kb > memory_limit_kb:
                        all_passed = False
                        verdict = "MLE"
                        error_message = f"Memory limit exceeded: {memory_kb}KB > {memory_limit_kb}KB"
                        break
                    
                    # Check if output matches expected
                    expected_output = test_case.output.strip()
                    if jdoodle_output == expected_output:
                        passed_count += 1
                    else:
                        all_passed = False
                        failed_test_case = i + 1
                        verdict = "WA"
                        error_message = f"Test case {i+1} failed\nExpected: {expected_output}\nGot: {jdoodle_output}"
                        break
                        
                except requests.exceptions.Timeout:
                    all_passed = False
                    verdict = "TLE"
                    error_message = "Execution timeout (15 seconds)"
                    break
                except Exception as e:
                    all_passed = False
                    verdict = "SE"
                    error_message = f"System error: {str(e)}"
                    break
            
            # Determine final verdict
            if all_passed:
                verdict = "AC"
                status_msg = "Accepted"
            elif verdict == "RUNNING":
                verdict = "WA"
                status_msg = f"Wrong Answer on test case {failed_test_case}"
            else:
                status_msg = verdict
            
            # Update submission with results
            test_submission.verdict = verdict
            test_submission.passed_test_cases = passed_count
            test_submission.total_test_cases = total_test_cases
            test_submission.failed_test_case = failed_test_case if not all_passed else -1
            test_submission.error_message = error_message
            test_submission.compile_output = compile_output
            test_submission.judged_at = datetime.now()
            test_submission.execution_time = max_execution_time
            test_submission.memory = max_memory_used
            
            test_submission.save()
            
            return Response({
                "message": "Test contest submission processed successfully",
                "test_submission_id": str(test_submission.id),
                "test_contest_time": test_contest_time,
                "verdict": verdict,
                "status": status_msg,
                "output": actual_output or error_message or compile_output or "No output",
                "all_passed": all_passed,
                "passed_test_cases": passed_count,
                "total_test_cases": total_test_cases,
                "failed_test_case": failed_test_case,
                "execution_time": max_execution_time,
                "memory_used": max_memory_used,
                "time_limit": problem.time_limit_seconds * 1000,
                "memory_limit": problem.memory_limit_mb * 1024,
                "is_test_contest": True
            }, status=201)
            
        except Exception as e:
            test_submission.verdict = 'SE'
            test_submission.error_message = f"System error: {str(e)}"
            test_submission.judged_at = datetime.now()
            test_submission.save()
            
            return Response({
                "error": f"Test contest submission error: {str(e)}",
                "test_submission_id": str(test_submission.id)
            }, status=500)
        
# class TestContestExecuteAPIView(APIView):
#     """Direct code execution for test contests (without problem context)"""
    
#     def post(self, request, test_contest_id):
#         # Authenticate user
#         user = get_user_from_request(request)
#         if not user:
#             return Response({"error": "Authentication required"}, status=401)
        
#         # Get test contest
#         try:
#             test_contest = TestContest.objects.get(id=test_contest_id)
#         except TestContest.DoesNotExist:
#             return Response({"error": "Test contest not found"}, status=404)
        
#         # Check access
#         if user.email not in test_contest.testers and str(test_contest.created_by.id) != str(user.id):
#             return Response({"error": "Access denied to test contest"}, status=403)
        
#         # Check test contest status - allow execution even if not live for "Run" button
#         # current_status = get_test_contest_status(test_contest)
#         # if current_status != "live":
#         #     return Response({"error": f"Test contest is not live (current status: {current_status})"}, status=400)
        
#         # Get code execution parameters from request
#         code = request.data.get('code')
#         language = request.data.get('language')
#         input_data = request.data.get('input_data', '')
#         expected_output = request.data.get('expected_output', '')
        
#         if not code or not language:
#             return Response({"error": "Missing code or language"}, status=400)
        
#         # Use JDoodle API directly (copy from compiler/views.py)
#         # JDoodle credentials
#         JD_CLIENT_ID = "6c83bb2cd0b9e9a790f59a2484011318"
#         JD_CLIENT_SECRET = "2b433bdfaaa947357b8e1e7b22d9facd9fe829f6921fa9f6de2db4a0142319d4"
#         JD_URL = "https://api.jdoodle.com/v1/execute"
        
#         # Map for language -> recommended versionIndex
#         LANGUAGE_VERSION_MAP = {
#             "python": "3",
#             "python3": "3",
#             "java": "4",
#             "c": "5",
#             "cpp": "5",
#             "javascript": "4"
#         }
        
#         language_lower = language.lower()
#         version_index = LANGUAGE_VERSION_MAP.get(language_lower, "0")
        
#         # JDoodle payload
#         payload = {
#             "clientId": JD_CLIENT_ID,
#             "clientSecret": JD_CLIENT_SECRET,
#             "script": code,
#             "stdin": input_data,
#             "language": language_lower,
#             "versionIndex": version_index
#         }
        
#         try:
#             res = requests.post(JD_URL, json=payload, timeout=15)
#             res_data = res.json()
            
#             jdoodle_output = res_data.get("output", "").strip()
#             cpu_time_str = res_data.get("cpuTime")
#             cpu_time_seconds = 0.0 if cpu_time_str is None else float(cpu_time_str)
#             cpu_time_ms = int(cpu_time_seconds * 1000)
#             memory_kb = int(res_data.get("memory", 0))
#             status_code = res_data.get("statusCode", 200)
#             is_execution_success = res_data.get("isExecutionSuccess", False)
            
#             # Check expected output if provided
#             verdict = "OK"
#             if expected_output:
#                 verdict = "AC" if jdoodle_output == expected_output.strip() else "WA"
            
#             # Check for compilation/runtime errors
#             status = "success" if is_execution_success else "error"
#             if status_code == 400:
#                 status = "compilation_error"
#             elif not is_execution_success:
#                 status = "runtime_error"
            
#             # Return response
#             return Response({
#                 "submission_id": None,  # No submission ID for direct execution
#                 "contest_id": str(test_contest.original_contest.id),
#                 "test_contest_id": test_contest_id,
#                 "problem_id": None,  # No problem for direct execution
#                 "output": jdoodle_output,
#                 "status": status,
#                 "verdict": verdict,
#                 "execution_time_ms": cpu_time_ms,
#                 "execution_time_seconds": cpu_time_seconds,
#                 "memory_kb": memory_kb,
#                 "memory_mb": round(memory_kb / 1024, 2),
#                 "status_code": status_code,
#                 "is_execution_success": is_execution_success,
#                 "is_test_contest": True,
#                 "jdoodle_response": res_data
#             })
            
#         except requests.exceptions.Timeout:
#             return Response({
#                 "error": "Execution timeout (15 seconds)",
#                 "is_test_contest": True
#             }, status=408)
            
#         except Exception as e:
#             return Response({
#                 "error": f"Execution error: {str(e)}",
#                 "is_test_contest": True
#             }, status=500)

class TestContestExecuteAPIView(APIView):
    """Direct code execution for test contests (runs ALL test cases like main judge)"""

    def post(self, request, test_contest_id, problem_index=None):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        try:
            test_contest = TestContest.objects.get(id=test_contest_id)
        except TestContest.DoesNotExist:
            return Response({"error": "Test contest not found"}, status=404)

        if user.email not in test_contest.testers and str(test_contest.created_by.id) != str(user.id):
            return Response({"error": "Access denied to test contest"}, status=403)

        code = request.data.get("code")
        language = request.data.get("language", "").lower()
        problem_index = request.data.get("problem_index")

        if not code or not language or not problem_index:
            return Response({"error": "Missing code, language, or problem index"}, status=400)

        problem = None
        for p in test_contest.problems:
            if p.index == problem_index.upper():
                problem = p
                break

        if not problem:
            return Response({"error": "Problem not found in test contest"}, status=404)

        test_cases = problem.test_cases
        if not test_cases:
            return Response({"error": "No test cases found"}, status=400)

        LANGUAGE_VERSION_MAP = {
            "python": "3",
            "python3": "3",
            "java": "4",
            "c": "5",
            "cpp": "5",
            "javascript": "4"
        }

        version_index = LANGUAGE_VERSION_MAP.get(language, "0")

        all_passed = True
        passed_count = 0
        failed_test_case = None
        total_test_cases = len(test_cases)

        final_verdict = "OK"
        error_message = None
        compile_output = None

        max_execution_time = 0
        max_memory_used = 0
        test_case_outputs = []

        for i, tc in enumerate(test_cases):
            payload = {
                "clientId": JD_CLIENT_ID,
                "clientSecret": JD_CLIENT_SECRET,
                "script": code,
                "stdin": tc.input,
                "language": language,
                "versionIndex": version_index
            }

            try:
                res = requests.post(JD_URL, json=payload, timeout=15)
                res_data = res.json()

                output = res_data.get("output", "").strip()
                cpu_time_ms = int(float(res_data.get("cpuTime") or 0) * 1000)
                memory_kb = int(res_data.get("memory", 0))
                status_code = res_data.get("statusCode", 200)
                success = res_data.get("isExecutionSuccess", False)

                max_execution_time = max(max_execution_time, cpu_time_ms)
                max_memory_used = max(max_memory_used, memory_kb)

                expected = tc.output.strip()

                if status_code == 400 or not success:
                    all_passed = False
                    final_verdict = "CE" if status_code == 400 else "RE"
                    compile_output = output
                    error_message = "Compilation Error" if status_code == 400 else "Runtime Error"

                    test_case_outputs.append({
                        "test_case": i + 1,
                        "input": tc.input,
                        "expected": expected,
                        "actual": output,
                        "passed": False,
                        "error": error_message
                    })
                    break

                passed = output == expected

                test_case_outputs.append({
                    "test_case": i + 1,
                    "input": tc.input,
                    "expected": expected,
                    "actual": output,
                    "passed": passed,
                    "cpu_time_ms": cpu_time_ms,
                    "memory_kb": memory_kb
                })

                if passed:
                    passed_count += 1
                else:
                    all_passed = False
                    if failed_test_case is None:
                        failed_test_case = i + 1
                    if final_verdict == "OK":
                        final_verdict = "WA"

                if cpu_time_ms > problem.time_limit_seconds * 1000 and final_verdict == "OK":
                    all_passed = False
                    final_verdict = "TLE"

                if memory_kb > problem.memory_limit_mb * 1024 and final_verdict == "OK":
                    all_passed = False
                    final_verdict = "MLE"

            except requests.exceptions.Timeout:
                all_passed = False
                final_verdict = "TLE"

                test_case_outputs.append({
                    "test_case": i + 1,
                    "input": tc.input,
                    "expected": tc.output.strip(),
                    "actual": None,
                    "passed": False,
                    "error": "Timeout"
                })
                break

            except Exception as e:
                all_passed = False
                final_verdict = "SE"

                test_case_outputs.append({
                    "test_case": i + 1,
                    "input": tc.input,
                    "expected": tc.output.strip(),
                    "actual": None,
                    "passed": False,
                    "error": str(e)
                })
                break

        if all_passed:
            final_verdict = "AC"

        return Response({
            "test_contest_id": str(test_contest.id),
            "problem_index": problem_index,
            "verdict": final_verdict,
            "all_passed": all_passed,
            "passed_test_cases": passed_count,
            "total_test_cases": total_test_cases,
            "failed_test_case": failed_test_case,
            "execution_time": max_execution_time,
            "memory_used": max_memory_used,
            "test_case_outputs": test_case_outputs,
            "is_test_contest": True
        })

class TestContestProblemExecuteAPIView(APIView):
    """Execute code for a specific problem in test contest"""
    
    def post(self, request, test_contest_id, problem_index):
        # Authenticate user
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        # Get test contest
        try:
            test_contest = TestContest.objects.get(id=test_contest_id)
        except TestContest.DoesNotExist:
            return Response({"error": "Test contest not found"}, status=404)
        
        # Check access
        if user.email not in test_contest.testers and str(test_contest.created_by.id) != str(user.id):
            return Response({"error": "Access denied to test contest"}, status=403)
        
        # Check test contest status
        current_status = get_test_contest_status(test_contest)
        if current_status != "live":
            return Response({"error": f"Test contest is not live (current status: {current_status})"}, status=400)
        
        # Find the problem in test contest
        problem = None
        for p in test_contest.problems:
            if p.index == problem_index.upper():
                problem = p
                break
        
        if not problem:
            return Response({"error": "Problem not found in test contest"}, status=404)
        
        # Get code execution parameters
        code = request.data.get('code')
        language = request.data.get('language')
        input_data = request.data.get('input_data', '')
        expected_output = request.data.get('expected_output', '')
        
        if not code or not language:
            return Response({"error": "Missing code or language"}, status=400)
        
        # DIRECT EXECUTION LOGIC (copied from compiler/views.py)
        language_lower = language.lower()
        version_index = LANGUAGE_VERSION_MAP.get(language_lower, "0")
        
        # Get current time
        current_time = datetime.now()
        
        # Calculate test contest time
        test_contest_time = 0
        if test_contest.test_start_time:
            time_diff = current_time - test_contest.test_start_time
            test_contest_time = time_diff.total_seconds() / 60
        
        # Create test contest submission record
        test_submission = TestContestSubmission(
            test_contest=test_contest,
            user=user,
            problem_index=problem_index.upper(),
            problem_code=problem.index,
            problem_title=problem.title,
            code=code[:1000],  # Store first 1000 chars
            language=language,
            verdict='RUNNING',
            submitted_at=current_time,
            test_contest_time=test_contest_time
        )
        
        try:
            test_submission.save()
        except Exception as e:
            return Response({"error": f"Failed to create test submission: {str(e)}"}, status=500)
        
        # Test against problem test cases
        all_passed = True
        failed_test_case = None
        actual_output = ""
        passed_count = 0
        total_test_cases = len(problem.test_cases)
        error_message = None
        compile_output = None
        max_execution_time = 0
        max_memory_used = 0
        verdict = "RUNNING"
        
        # Test each test case (similar to ContestProblemExecuteAPIView)
        for i, test_case in enumerate(problem.test_cases):
            # Execute code with this test case
            payload = {
                "clientId": JD_CLIENT_ID,
                "clientSecret": JD_CLIENT_SECRET,
                "script": code,
                "stdin": test_case.input,
                "language": language_lower,
                "versionIndex": version_index
            }
            
            try:
                res = requests.post(JD_URL, json=payload, timeout=15)
                res_data = res.json()
                
                jdoodle_output = res_data.get("output", "").strip()
                cpu_time_str = res_data.get("cpuTime")
                
                # Handle None cpuTime
                if cpu_time_str is None:
                    cpu_time_seconds = 0.0
                else:
                    cpu_time_seconds = float(cpu_time_str)
                    
                cpu_time_ms = int(cpu_time_seconds * 1000)
                memory_kb = int(res_data.get("memory", 0))
                status_code = res_data.get("statusCode", 200)
                is_execution_success = res_data.get("isExecutionSuccess", False)
                
                # Update max values
                max_execution_time = max(max_execution_time, cpu_time_ms)
                max_memory_used = max(max_memory_used, memory_kb)
                
                # Check for compilation error
                if status_code == 400 or not is_execution_success:
                    all_passed = False
                    compile_output = jdoodle_output
                    verdict = "CE"
                    break
                
                # For first test case, save output for display
                if i == 0:
                    actual_output = jdoodle_output
                
                # Check time limit
                time_limit_ms = problem.time_limit_seconds * 1000
                if cpu_time_ms > time_limit_ms:
                    all_passed = False
                    verdict = "TLE"
                    error_message = f"Time limit exceeded: {cpu_time_ms}ms > {time_limit_ms}ms"
                    break
                
                # Check memory limit
                memory_limit_kb = problem.memory_limit_mb * 1024
                if memory_kb > memory_limit_kb:
                    all_passed = False
                    verdict = "MLE"
                    error_message = f"Memory limit exceeded: {memory_kb}KB > {memory_limit_kb}KB"
                    break
                
                # Check if output matches expected
                expected_test_output = test_case.output.strip()
                if jdoodle_output == expected_test_output:
                    passed_count += 1
                else:
                    all_passed = False
                    failed_test_case = i + 1
                    verdict = "WA"
                    error_message = f"Test case {i+1} failed\nExpected: {expected_test_output}\nGot: {jdoodle_output}"
                    break
                    
            except requests.exceptions.Timeout:
                all_passed = False
                verdict = "TLE"
                error_message = "Execution timeout (15 seconds)"
                break
            except Exception as e:
                all_passed = False
                verdict = "SE"
                error_message = f"System error: {str(e)}"
                break
        
        # Determine final verdict
        if all_passed:
            verdict = "AC"
            status_msg = "Accepted"
        elif verdict == "RUNNING":
            verdict = "WA"
            status_msg = f"Wrong Answer on test case {failed_test_case}"
        else:
            status_msg = verdict
        
        # Update submission with results
        test_submission.verdict = verdict
        test_submission.passed_test_cases = passed_count
        test_submission.total_test_cases = total_test_cases
        test_submission.failed_test_case = failed_test_case if not all_passed else -1
        test_submission.error_message = error_message
        test_submission.compile_output = compile_output
        test_submission.judged_at = datetime.now()
        test_submission.execution_time = max_execution_time
        test_submission.memory = max_memory_used
        
        test_submission.save()
        
        # Also save to CodeSubmission for debugging (optional)
        try:
            from compiler.models import CodeSubmission
            code_submission = CodeSubmission(
                user=user,
                language=language_lower,
                version_index=version_index,
                code=code,
                input_data=input_data,
                output=actual_output or error_message or compile_output or "",
                status="success" if all_passed else "error",
                verdict=verdict,
                execution_time_ms=max_execution_time,
                execution_time_seconds=max_execution_time / 1000 if max_execution_time > 0 else 0,
                memory_kb=max_memory_used,
                memory_mb=round(max_memory_used / 1024, 2) if max_memory_used > 0 else 0,
                status_code=200 if all_passed else 400,
                is_execution_success=all_passed
            )
            code_submission.save()
        except Exception:
            pass  # Silently ignore if CodeSubmission fails
        
        return Response({
            "message": "Test contest submission processed successfully",
            "test_submission_id": str(test_submission.id),
            "test_contest_time": test_contest_time,
            "verdict": verdict,
            "status": status_msg,
            "output": actual_output or error_message or compile_output or "No output",
            "all_passed": all_passed,
            "passed_test_cases": passed_count,
            "total_test_cases": total_test_cases,
            "failed_test_case": failed_test_case,
            "execution_time": max_execution_time,
            "memory_used": max_memory_used,
            "time_limit": problem.time_limit_seconds * 1000,
            "memory_limit": problem.memory_limit_mb * 1024,
            "is_test_contest": True
        })

class TestContestSubmissionsAPIView(APIView):
    """Get submissions for a test contest"""
    
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
            return Response({"error": "Access denied to test contest"}, status=403)
        
        # Get query parameters
        filter_type = request.GET.get('filter', 'my')  # 'my' or 'all'
        verdict = request.GET.get('verdict', 'all')
        problem = request.GET.get('problem', 'all')
        limit = int(request.GET.get('limit', 50))
        skip = int(request.GET.get('skip', 0))
        
        # Build query
        query = Q(test_contest=test_contest)
        
        # Apply user filter
        if filter_type == 'my':
            query &= Q(user=user)
        
        # Apply verdict filter
        if verdict != 'all':
            query &= Q(verdict=verdict)
        
        # Apply problem filter
        if problem != 'all':
            query &= Q(problem_index=problem)
        
        # Fetch submissions
        submissions = TestContestSubmission.objects(query).order_by('-submitted_at').skip(skip).limit(limit)
        
        # Serialize data
        submissions_data = []
        for submission in submissions:
            sub_data = submission.to_dict()
            sub_data['can_view_code'] = sub_data['user_id'] == str(user.id)
            sub_data['is_current_user'] = sub_data['user_id'] == str(user.id)
            sub_data['user_rating'] = getattr(submission.user, 'rating', 1500)
            sub_data['user_name'] = getattr(submission.user, 'name', 'Anonymous')
            submissions_data.append(sub_data)
        
        # Get available problems for filtering
        problems_list = []
        for p in test_contest.problems:
            problems_list.append({
                'code': p.index,
                'title': p.title,
                'value': p.index
            })
        
        # Get contest status
        contest_status_value = get_test_contest_status(test_contest)
        contest_ended = contest_status_value == 'past'
        
        return Response({
            'submissions': submissions_data,
            'total': TestContestSubmission.objects(query).count(),
            'current_user_id': str(user.id),
            'current_user_name': user.name or "You",  # FIXED: use name, not username
            'contest_ended': contest_ended,  # ADD THIS
            'contest_status': contest_status_value,  # ADD THIS
            'filters': {
                'problems': problems_list,
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
            'test_contest_id': str(test_contest.id),
            'test_contest_title': test_contest.title,
            'test_contest_status': contest_status_value
        })

class TestContestSubmissionDetailAPIView(APIView):
    """Get details of a specific test contest submission"""
    
    def get(self, request, test_contest_id, submission_id):
        try:
            submission = TestContestSubmission.objects.get(id=submission_id)
        except TestContestSubmission.DoesNotExist:
            return Response({"error": "Submission not found"}, status=404)
        
        # Verify the submission belongs to the test contest
        if str(submission.test_contest.id) != test_contest_id:
            return Response({"error": "Submission does not belong to this test contest"}, status=400)
        
        user = get_user_from_request(request)
        
        # Check access - only the submitter or test contest creator can view
        can_view = False
        if user:
            if str(submission.user.id) == str(user.id):
                can_view = True
            elif str(submission.test_contest.created_by.id) == str(user.id):
                can_view = True
            elif user.email in submission.test_contest.testers:
                can_view = True
        
        if not can_view:
            return Response({"error": "Access denied to this submission"}, status=403)
        
        sub_data = submission.to_dict()
        sub_data['can_view_code'] = str(submission.user.id) == str(user.id)
        
        return Response(sub_data)
    
# testcontest/leaderboard_views.py
from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from mongoengine.queryset.visitor import Q

from contest.utils.auth import get_user_from_request
from .models import TestContest, TestContestSubmission
from .views import get_test_contest_status

class TestContestLeaderboardAPIView(APIView):
    """
    GET /test-contests/<test_contest_id>/standings/
    """
    
    def get(self, request, test_contest_id):
        print(f"\n🔍 DEBUG: Leaderboard access check")
        
        try:
            test_contest = TestContest.objects.get(id=test_contest_id)
        except TestContest.DoesNotExist:
            print(f"❌ Test contest not found: {test_contest_id}")
            return Response({"error": "Test contest not found"}, status=404)
        
        # Get current user
        current_user = get_user_from_request(request)
        
        if not current_user:
            print("❌ No authenticated user")
            return Response({"error": "Authentication required"}, status=401)
        
        
        # Check access
        can_access = False
        
        # Check if user is creator
        creator_id_str = str(test_contest.created_by.id)
        user_id_str = str(current_user.id)
        
        if creator_id_str == user_id_str:
            can_access = True
            print("   ✅ Creator access granted!")
        else:
            print("   ❌ User is NOT the creator (ID mismatch)")
        
        # Check if user is tester
        user_email = current_user.email
        is_tester = user_email in test_contest.testers
        
        if is_tester:
            can_access = True
            print("   ✅ Tester access granted!")
        
        print(f"\n🎯 Final Access Decision: {can_access}")
        
        if not can_access:
            print("❌ ACCESS DENIED")
            return Response({
                "error": "Access denied",
                "message": "You are not authorized to view this test contest leaderboard",
                "debug": {
                    "user_id": user_id_str,
                    "user_email": user_email,
                    "contest_creator_id": creator_id_str,
                    "contest_creator_email": test_contest.created_by.email,
                    "id_match": creator_id_str == user_id_str,
                    "is_tester": is_tester,
                    "testers_list": test_contest.testers
                }
            }, status=403)
        
        
        # Rest of your leaderboard code...
        
        contest_status = get_test_contest_status(test_contest)
        
        # ====== Test contest timing ======
        if test_contest.test_start_time and test_contest.duration:
            start_time_dhaka = test_contest.test_start_time
            contest_end_time = start_time_dhaka + timedelta(minutes=test_contest.duration * 60)
        else:
            start_time_dhaka = None
            contest_end_time = None
        
        # ====== Filter submissions within test contest duration ======
        if start_time_dhaka and contest_end_time:
            valid_submissions = TestContestSubmission.objects(
                test_contest=test_contest,
                submitted_at__gte=start_time_dhaka,
                submitted_at__lte=contest_end_time
            ).order_by("submitted_at")
        else:
            valid_submissions = TestContestSubmission.objects(test_contest=test_contest).order_by("submitted_at")
        
        # ====== Group submissions by user ======
        user_submissions = {}
        for submission in valid_submissions:
            user_id = str(submission.user.id)
            if user_id not in user_submissions:
                user_submissions[user_id] = {
                    "user": submission.user,
                    "submissions": []
                }
            user_submissions[user_id]["submissions"].append(submission)
        
        # ====== Get test contest problems ======
        actual_problems = sorted([p.index for p in test_contest.problems])
        problem_points = {p.index: getattr(p, "points", 100) for p in test_contest.problems}
        
        results = []
        
        for user_id, data in user_submissions.items():
            user = data["user"]
            problem_results = {}
            total_score = 0
            total_penalty = 0
            problems_solved = 0
            
            # Group submissions by problem
            problem_submissions = {}
            for sub in data["submissions"]:
                idx = sub.problem_index
                if idx not in problem_submissions:
                    problem_submissions[idx] = []
                problem_submissions[idx].append(sub)
            
            for problem_index, subs_list in problem_submissions.items():
                # Sort submissions by time
                subs_list.sort(key=lambda x: x.submitted_at)
                
                accepted = False
                tries = 0
                penalty = 0
                solved_time = 0
                points_earned = 0
                
                for sub in subs_list:
                    tries += 1
                    if sub.verdict == "AC":
                        accepted = True
                        if start_time_dhaka:
                            # Use test contest time if available, otherwise calculate from submitted_at
                            if sub.test_contest_time > 0:
                                solved_time = sub.test_contest_time
                            else:
                                solved_time = (sub.submitted_at - start_time_dhaka).total_seconds() / 60
                        
                        points_earned = problem_points.get(problem_index, 100)
                        if tries > 1:
                            penalty += (tries - 1) * 20  # 20 minutes penalty per wrong submission
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
                    "has_submissions": tries > 0,
                    "submissions": [str(s.id) for s in subs_list]  # CONVERT TO STRING
                }
                
                if accepted:
                    total_score += points_earned
                    total_penalty += time_penalty
                    problems_solved += 1
            
            is_current_user = str(current_user.id) == user_id if current_user else False
            user_rating = getattr(user, "rating", 1500)
            
            # Prepare submissions display for frontend
            submissions_display = []
            for problem in actual_problems:
                pdata = problem_results.get(problem, {})
                status = "NA"
                points = 0
                tries = 0
                
                if pdata:
                    tries = pdata.get("tries", 0)
                    if pdata.get("accepted"):
                        status = "AC"
                        points = pdata.get("points", 0)
                    elif tries > 0:
                        status = "WA"
                
                submissions_display.append({
                    "problem": problem,
                    "status": status,
                    "points": points,
                    "tries": tries
                })
            
            results.append({
                "rank": 0,  # Will be assigned after sorting
                "username": getattr(user, "username", getattr(user, "name", "Anonymous")),
                "name": getattr(user, "name", "Anonymous"),
                "country": getattr(user, "country", "Unknown"),
                "institution": getattr(user, "institution", "Unknown"),
                "score": total_score,
                "points": total_score,  # For compatibility with frontend
                "problemsSolved": problems_solved,
                "penalty": int(total_penalty),  # Ensure it's an integer
                "rating": user_rating,
                "ratingChange": 0,  # Test contests don't affect rating
                "isCurrentUser": is_current_user,
                "submissions": submissions_display,
                "problemResults": problem_results  # For debugging
            })
        
        # ====== Sort and assign ranks ======
        results.sort(key=lambda x: (-x["score"], x["penalty"]))
        
        last_score = last_penalty = None
        current_rank = 0
        for i, participant in enumerate(results):
            if participant["score"] != last_score or participant["penalty"] != last_penalty:
                current_rank = i + 1
                last_score = participant["score"]
                last_penalty = participant["penalty"]
            participant["rank"] = current_rank
        
        # ====== Prepare response ======
        response_data = {
            "leaderboard": results,
            "contest_status": contest_status,
            "total_participants": len(results),
            "problems": actual_problems,
            "contest_info": {
                "id": str(test_contest.id),
                "title": test_contest.title,
                "start_time": start_time_dhaka.isoformat() if start_time_dhaka else None,
                "end_time": contest_end_time.isoformat() if contest_end_time else None,
                "duration": test_contest.duration,
                "is_test_contest": True
            }
        }
        
        return Response(response_data)
    
        
    