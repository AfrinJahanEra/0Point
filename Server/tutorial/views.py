import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from mongoengine.errors import ValidationError as MEValidationError

from .models import Tutorial
from .serializers import TutorialCreateSerializer, TutorialUpdateSerializer
from problem.models import Problem
from contest.utils.auth import get_user_from_request


def save_file(file, folder="tutorials"):
    media_root = settings.MEDIA_ROOT
    dest_dir = os.path.join(media_root, folder)
    os.makedirs(dest_dir, exist_ok=True)

    import time, uuid
    name = f"{int(time.time())}_{uuid.uuid4().hex}_{file.name}"
    path = os.path.join(dest_dir, name)

    with open(path, "wb+") as f:
        for chunk in file.chunks():
            f.write(chunk)

    return f"{settings.MEDIA_URL}{folder}/{name}"

class TutorialCreateAPIView(APIView):
    def post(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        serializer = TutorialCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data

        problem = Problem.objects(id=data["problem_id"]).first()
        if not problem:
            return Response({"error": "Problem not found"}, status=404)

        # Only contest creator, problem setter, or admin can write tutorial
        if not (str(problem.contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=403)

        # Handle images
        images = []
        for f in request.FILES.getlist("images"):
            images.append(save_file(f, "tutorials"))

        # Sample IO
        sample_ios_raw = request.data.get("sample_ios")
        sample_ios = []
        if sample_ios_raw:
            import json
            try:
                sample_ios = json.loads(sample_ios_raw)
            except:
                return Response({"error": "sample_ios must be valid JSON"}, status=400)

        tutorial = Tutorial(
            problem=problem,
            author=user,
            statement=data["statement"],
            tags=data.get("tags", []),
            difficulty_explanation=data.get("difficulty_explanation"),
            video_url=data.get("video_url"),
            is_official=data.get("is_official", True),
            images=images,
            sample_ios=sample_ios
        )

        try:
            tutorial.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=400)

        return Response({
            "message": "Tutorial created",
            "tutorial_id": str(tutorial.id)
        }, status=201)

class TutorialListByProblemAPIView(APIView):
    def get(self, request, problem_id):
        tutorials = Tutorial.objects(problem=problem_id).order_by("-created_at")
        data = []
        for t in tutorials:
            data.append({
                "id": str(t.id),
                "author": t.author.name,
                "is_official": t.is_official,
                "created_at": t.created_at.isoformat()
            })
        return Response({"tutorials": data})

class TutorialDetailAPIView(APIView):
    def get(self, request, tutorial_id):
        t = Tutorial.objects(id=tutorial_id).first()
        if not t:
            return Response({"error": "Not found"}, status=404)

        return Response({
            "id": str(t.id),
            "problem": str(t.problem.id),
            "author": t.author.name,
            "statement": t.statement,
            "tags": t.tags,
            "difficulty_explanation": t.difficulty_explanation,
            "sample_ios": t.sample_ios,
            "images": t.images,
            "video_url": t.video_url,
            "is_official": t.is_official,
            "created_at": t.created_at.isoformat()
        })
