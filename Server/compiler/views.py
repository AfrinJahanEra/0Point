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
