# problem/views.py
import os
import uuid
import cloudinary.uploader
from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from django.conf import settings
from mongoengine.errors import ValidationError as MEValidationError, NotUniqueError

from .models import Problem
from .serializers import ProblemCreateSerializer, ProblemUpdateSerializer
from contest.models import Contest, ContestProblem
from contest.utils.auth import get_user_from_request
from account.models import Account
from utils.cache_keys import invalidate_contest, invalidate_contest_problem


MAX_IMAGES = 5


# -----------------------------
# CLOUDINARY UPLOAD HELPER
# -----------------------------
def upload_to_cloudinary(file):
    """
    Upload file to Cloudinary and return a secure URL.
    """
    result = cloudinary.uploader.upload(file)
    return result["secure_url"]


# -----------------------------
# CREATE PROBLEM
# -----------------------------
class ProblemCreateAPIView(APIView):
    """
    POST /api/problems/
    Payload:
    {
        "contest_id": "...",
        "title": "...",
        "statement": "...",
        "index": "A",
        "time_limit": 2,
        "memory_limit": 256,
        "tags": ["math", "dp"],
        "test_cases": [{"input": "...", "output": "...", "explanation": "..."}]
    }
    """
    def post(self, request):
        data = request.data
        contest = Contest.objects(id=data.get("contest_id")).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=404)

        problem_id = str(uuid.uuid4())  # unique problem id
        
        # Create problem
        problem = Problem(
            problem_id=problem_id,
            title=data.get("title", ""),
            statement=data.get("statement", ""),
            time_limit=int(data.get("time_limit", 2)),
            memory_limit=int(data.get("memory_limit", 256)),
            tags=data.get("tags", [])
        )
        problem.save()

        # Link problem to contest
        ContestProblem.objects.create(
            contest=contest,
            problem_id=problem_id,
            index=data.get("index", "A")
        )

        # Import TestCase here to avoid circular imports
        from testcase.models import TestCase
        
        # Create test cases
        for tc in data.get("test_cases", []):
            TestCase.objects.create(
                problem_id=problem_id,
                input_data=tc.get("input", ""),
                output_data=tc.get("output", ""),
                explanation=tc.get("explanation", "")
            )

        # Invalidate contest problem caches so the new problem appears immediately
        try:
            invalidate_contest(str(contest.id))
        except Exception:
            pass

        return Response({"message": "Problem created", "problem_id": problem_id}, status=201)


# -----------------------------
# LIST PROBLEMS FOR A CONTEST
# -----------------------------
class ProblemListByContestAPIView(APIView):
    def get(self, request, contest_id):
        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get contest problems via ContestProblem
        contest_problems = ContestProblem.objects(contest=contest).order_by("index")
        
        data = []
        for cp in contest_problems:
            # Find the actual problem
            problem = Problem.objects(problem_id=cp.problem_id).first()
            if problem:
                data.append({
                    "problem_id": problem.problem_id,
                    "index": cp.index,
                    "title": problem.title,
                    "time_limit": problem.time_limit,
                    "memory_limit": problem.memory_limit,
                    "difficulty": getattr(problem, 'difficulty', 'Medium'),
                })

        return Response({"problems": data})


# -----------------------------
# PROBLEM DETAIL VIEW
# -----------------------------
class ProblemDetailAPIView(APIView):
    def get(self, request, problem_id):
        # Try to find problem by problem_id (not mongo _id)
        problem = Problem.objects(problem_id=problem_id).first()
        if not problem:
            # Also try by mongo _id for backward compatibility
            problem = Problem.objects(id=problem_id).first()
            if not problem:
                return Response({"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND)

        # Find which contest this problem belongs to
        contest_problem = ContestProblem.objects(problem_id=problem.problem_id).first()
        contest_id = str(contest_problem.contest.id) if contest_problem else None

        return Response({
            "problem_id": problem.problem_id,
            "contest_id": contest_id,
            "index": contest_problem.index if contest_problem else "A",
            "title": problem.title,
            "statement": problem.statement,
            "tags": problem.tags,
            "time_limit": problem.time_limit,
            "memory_limit": problem.memory_limit,
            "difficulty": getattr(problem, 'difficulty', 'Medium'),
            "created_at": problem.created_at.isoformat() if hasattr(problem, 'created_at') else None
        })


# -----------------------------
# UPDATE PROBLEM
# -----------------------------
class ProblemUpdateAPIView(APIView):
    def patch(self, request, problem_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        # Try to find problem by problem_id (not mongo _id)
        problem = Problem.objects(problem_id=problem_id).first()
        if not problem:
            # Also try by mongo _id for backward compatibility
            problem = Problem.objects(id=problem_id).first()
            if not problem:
                return Response({"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND)

        # Find contest to check permissions
        contest_problem = ContestProblem.objects(problem_id=problem.problem_id).first()
        if not contest_problem:
            return Response({"error": "Problem not linked to any contest"}, status=status.HTTP_404_NOT_FOUND)

        # Permission check
        contest = contest_problem.contest
        if not (str(contest.created_by.id) == str(user.id) or getattr(user, 'role', None) == "admin"):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProblemUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Update simple fields
        for k, v in data.items():
            setattr(problem, k, v)

        # Upload new images (if applicable)
        new_files = request.FILES.getlist("images")
        if new_files:
            if len(problem.images) + len(new_files) > MAX_IMAGES:
                return Response({"error": f"Total images exceed {MAX_IMAGES}"}, status=status.HTTP_400_BAD_REQUEST)

            new_urls = []
            try:
                for f in new_files:
                    url = upload_to_cloudinary(f)
                    new_urls.append(url)
            except Exception as e:
                return Response({"error": f"Image upload failed: {str(e)}"}, status=500)

            problem.images = problem.images + new_urls

        try:
            problem.save()
        except (MEValidationError, ValueError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Invalidate contest + specific problem caches
        try:
            invalidate_contest_problem(str(contest.id), problem.problem_id)
        except Exception:
            pass

        return Response({"message": "Problem updated", "problem_id": problem.problem_id})


# -----------------------------
# DELETE PROBLEM
# -----------------------------
class ProblemDeleteAPIView(APIView):
    def delete(self, request, problem_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        # Try to find problem by problem_id (not mongo _id)
        problem = Problem.objects(problem_id=problem_id).first()
        if not problem:
            # Also try by mongo _id for backward compatibility
            problem = Problem.objects(id=problem_id).first()
            if not problem:
                return Response({"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND)

        # Find contest to check permissions
        contest_problem = ContestProblem.objects(problem_id=problem.problem_id).first()
        if not contest_problem:
            return Response({"error": "Problem not linked to any contest"}, status=status.HTTP_404_NOT_FOUND)

        # Permission check
        contest = contest_problem.contest
        if not (str(contest.created_by.id) == str(user.id) or getattr(user, 'role', None) == "admin"):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        # Delete associated test cases first
        from testcase.models import TestCase
        TestCase.objects(problem_id=problem.problem_id).delete()
        
        # Delete contest-problem link
        contest_problem.delete()
        
        # Delete the problem
        problem.delete()

        # Invalidate contest caches so the deleted problem disappears immediately
        try:
            invalidate_contest(str(contest.id))
        except Exception:
            pass
        
        return Response({"message": "Problem deleted"})