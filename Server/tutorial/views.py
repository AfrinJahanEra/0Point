import cloudinary.uploader
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from mongoengine.errors import ValidationError as MEValidationError

from .models import Tutorial
from .serializers import TutorialCreateSerializer, TutorialUpdateSerializer
from problem.models import Problem
from contest.utils.auth import get_user_from_request


# -----------------------------
# CLOUDINARY UPLOAD HELPER
# -----------------------------
def upload_to_cloudinary(file):
    """
    Upload file to Cloudinary and return secure URL.
    """
    result = cloudinary.uploader.upload(file)
    return result["secure_url"]


# -----------------------------
# CREATE TUTORIAL
# -----------------------------
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
            try:
                url = upload_to_cloudinary(f)
                images.append(url)
            except Exception as e:
                return Response({"error": f"Image upload failed: {str(e)}"}, status=500)

        # Handle sample IOs
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


# -----------------------------
# LIST TUTORIALS BY PROBLEM
# -----------------------------
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


# -----------------------------
# TUTORIAL DETAIL
# -----------------------------
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


class TutorialUpdateAPIView(APIView):
    """
    PATCH /tutorials/<id>/
    Allows updating tutorial fields and adding images.
    """
    MAX_IMAGES = 5

    def patch(self, request, tutorial_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        tutorial = Tutorial.objects(id=tutorial_id).first()
        if not tutorial:
            return Response({"error": "Tutorial not found"}, status=404)

        # Only contest creator, problem setter, or admin
        if not (str(tutorial.problem.contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=403)

        serializer = TutorialUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data

        # Update simple fields
        for key, value in data.items():
            setattr(tutorial, key, value)

        # Handle new images
        new_files = request.FILES.getlist("images")
        if new_files:
            total_images = len(tutorial.images or []) + len(new_files)
            if total_images > self.MAX_IMAGES:
                return Response({"error": f"Total images exceed maximum of {self.MAX_IMAGES}"}, status=400)

            uploaded_urls = []
            try:
                for f in new_files:
                    url = upload_to_cloudinary(f)
                    uploaded_urls.append(url)
            except Exception as e:
                return Response({"error": f"Image upload failed: {str(e)}"}, status=500)

            tutorial.images = (tutorial.images or []) + uploaded_urls

        try:
            tutorial.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=400)

        return Response({
            "message": "Tutorial updated successfully",
            "tutorial_id": str(tutorial.id),
            "images": tutorial.images
        })
