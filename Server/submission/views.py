from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from mongoengine.errors import ValidationError as MEValidationError

from .models import Submission
from .serializers import SubmissionCreateSerializer, SubmissionVerdictUpdateSerializer
from problem.models import Problem
from contest.utils.auth import get_user_from_request


class SubmissionCreateAPIView(APIView):
    """
    POST /submissions/
    Creates a new submission with verdict=PENDING.
    Judge will update verdict later.
    """
    def post(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        serializer = SubmissionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        data = serializer.validated_data

        problem = Problem.objects(id=data["problem_id"]).first()
        if not problem:
            return Response({"error": "Problem not found"}, status=404)

        # Auto-increment submission_number per user per problem
        count = Submission.objects(problem=problem, user=user).count()

        submission = Submission(
            problem=problem,
            user=user,
            language=data["language"],
            code=data["code"],
            submission_number=count + 1,
            origin="contest"
        )

        try:
            submission.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=400)

        return Response({
            "message": "Submission received",
            "id": str(submission.id),
            "verdict": submission.verdict
        }, status=201)


class SubmissionListByProblemAPIView(APIView):
    """
    GET /problems/<id>/submissions/
    """
    def get(self, request, problem_id):
        problem = Problem.objects(id=problem_id).first()
        if not problem:
            return Response({"error": "Problem not found"}, status=404)

        subs = Submission.objects(problem=problem).order_by("-submitted_at")
        data = []
        for s in subs:
            data.append({
                "id": str(s.id),
                "user": str(s.user.id),
                "language": s.language,
                "verdict": s.verdict,
                "runtime_ms": s.runtime_ms,
                "submitted_at": s.submitted_at.isoformat()
            })
        return Response({"submissions": data})


class SubmissionDetailAPIView(APIView):
    """
    GET /submissions/<id>/
    """
    def get(self, request, submission_id):
        s = Submission.objects(id=submission_id).first()
        if not s:
            return Response({"error": "Not found"}, status=404)

        user = get_user_from_request(request)

        # Only owner can see code
        if not user or str(user.id) != str(s.user.id):
            return Response({
                "id": str(s.id),
                "verdict": s.verdict,
                "runtime_ms": s.runtime_ms,
                "memory_kb": s.memory_kb
            })

        # Owner can see full details
        return Response({
            "id": str(s.id),
            "problem": str(s.problem.id),
            "user": str(s.user.id),
            "code": s.code,
            "language": s.language,
            "verdict": s.verdict,
            "runtime_ms": s.runtime_ms,
            "memory_kb": s.memory_kb,
            "testcases_passed": s.testcases_passed,
            "total_testcases": s.total_testcases,
            "submitted_at": s.submitted_at.isoformat()
        })


class SubmissionVerdictUpdateAPIView(APIView):
    """
    PATCH /submissions/<id>/verdict/
    INTERNAL — called by judge (worker)
    """
    def patch(self, request, submission_id):
        serializer = SubmissionVerdictUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        s = Submission.objects(id=submission_id).first()
        if not s:
            return Response({"error": "Not found"}, status=404)

        for key, value in serializer.validated_data.items():
            setattr(s, key, value)

        s.save()
        return Response({"message": "Verdict updated"})
