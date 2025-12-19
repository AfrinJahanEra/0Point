# compiler/views.py
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
import pytz

from .models import CodeSubmission
from .serializers import CodeSubmissionSerializer
from contest.utils.auth import get_user_from_request

# JDoodle credentials
JD_CLIENT_ID = "fd5008b0be3517adb097999e752bdc36"
JD_CLIENT_SECRET = "99df47ceee2ae9af0137b30d0d7eebcdc3aac2fc400b16ef5298bff3576ad5e2"
JD_URL = "https://api.jdoodle.com/v1/execute"

# Map for language -> recommended versionIndex
LANGUAGE_VERSION_MAP = {
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
    """Execute code via JDoodle API and save submission for a contest problem"""

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

        # Create MongoEngine submission document
        submission = CodeSubmission(
            user=user,
            language=language,
            version_index=version_index,
            code=data["code"],
            input_data=data.get("input_data", ""),
            created_at=dhaka_now()
        )

        # JDoodle payload
        payload = {
            "clientId": JD_CLIENT_ID,
            "clientSecret": JD_CLIENT_SECRET,
            "script": submission.code,
            "stdin": submission.input_data or "",
            "language": language,
            "versionIndex": version_index
        }

        try:
            res = requests.post(JD_URL, json=payload, timeout=15)
            res_data = res.json()

            jdoodle_output = res_data.get("output", "").strip()
            execution_success = res_data.get("isExecutionSuccess", False)

            submission.output = jdoodle_output
            submission.status = "success" if execution_success else "error"

            # Check expected output
            expected_output = data.get("expected_output", "").strip()
            if expected_output:
                submission.verdict = "AC" if jdoodle_output == expected_output else "WA"
            else:
                submission.verdict = "OK"

            submission.save()

            return Response({
                "submission_id": str(submission.id),
                "contest_id": contest_id,
                "problem_id": problem_id,
                "output": jdoodle_output,
                "status": submission.status,
                "verdict": submission.verdict,
                "jdoodle_response": res_data  # optional full JDoodle response for debugging
            })

        except Exception as e:
            submission.status = "error"
            submission.output = str(e)
            submission.verdict = "ERROR"
            submission.save()
            return Response({"error": str(e)}, status=500)

from submission.models import Submission
from contest.models import Contest, ContestProblem
import pytz

class ContestProblemExecuteAPIView(APIView):
    """Execute code for a contest problem and create submission record"""
    
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
        contest_time = None
        if contest.start_time:
            # Ensure both times are timezone aware
            if contest.start_time.tzinfo is None:
                start_time = dhaka_tz.localize(contest.start_time)
            else:
                start_time = contest.start_time.astimezone(dhaka_tz)
            
            if current_time.tzinfo is None:
                current_time = dhaka_tz.localize(current_time)
            
            contest_time_seconds = (current_time - start_time).total_seconds()
            contest_time_minutes = contest_time_seconds / 60.0
        
        # Test against problem test cases
        all_passed = True
        failed_test_case = None
        actual_output = ""
        passed_count = 0
        total_test_cases = len(problem.test_cases)
        
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
                
                # For first test case, save output for display
                if i == 0:
                    actual_output = jdoodle_output
                
                # Check if output matches expected (strip whitespace)
                expected_output = test_case.output.strip()
                if jdoodle_output == expected_output:
                    passed_count += 1
                else:
                    all_passed = False
                    failed_test_case = i + 1
                    break
                    
            except Exception as e:
                all_passed = False
                actual_output = str(e)
                break
        
        # Determine verdict
        if all_passed:
            verdict = "AC"
            status_msg = "Accepted"
        else:
            verdict = "WA"
            status_msg = f"Wrong Answer on test case {failed_test_case}"
        
        # Create Submission record
        submission = Submission(
            user=user,
            contest=contest,
            problem_index=problem_index.upper(),
            problem_code=problem_index.upper(),
            problem_title=problem_title,
            language=language,
            code=data["code"],
            verdict=verdict,
            contest_time=contest_time_minutes,
            submitted_at=current_time,
            passed_test_cases=passed_count,
            total_test_cases=total_test_cases,
            failed_test_case=failed_test_case if not all_passed else -1,
            is_public=True
        )
        
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
            output=actual_output,
            status="success" if all_passed else "error",
            created_at=current_time
        )
        code_submission.save()
        
        return Response({
            "submission_id": str(submission.id),
            "code_submission_id": str(code_submission.id),
            "contest_id": str(contest.id),
            "problem_index": problem_index,
            "verdict": verdict,
            "status": status_msg,
            "output": actual_output,
            "all_passed": all_passed,
            "passed_test_cases": passed_count,
            "total_test_cases": total_test_cases,
            "failed_test_case": failed_test_case,
            "contest_time": contest_time_minutes,
            "submitted_at": current_time.isoformat()
        })
    
    