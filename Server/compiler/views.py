import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
import pytz

from .models import CodeSubmission
from .serializers import CodeSubmissionSerializer
from contest.utils.auth import get_user_from_request

# Import submission models
from submission.models import Submission
from contest.models import Contest, ContestProblem

# JDoodle credentials
JD_CLIENT_ID = "fd5008b0be3517adb097999e752bdc36"
JD_CLIENT_SECRET = "99df47ceee2ae9af0137b30d0d7eebcdc3aac2fc400b16ef5298bff3576ad5e2"
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

# Dhaka timezone helper
def dhaka_now():
    dhaka_tz = pytz.timezone("Asia/Dhaka")
    return datetime.now(dhaka_tz)

class CodeExecuteAPIView(APIView):
    """Execute code via JDoodle API for testing (Run button)"""
    
    def post(self, request, contest_id=None, problem_id=None):
        # Authenticate user
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        # Validate input
        serializer = CodeSubmissionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        data = serializer.validated_data
        language = data["language"].lower()
        version_index = data.get("version_index") or LANGUAGE_VERSION_MAP.get(language, "0")
        
        # JDoodle payload
        payload = {
            "clientId": JD_CLIENT_ID,
            "clientSecret": JD_CLIENT_SECRET,
            "script": data["code"],
            "stdin": data.get("input_data", ""),
            "language": language,
            "versionIndex": version_index
        }
        
        try:
            res = requests.post(JD_URL, json=payload, timeout=15)
            res_data = res.json()
            
            jdoodle_output = res_data.get("output", "").strip()
            cpu_time_seconds = float(res_data.get("cpuTime", 0))
            cpu_time_ms = int(cpu_time_seconds * 1000)
            memory_kb = int(res_data.get("memory", 0))
            status_code = res_data.get("statusCode", 200)
            is_execution_success = res_data.get("isExecutionSuccess", False)
            
            # Check expected output if provided
            verdict = "OK"
            expected_output = data.get("expected_output", "").strip()
            if expected_output:
                verdict = "AC" if jdoodle_output == expected_output else "WA"
            
            # Check for compilation/runtime errors
            status = "success" if is_execution_success else "error"
            if status_code == 400:
                status = "compilation_error"
            elif not is_execution_success:
                status = "runtime_error"
            
            # Save to CodeSubmission for debugging
            code_submission = CodeSubmission(
                user=user,
                language=language,
                version_index=version_index,
                code=data["code"],
                input_data=data.get("input_data", ""),
                output=jdoodle_output,
                status=status,
                created_at=dhaka_now()
            )
            code_submission.save()
            
            return Response({
                "submission_id": str(code_submission.id),
                "contest_id": contest_id,
                "problem_id": problem_id,
                "output": jdoodle_output,
                "status": status,
                "verdict": verdict,
                "execution_time_ms": cpu_time_ms,
                "execution_time_seconds": cpu_time_seconds,
                "memory_kb": memory_kb,
                "memory_mb": round(memory_kb / 1024, 2),
                "status_code": status_code,
                "is_execution_success": is_execution_success,
                "jdoodle_response": res_data
            })
            
        except requests.exceptions.Timeout:
            error_msg = "Execution timeout (15 seconds)"
            code_submission = CodeSubmission(
                user=user,
                language=language,
                version_index=version_index,
                code=data["code"],
                input_data=data.get("input_data", ""),
                output=error_msg,
                status="timeout_error",
                created_at=dhaka_now()
            )
            code_submission.save()
            return Response({"error": error_msg}, status=408)
            
        except Exception as e:
            error_msg = str(e)
            code_submission = CodeSubmission(
                user=user,
                language=language,
                version_index=version_index,
                code=data["code"],
                input_data=data.get("input_data", ""),
                output=error_msg,
                status="system_error",
                created_at=dhaka_now()
            )
            code_submission.save()
            return Response({"error": error_msg}, status=500)

class ContestProblemExecuteAPIView(APIView):
    """Execute and judge code for a contest problem (Submit button)"""
    
    def post(self, request, contest_id, problem_index=None):
        # Authenticate user
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        # Get contest
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Find the problem
        problem = None
        problem_title = ""
        for p in contest.problems:
            if p.index == problem_index.upper():
                problem = p
                problem_title = p.title
                break
        
        if not problem:
            return Response({"error": "Problem not found"}, status=404)
        
        # Validate input
        serializer = CodeSubmissionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        data = serializer.validated_data
        language = data["language"].lower()
        version_index = data.get("version_index") or LANGUAGE_VERSION_MAP.get(language, "0")
        
        # Get current time in Dhaka
        dhaka_tz = pytz.timezone('Asia/Dhaka')
        current_time = datetime.now(dhaka_tz)
        
        # Calculate contest time
        contest_time = 0
        if contest.start_time:
            # Ensure both times are timezone aware
            if contest.start_time.tzinfo is None:
                start_time = dhaka_tz.localize(contest.start_time)
            else:
                start_time = contest.start_time.astimezone(dhaka_tz)
            
            if current_time.tzinfo is None:
                current_time = dhaka_tz.localize(current_time)
            
            contest_time_seconds = (current_time - start_time).total_seconds()
            contest_time = contest_time_seconds / 60.0
        
        # Initialize submission
        submission = Submission(
            user=user,
            contest=contest,
            problem_index=problem_index.upper(),
            problem_code=problem_index.upper(),
            problem_title=problem_title,
            language=language,
            code=data["code"],
            verdict='RUNNING',
            submitted_at=current_time,
            contest_time=contest_time,
            is_public=True
        )
        
        # Test against problem test cases
        all_passed = True
        failed_test_case = None
        actual_output = ""
        passed_count = 0
        total_test_cases = len(problem.test_cases)
        error_message = None
        compile_output = None
        max_execution_time = 0  # Track maximum execution time across test cases
        max_memory_used = 0     # Track maximum memory used across test cases
        verdict = "RUNNING"
        
        # Test each test case
        for i, test_case in enumerate(problem.test_cases):
            # Execute code with this test case
            payload = {
                "clientId": JD_CLIENT_ID,
                "clientSecret": JD_CLIENT_SECRET,
                "script": data["code"],
                "stdin": test_case.input,
                "language": language,
                "versionIndex": version_index
            }
            
            try:
                res = requests.post(JD_URL, json=payload, timeout=15)
                res_data = res.json()
                
                jdoodle_output = res_data.get("output", "").strip()
                cpu_time_seconds = float(res_data.get("cpuTime", 0))
                cpu_time_ms = int(cpu_time_seconds * 1000)
                memory_kb = int(res_data.get("memory", 0))
                status_code = res_data.get("statusCode", 200)
                is_execution_success = res_data.get("isExecutionSuccess", False)
                
                # Update max values
                max_execution_time = max(max_execution_time, cpu_time_ms)
                max_memory_used = max(max_memory_used, memory_kb)
                
                # Check for compilation error (status code 400 usually means compilation error)
                if status_code == 400 or not is_execution_success:
                    all_passed = False
                    compile_output = jdoodle_output
                    verdict = "CE"
                    break
                
                # For first test case, save output for display
                if i == 0:
                    actual_output = jdoodle_output
                
                # Check time limit (problem.time_limit_seconds is in seconds)
                time_limit_ms = problem.time_limit_seconds * 1000
                if cpu_time_ms > time_limit_ms:
                    all_passed = False
                    verdict = "TLE"
                    error_message = f"Time limit exceeded: {cpu_time_ms}ms > {time_limit_ms}ms"
                    break
                
                # Check memory limit (problem.memory_limit_mb is in MB, convert to KB)
                memory_limit_kb = problem.memory_limit_mb * 1024
                if memory_kb > memory_limit_kb:
                    all_passed = False
                    verdict = "MLE"
                    error_message = f"Memory limit exceeded: {memory_kb}KB > {memory_limit_kb}KB"
                    break
                
                # Check if output matches expected (strip whitespace)
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
        elif verdict == "RUNNING":  # If no specific verdict was set
            verdict = "WA"
            status_msg = f"Wrong Answer on test case {failed_test_case}"
        else:
            status_msg = verdict  # Use the verdict as status message
        
        # Update submission with results
        submission.verdict = verdict
        submission.passed_test_cases = passed_count
        submission.total_test_cases = total_test_cases
        submission.failed_test_case = failed_test_case if not all_passed else -1
        submission.error_message = error_message
        submission.compile_output = compile_output
        submission.judged_at = current_time
        submission.execution_time = max_execution_time
        submission.memory = max_memory_used
        
        try:
            submission.save()
        except Exception as e:
            return Response({"error": f"Failed to save submission: {str(e)}"}, status=500)
        
        # Also save to CodeSubmission for debugging
        code_submission = CodeSubmission(
            user=user,
            language=language,
            version_index=version_index,
            code=data["code"],
            input_data=data.get("input_data", ""),
            output=actual_output or error_message or compile_output or "",
            status="success" if all_passed else "error",
            created_at=current_time
        )
        code_submission.save()
        
        # Update user problem status
        from contest.views import broadcast_contest_update
        
        payload = {
            "event": "submission_update",
            "submission_id": str(submission.id),
            "problem_index": problem_index,
            "verdict": verdict,
            "user_id": str(user.id),
            "execution_time": max_execution_time,
            "memory_used": max_memory_used
        }
        
        try:
            broadcast_contest_update(contest_id, payload)
        except:
            pass  # Silently fail if broadcast fails
        
        return Response({
            "submission_id": str(submission.id),
            "code_submission_id": str(code_submission.id),
            "contest_id": str(contest.id),
            "problem_index": problem_index,
            "verdict": verdict,
            "status": status_msg,
            "output": actual_output or error_message or compile_output or "No output",
            "all_passed": all_passed,
            "passed_test_cases": passed_count,
            "total_test_cases": total_test_cases,
            "failed_test_case": failed_test_case,
            "contest_time": contest_time,
            "submitted_at": current_time.isoformat(),
            "execution_time": max_execution_time,
            "memory_used": max_memory_used,
            "time_limit": problem.time_limit_seconds * 1000,
            "memory_limit": problem.memory_limit_mb * 1024,
            "cpu_time_seconds": max_execution_time / 1000 if max_execution_time > 0 else 0
        })
    
    
    
      
    