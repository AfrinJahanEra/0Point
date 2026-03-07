# announcement/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime

from mongoengine.errors import ValidationError as MEValidationError

from .models import Announcement
from .serializers import AnnouncementCreateSerializer, AnnouncementUpdateSerializer
from contest.models import Contest
from contest.utils.auth import get_user_from_request
from account.models import Account


class PlatformAnnouncementsAPIView(APIView):
    """
    GET /announcements/platform/
    Get platform-wide announcements (not tied to any contest)
    """
    def get(self, request):
        try:
            limit = int(request.GET.get('limit', 5))
        except ValueError:
            limit = 5
        
        # Get platform-wide announcements (where contest is None)
        announcements = Announcement.objects(contest=None).order_by("-is_pinned", "-created_at")[:limit]
        
        data = []
        for announcement in announcements:
            data.append(announcement.to_dict())
        
        return Response({
            "announcements": data,
            "total": len(data)
        })


class AnnouncementCreateAPIView(APIView):
    """
    POST /announcements/
    Create a new announcement for a contest or platform-wide
    """
    def post(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        serializer = AnnouncementCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        data = serializer.validated_data
        
        # Get contest if contest_id is provided
        contest = None
        contest_id = data.get("contest_id", "").strip()
        
        if contest_id:
            try:
                contest = Contest.objects.get(id=contest_id)
            except Contest.DoesNotExist:
                return Response({"error": "Contest not found"}, status=404)

        # Permission checks
        can_post = False
        
        if contest:
            # Contest-specific announcement - check contest permissions
            if contest.created_by and str(contest.created_by.id) == str(user.id):
                can_post = True
            elif hasattr(user, 'role') and user.role in ["admin", "superadmin"]:
                can_post = True
            elif contest.status == "test" and user.email in contest.testers:
                can_post = True
        else:
            # Platform-wide announcement - only admins can create
            if hasattr(user, 'role') and user.role in ["admin", "superadmin"]:
                can_post = True
        
        if not can_post:
            return Response({"error": "Permission denied. Only admins can create platform-wide announcements."}, status=403)

        # Create announcement
        announcement = Announcement(
            contest=contest,
            author=user,
            text=data["text"].strip(),
            topic=data.get("topic", "").strip() if data.get("topic") else None,
            problem_index=data.get("problem_index", "").strip().upper() if data.get("problem_index") else None,
            is_important=data.get("is_important", False),
            is_pinned=data.get("is_pinned", False),
            type=data.get("type", "info")
        )

        try:
            announcement.save()
        except MEValidationError as e:
            return Response({"error": f"Validation error: {str(e)}"}, status=400)
        except Exception as e:
            return Response({"error": f"Failed to create announcement: {str(e)}"}, status=500)

        # Return the created announcement
        return Response({
            "message": "Announcement created successfully",
            "announcement": announcement.to_dict()
        }, status=201)


class ContestAnnouncementsAPIView(APIView):
    """
    GET /contests/<contest_id>/announcements/
    Get all announcements for a contest
    """
    def get(self, request, contest_id):
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        user = get_user_from_request(request)
        
        # Check if user has access to this contest
        can_access = False
        
        if contest.status == "past":
            # Past contests are accessible to everyone
            can_access = True
        elif contest.status == "draft":
            # Drafts - only accessible to creator
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
        elif contest.status in ["live", "upcoming", "test"]:
            # For live/upcoming/test contests, allow access to:
            # 1. Registered users
            # 2. Contest creator
            # 3. Testers (for test contests)
            if user:
                from contest.models import ContestRegistration
                is_registered = ContestRegistration.objects.filter(
                    user=user, contest=contest
                ).first() is not None
                
                is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
                is_tester = contest.status == "test" and user.email in contest.testers
                
                can_access = is_registered or is_creator or is_tester
        
        if not can_access:
            return Response({
                "error": "Access denied",
                "message": "You don't have access to this contest's announcements"
            }, status=403)
        
        # Get announcements ordered by pinned first, then creation date
        announcements = Announcement.objects(contest=contest).order_by("-is_pinned", "-created_at")
        
        data = []
        for announcement in announcements:
            data.append(announcement.to_dict())
        
        return Response({
            "contest_id": str(contest.id),
            "contest_title": contest.title,
            "contest_status": contest.status,
            "announcements": data,
            "total": len(data)
        })


class AnnouncementDetailAPIView(APIView):
    """
    GET /announcements/<announcement_id>/
    Get specific announcement details
    """
    def get(self, request, announcement_id):
        try:
            announcement = Announcement.objects.get(id=announcement_id)
        except Announcement.DoesNotExist:
            return Response({"error": "Announcement not found"}, status=404)
        
        # Check if user has access to the contest
        user = get_user_from_request(request)
        contest = announcement.contest
        
        can_access = False
        
        if contest.status == "past":
            can_access = True
        elif contest.status == "draft":
            if user and contest.created_by and str(contest.created_by.id) == str(user.id):
                can_access = True
        elif contest.status in ["live", "upcoming", "test"]:
            if user:
                from contest.models import ContestRegistration
                is_registered = ContestRegistration.objects.filter(
                    user=user, contest=contest
                ).first() is not None
                
                is_creator = contest.created_by and str(contest.created_by.id) == str(user.id)
                is_tester = contest.status == "test" and user.email in contest.testers
                
                can_access = is_registered or is_creator or is_tester
        
        if not can_access:
            return Response({
                "error": "Access denied",
                "message": "You don't have access to this announcement"
            }, status=403)
        
        return Response({
            "announcement": announcement.to_dict()
        })


class AnnouncementUpdateAPIView(APIView):
    """
    PATCH /announcements/<announcement_id>/
    Update an existing announcement
    """
    def patch(self, request, announcement_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        try:
            announcement = Announcement.objects.get(id=announcement_id)
        except Announcement.DoesNotExist:
            return Response({"error": "Announcement not found"}, status=404)

        # Check permissions: only author, contest creator, or admin can update
        can_update = False
        
        # Check if user is the author
        if str(announcement.author.id) == str(user.id):
            can_update = True
        # Check if user is contest creator
        elif announcement.contest.created_by and str(announcement.contest.created_by.id) == str(user.id):
            can_update = True
        # Check if user is admin
        elif hasattr(user, 'role') and user.role in ["admin", "superadmin"]:
            can_update = True
        
        if not can_update:
            return Response({"error": "Permission denied. Only the author, contest creator, or admin can update announcements."}, status=403)

        serializer = AnnouncementUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        # Update fields
        for key, value in serializer.validated_data.items():
            if key == 'text' and value:
                setattr(announcement, key, value.strip())
            elif key == 'problem_index' and value:
                setattr(announcement, key, value.strip().upper())
            else:
                setattr(announcement, key, value)
        
        # Update the updated_at timestamp
        announcement.updated_at = datetime.utcnow()

        try:
            announcement.save()
        except MEValidationError as e:
            return Response({"error": f"Validation error: {str(e)}"}, status=400)
        except Exception as e:
            return Response({"error": f"Failed to update announcement: {str(e)}"}, status=500)

        return Response({
            "message": "Announcement updated successfully",
            "announcement": announcement.to_dict()
        })


class AnnouncementDeleteAPIView(APIView):
    """
    DELETE /announcements/<announcement_id>/
    Delete an announcement
    """
    def delete(self, request, announcement_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        try:
            announcement = Announcement.objects.get(id=announcement_id)
        except Announcement.DoesNotExist:
            return Response({"error": "Announcement not found"}, status=404)

        # Check permissions: only author, contest creator, or admin can delete
        can_delete = False
        
        # Check if user is the author
        if str(announcement.author.id) == str(user.id):
            can_delete = True
        # Check if user is contest creator
        elif announcement.contest.created_by and str(announcement.contest.created_by.id) == str(user.id):
            can_delete = True
        # Check if user is admin
        elif hasattr(user, 'role') and user.role in ["admin", "superadmin"]:
            can_delete = True
        
        if not can_delete:
            return Response({"error": "Permission denied. Only the author, contest creator, or admin can delete announcements."}, status=403)

        try:
            announcement.delete()
        except Exception as e:
            return Response({"error": f"Failed to delete announcement: {str(e)}"}, status=500)

        return Response({
            "message": "Announcement deleted successfully"
        }, status=200)


class TogglePinAnnouncementAPIView(APIView):
    """
    POST /announcements/<announcement_id>/toggle-pin/
    Toggle the pinned status of an announcement
    """
    def post(self, request, announcement_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)

        try:
            announcement = Announcement.objects.get(id=announcement_id)
        except Announcement.DoesNotExist:
            return Response({"error": "Announcement not found"}, status=404)

        # Check permissions: only contest creator or admin can pin/unpin
        can_pin = False
        
        # Check if user is contest creator
        if announcement.contest.created_by and str(announcement.contest.created_by.id) == str(user.id):
            can_pin = True
        # Check if user is admin
        elif hasattr(user, 'role') and user.role in ["admin", "superadmin"]:
            can_pin = True
        
        if not can_pin:
            return Response({"error": "Permission denied. Only contest creator or admin can pin/unpin announcements."}, status=403)

        # Toggle the pinned status
        announcement.is_pinned = not announcement.is_pinned
        announcement.updated_at = datetime.utcnow()

        try:
            announcement.save()
        except Exception as e:
            return Response({"error": f"Failed to update announcement: {str(e)}"}, status=500)

        return Response({
            "message": f"Announcement {'pinned' if announcement.is_pinned else 'unpinned'} successfully",
            "is_pinned": announcement.is_pinned,
            "announcement": announcement.to_dict()
        })