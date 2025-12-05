from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from mongoengine.errors import ValidationError as MEValidationError

from .models import Announcement
from .serializers import AnnouncementCreateSerializer, AnnouncementUpdateSerializer
from contest.models import Contest
from contest.utils.auth import get_user_from_request

import cloudinary.uploader


class AnnouncementCreateAPIView(APIView):
    """
    POST /announcements/
    """
    def post(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        serializer = AnnouncementCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        data = serializer.validated_data

        contest = Contest.objects(id=data["contest_id"]).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=404)

        # Only creator or admin can post announcements
        if not (str(contest.created_by.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=403)

        ann = Announcement(
            contest=contest,
            author=user,
            text=data["text"],
            problem_index=data.get("problem_index"),
            is_important=data.get("is_important", False),
            visible_to=data.get("visible_to", "participants"),
            type=data.get("type", "info")
        )

        try:
            ann.save()
        except MEValidationError as e:
            return Response({"error": str(e)}, status=400)

        return Response({
            "message": "Announcement created",
            "id": str(ann.id)
        }, status=201)


class AnnouncementListAPIView(APIView):
    """
    GET /contests/<id>/announcements/
    """
    def get(self, request, contest_id):
        contest = Contest.objects(id=contest_id).first()
        if not contest:
            return Response({"error": "Contest not found"}, status=404)
        
        announcements = Announcement.objects(contest=contest).order_by("-created_at")

        data = []
        for a in announcements:
            data.append({
                "id": str(a.id),
                "text": a.text,
                "author": a.author.name,
                "problem_index": a.problem_index,
                "is_important": a.is_important,
                "type": a.type,
                "created_at": a.created_at.isoformat()
            })

        return Response({"announcements": data})


class AnnouncementUpdateAPIView(APIView):
    """
    PATCH /announcements/<id>/
    """
    def patch(self, request, announcement_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Auth required"}, status=401)

        ann = Announcement.objects(id=announcement_id).first()
        if not ann:
            return Response({"error": "Not found"}, status=404)

        # Only author or admin may update
        if not (str(ann.author.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "No permission"}, status=403)

        serializer = AnnouncementUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        for k, v in serializer.validated_data.items():
            setattr(ann, k, v)

        ann.save()
        return Response({"message": "Updated"})


class AnnouncementDeleteAPIView(APIView):
    """
    DELETE /announcements/<id>/
    """
    def delete(self, request, announcement_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Auth required"}, status=401)

        ann = Announcement.objects(id=announcement_id).first()
        if not ann:
            return Response({"error": "Not found"}, status=404)

        if not (str(ann.author.id) == str(user.id) or user.role == "admin"):
            return Response({"error": "Permission denied"}, status=403)

        ann.delete()
        return Response({"message": "Deleted"})
