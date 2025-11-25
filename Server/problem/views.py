import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from mongoengine.errors import ValidationError as MEValidationError, NotUniqueError
from .models import Problem
from .serializers import ProblemCreateSerializer, ProblemUpdateSerializer
from contest.models import Contest
from contest.utils.auth import get_user_from_request
from accounts.models import Account

MAX_IMAGES = 5

def save_uploaded_file(f, dest_folder="problems"):
    """
    Saves uploaded file 'f' under MEDIA_ROOT/<dest_folder>/ and returns relative path.
    """
    # Ensure MEDIA_ROOT exists
    media_root = getattr(settings, "MEDIA_ROOT", None)
    if not media_root:
        raise RuntimeError("MEDIA_ROOT is not configured in settings")

    dest_dir = os.path.join(media_root, dest_folder)
    os.makedirs(dest_dir, exist_ok=True)

    filename = f.name
    # avoid collisions by prefixing created timestamp
    import time, uuid
    suffix = uuid.uuid4().hex[:8]
    safe_name = f"{int(time.time())}_{suffix}_{filename}"
    file_path = os.path.join(dest_dir, safe_name)

    with open(file_path, "wb+") as dest:
        for chunk in f.chunks():
            dest.write(chunk)

    # return relative URL path to serve later: MEDIA_URL + dest_folder/filename
    return os.path.join(dest_folder, safe_name).replace("\\", "/")


class ProblemCreateAPIView(APIView):
    """
    POST /problems/
    Accepts multipart/form-data:
      - JSON fields (contest_id, index, title, statement, tags[], time_limit_seconds, memory_limit_mb, difficulty)
      - images[] files (0..5)
    """
    def post(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        # parse normal fields from request.data
        serializer = ProblemCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Check contest existence
        contest = Contest.objects(id=data["contest_id"]).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=status.HTTP_404_NOT_FOUND)

        # Optionally: ensure user can add problems (only contest creator or admin)
        # We'll allow contest.created_by or admin role to create problem
        if not (str(contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Only contest creator or admin can add problems"}, status=status.HTTP_403_FORBIDDEN)

        # Check index uniqueness within contest
        existing = Problem.objects(contest=contest, index=data["index"]).first()
        if existing:
            return Response({"error": f"Problem index '{data['index']}' already exists for this contest"}, status=status.HTTP_400_BAD_REQUEST)

        # handle files
        files = request.FILES.getlist("images")
        if len(files) > MAX_IMAGES:
            return Response({"error": f"Maximum {MAX_IMAGES} images allowed"}, status=status.HTTP_400_BAD_REQUEST)

        saved_paths = []
        try:
            for f in files:
                rel_path = save_uploaded_file(f, dest_folder="problems")
                saved_paths.append(os.path.join(settings.MEDIA_URL.rstrip('/'), rel_path).lstrip('/'))
        except Exception as e:
            return Response({"error": f"Failed to save files: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # create problem
        p = Problem(
            contest=contest,
            index=data["index"],
            title=data["title"],
            statement=data["statement"],
            tags=data.get("tags", []),
            time_limit_seconds=data.get("time_limit_seconds", 2.0),
            memory_limit_mb=data.get("memory_limit_mb", 256),
            images=saved_paths,
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


class ProblemUpdateAPIView(APIView):
    def patch(self, request, problem_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        p = Problem.objects(id=problem_id).first()
        if not p:
            return Response({"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND)

        # only contest creator or admin can update
        if not (str(p.contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProblemUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        # update simple fields
        for k, v in data.items():
            setattr(p, k, v)

        # handle image additions (optional)
        new_files = request.FILES.getlist("images")
        total_existing = len(p.images or [])
        if new_files:
            if total_existing + len(new_files) > MAX_IMAGES:
                return Response({"error": f"Total images exceed maximum of {MAX_IMAGES}"}, status=status.HTTP_400_BAD_REQUEST)
            saved = []
            try:
                for f in new_files:
                    rel = save_uploaded_file(f, dest_folder="problems")
                    saved.append(os.path.join(settings.MEDIA_URL.rstrip('/'), rel).lstrip('/'))
            except Exception as e:
                return Response({"error": f"Failed to save files: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            p.images = (p.images or []) + saved

        try:
            p.save()
        except (MEValidationError, ValueError) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Problem updated", "id": str(p.id)})


class ProblemDeleteAPIView(APIView):
    def delete(self, request, problem_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        p = Problem.objects(id=problem_id).first()
        if not p:
            return Response({"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND)

        # only creator or admin
        if not (str(p.contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        # Optionally: delete image files from disk (not implemented here)
        p.delete()
        return Response({"message": "Problem deleted"})
