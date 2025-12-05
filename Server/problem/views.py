import os
import cloudinary.uploader
from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from django.conf import settings
from mongoengine.errors import ValidationError as MEValidationError, NotUniqueError

from .models import Problem
from .serializers import ProblemCreateSerializer, ProblemUpdateSerializer
from contest.models import Contest
from contest.utils.auth import get_user_from_request
from account.models import Account


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
    def post(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = ProblemCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Check contest
        contest = Contest.objects(id=data["contest_id"]).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)

        # Permission check
        if not (str(contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Only contest creator or admin can add problems"}, status=status.HTTP_403_FORBIDDEN)

        # Unique index
        existing = Problem.objects(contest=contest, index=data["index"]).first()
        if existing:
            return Response({"error": f"Problem index '{data['index']}' already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # Handle images
        files = request.FILES.getlist("images")
        if len(files) > MAX_IMAGES:
            return Response({"error": f"Maximum {MAX_IMAGES} images allowed"}, status=status.HTTP_400_BAD_REQUEST)

        image_urls = []
        try:
            for f in files:
                url = upload_to_cloudinary(f)
                image_urls.append(url)
        except Exception as e:
            return Response({"error": f"Image upload failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Create problem
        p = Problem(
            contest=contest,
            index=data["index"],
            title=data["title"],
            statement=data["statement"],
            tags=data.get("tags", []),
            time_limit_seconds=data.get("time_limit_seconds", 2.0),
            memory_limit_mb=data.get("memory_limit_mb", 256),
            images=image_urls,
            difficulty=data.get("difficulty", 800),
        )

        try:
            p.save()
        except (MEValidationError, NotUniqueError, ValueError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "Problem created",
            "problem": {
                "id": str(p.id),
                "contest_id": str(contest.id),
                "index": p.index,
                "title": p.title,
            }
        }, status=status.HTTP_201_CREATED)


# -----------------------------
# LIST PROBLEMS FOR A CONTEST
# -----------------------------
class ProblemListByContestAPIView(APIView):
    def get(self, request, contest_id):
        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)

        problems = Problem.objects(contest=contest).order_by("index")
        data = []

        for p in problems:
            data.append({
                "id": str(p.id),
                "index": p.index,
                "title": p.title,
                "time_limit_seconds": p.time_limit_seconds,
                "memory_limit_mb": p.memory_limit_mb,
                "difficulty": p.difficulty,
            })

        return Response({"problems": data})


# -----------------------------
# PROBLEM DETAIL VIEW
# -----------------------------
class ProblemDetailAPIView(APIView):
    def get(self, request, problem_id):
        p = Problem.objects(id=problem_id).first()
        if not p:
            return Response({"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "id": str(p.id),
            "contest_id": str(p.contest.id),
            "index": p.index,
            "title": p.title,
            "statement": p.statement,
            "tags": p.tags,
            "time_limit_seconds": p.time_limit_seconds,
            "memory_limit_mb": p.memory_limit_mb,
            "images": p.images,
            "difficulty": p.difficulty,
            "created_at": p.created_at.isoformat()
        })


# -----------------------------
# UPDATE PROBLEM
# -----------------------------
class ProblemUpdateAPIView(APIView):
    def patch(self, request, problem_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        p = Problem.objects(id=problem_id).first()
        if not p:
            return Response({"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND)

        # Permission
        if not (str(p.contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProblemUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Update simple fields
        for k, v in data.items():
            setattr(p, k, v)

        # Upload new images
        new_files = request.FILES.getlist("images")
        if new_files:
            if len(p.images) + len(new_files) > MAX_IMAGES:
                return Response({"error": f"Total images exceed {MAX_IMAGES}"}, status=status.HTTP_400_BAD_REQUEST)

            new_urls = []
            try:
                for f in new_files:
                    url = upload_to_cloudinary(f)
                    new_urls.append(url)
            except Exception as e:
                return Response({"error": f"Image upload failed: {str(e)}"}, status=500)

            p.images = p.images + new_urls

        try:
            p.save()
        except (MEValidationError, ValueError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Problem updated", "id": str(p.id)})


# -----------------------------
# DELETE PROBLEM
# -----------------------------
class ProblemDeleteAPIView(APIView):
    def delete(self, request, problem_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        p = Problem.objects(id=problem_id).first()
        if not p:
            return Response({"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND)

        if not (str(p.contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        p.delete()
        return Response({"message": "Problem deleted"})
