# clarification/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
import pytz
from mongoengine.queryset.visitor import Q

from .models import Clarification, ClarificationVote
from .serializers import (
    ClarificationCreateSerializer,
    ClarificationUpdateSerializer,
    ClarificationReplySerializer,
    ClarificationStatusUpdateSerializer,
    ClarificationFilterSerializer
)
from contest.views import get_contest_status
from contest.utils.auth import get_user_from_request
from contest.models import Contest
from account.models import Account
from contest.broadcast import broadcast_contest_update


class ClarificationListCreateAPIView(APIView):
    """List and create clarification questions for a contest"""
    
    def get(self, request, contest_id):
        """Get clarifications with filters and permissions"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        user = get_user_from_request(request)
        
        # Validate filter parameters
        filter_serializer = ClarificationFilterSerializer(data=request.query_params)
        if not filter_serializer.is_valid():
            return Response(filter_serializer.errors, status=400)
        
        filters = filter_serializer.validated_data
        
        # Build query based on contest
        query = Q(contest=contest)
        
        # Apply problem filter
        if filters.get('problem'):
            problem_filter = filters['problem'].strip().upper()
            if problem_filter == 'GENERAL':
                query &= Q(problem_index=None) | Q(problem_index='')
            else:
                query &= Q(problem_index=problem_filter)
        
        # Apply status filter
        status_filter = filters.get('status', 'all')
        if status_filter != 'all':
            if status_filter == 'published':
                query &= Q(is_published=True)
            elif status_filter == 'unanswered':
                query &= Q(is_answered=False) & Q(is_published=True)
            else:
                query &= Q(status=status_filter)
        
        # Apply search
        if filters.get('search'):
            search_query = filters['search'].strip()
            query &= (
                Q(title__icontains=search_query) |
                Q(content__icontains=search_query) |
                Q(tags__icontains=search_query)
            )
        
        # Show only user's questions if requested
        if filters.get('show_my_questions') and user:
            query &= Q(author=user)
        
        # Get clarifications based on user role
        is_organizer = self._is_user_contest_organizer(user, contest)
        
        if not is_organizer:
            # Regular users can only see published clarifications or their own
            if user:
                query &= (Q(is_published=True) | Q(author=user))
            else:
                query &= Q(is_published=True)
        
        # Get clarifications
        clarifications = Clarification.objects(query)
        
        # Apply sorting
        sort_by = filters.get('sort', 'recent')
        if sort_by == 'popular':
            clarifications = clarifications.order_by('-upvotes', '-created_at')
        elif sort_by == 'unanswered':
            # Show unanswered published clarifications first
            clarifications = clarifications.order_by('is_answered', '-created_at')
        else:  # recent
            clarifications = clarifications.order_by('-created_at')
        
        # Pagination
        page = filters.get('page', 1)
        per_page = filters.get('per_page', 20)
        total = clarifications.count()
        start = (page - 1) * per_page
        end = start + per_page
        paginated_clarifications = clarifications[start:end]
        
        # Prepare response data with permissions
        clarifications_data = []
        for clarification in paginated_clarifications:
            data = clarification.to_dict(user)
            data['can_edit'] = self._can_user_edit_clarification(user, clarification)
            clarifications_data.append(data)
        
        return Response({
            "clarifications": clarifications_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            },
            "contest": {
                "id": str(contest.id),
                "title": contest.title,
                "problems": [p.index for p in contest.problems],
                "total_clarifications": total,
                "pending_count": Clarification.objects(
                    contest=contest, status='pending', is_published=False
                ).count() if is_organizer else None,
                "user_is_organizer": is_organizer
            },
            "filters": filters
        })
    
    def post(self, request, contest_id):
        """Create a new clarification question"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check if contest allows clarifications
        contest_status = get_contest_status(contest)
        if contest_status not in ["live", "upcoming", "test"]:
            return Response({
                "error": "Clarifications only allowed for live, upcoming, or test contests"
            }, status=403)
        
        # Check if user is registered for the contest
        from contest.models import ContestRegistration
        is_registered = ContestRegistration.objects.filter(
            user=user, contest=contest
        ).first()
        
        if not is_registered and contest_status != "test":
            return Response({
                "error": "You must be registered for the contest to ask clarifications"
            }, status=403)
        
        serializer = ClarificationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        validated_data = serializer.validated_data
        
        # Validate problem index if provided
        problem_index = validated_data.get('problem_index')
        if problem_index:
            valid_problems = [p.index for p in contest.problems]
            if problem_index not in valid_problems:
                return Response({
                    "error": f"Invalid problem index. Valid: {', '.join(valid_problems)} or leave empty for General"
                }, status=400)
        
        # Create clarification (initially in pending state)
        clarification = Clarification(
            contest=contest,
            author=user,
            title=validated_data['title'].strip(),
            content=validated_data['content'].strip(),
            problem_index=problem_index,
            tags=[tag.strip() for tag in validated_data.get('tags', []) if tag.strip()],
            status='pending',
            is_published=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        try:
            clarification.save()
        except Exception as e:
            return Response({"error": f"Failed to create clarification: {str(e)}"}, status=500)
        
        # Notify organizers about new pending clarification
        if self._is_contest_organizer_online(contest):
            broadcast_contest_update(contest_id, {
                "event": "clarification_pending",
                "clarification_id": str(clarification.id),
                "problem": problem_index or 'General',
                "title": clarification.title,
                "author": user.name
            })
        
        return Response({
            "message": "Clarification submitted successfully. It will be visible after approval.",
            "clarification": clarification.to_dict(user),
            "status": "pending",
            "note": "Your question is pending approval by contest organizers"
        }, status=201)
    
    def _is_user_contest_organizer(self, user, contest):
        """Check if user is contest organizer or admin"""
        if not user:
            return False
        
        # Check if user is admin
        if hasattr(user, 'role') and user.role in ['admin', 'superadmin']:
            return True
        
        # Check if user is contest creator
        if contest.created_by and contest.created_by.id == user.id:
            return True
        
        return False
    
    def _can_user_edit_clarification(self, user, clarification):
        """Check if user can edit clarification"""
        if not user:
            return False
        
        # User can only edit their own clarification if it's not published/answered
        if clarification.author.id == user.id:
            return clarification.status == 'pending' and not clarification.is_published
        
        # Organizers can always edit
        return clarification.is_user_organizer_or_admin(user)
    
    def _is_contest_organizer_online(self, contest):
        """Check if any organizer is online (simplified - always true for now)"""
        return True


class ClarificationDetailAPIView(APIView):
    """Retrieve, update, or delete a clarification"""
    
    def get(self, request, contest_id, clarification_id):
        """Get clarification details"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            clarification = Clarification.objects.get(id=clarification_id, contest=contest)
        except Clarification.DoesNotExist:
            return Response({"error": "Clarification not found"}, status=404)
        
        user = get_user_from_request(request)
        
        # Check if user can see this clarification
        if not clarification.can_user_see(user):
            return Response({"error": "You don't have permission to view this clarification"}, status=403)
        
        # Increment view count
        clarification.increment_view()
        
        # Add permission flags
        data = clarification.to_dict(user)
        data['can_edit'] = self._can_user_edit_clarification(user, clarification)
        data['can_reply'] = clarification.can_user_reply(user)
        data['can_moderate'] = clarification.is_user_organizer_or_admin(user)
        
        return Response(data)
    
    def put(self, request, contest_id, clarification_id):
        """Update a clarification (author only, before approval)"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            clarification = Clarification.objects.get(id=clarification_id, contest=contest)
        except Clarification.DoesNotExist:
            return Response({"error": "Clarification not found"}, status=404)
        
        # Check ownership
        if clarification.author.id != user.id:
            return Response({"error": "You can only edit your own clarifications"}, status=403)
        
        # Check if clarification can be edited (only pending, not published)
        if clarification.status != 'pending' or clarification.is_published:
            return Response({
                "error": "Clarification cannot be edited after approval or publication"
            }, status=403)
        
        serializer = ClarificationUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        validated_data = serializer.validated_data
        
        # Update fields
        if 'title' in validated_data:
            clarification.title = validated_data['title'].strip()
        if 'content' in validated_data:
            clarification.content = validated_data['content'].strip()
        
        clarification.updated_at = datetime.now()
        
        try:
            clarification.save()
        except Exception as e:
            return Response({"error": f"Failed to update clarification: {str(e)}"}, status=500)
        
        return Response({
            "message": "Clarification updated successfully",
            "clarification": clarification.to_dict(user)
        })
    
    def delete(self, request, contest_id, clarification_id):
        """Delete a clarification (author or organizer)"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            clarification = Clarification.objects.get(id=clarification_id, contest=contest)
        except Clarification.DoesNotExist:
            return Response({"error": "Clarification not found"}, status=404)
        
        # Check permissions: author can delete, organizers can delete
        is_author = clarification.author.id == user.id
        is_organizer = clarification.is_user_organizer_or_admin(user)
        
        if not (is_author or is_organizer):
            return Response({"error": "You don't have permission to delete this clarification"}, status=403)
        
        # Author can only delete if not published/answered
        if is_author and (clarification.is_published or clarification.is_answered):
            return Response({
                "error": "Cannot delete published or answered clarifications"
            }, status=403)
        
        try:
            clarification.delete()
        except Exception as e:
            return Response({"error": f"Failed to delete clarification: {str(e)}"}, status=500)
        
        return Response({
            "message": "Clarification deleted successfully"
        })
    
    def _can_user_edit_clarification(self, user, clarification):
        """Check if user can edit clarification"""
        if not user:
            return False
        
        # User can only edit their own clarification if it's not published/answered
        if clarification.author.id == user.id:
            return clarification.status == 'pending' and not clarification.is_published
        
        # Organizers can always edit
        return clarification.is_user_organizer_or_admin(user)


class ClarificationStatusUpdateAPIView(APIView):
    """Update clarification status (organizers only)"""
    
    def post(self, request, contest_id, clarification_id):
        """Approve, reject, or update clarification status"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            clarification = Clarification.objects.get(id=clarification_id, contest=contest)
        except Clarification.DoesNotExist:
            return Response({"error": "Clarification not found"}, status=404)
        
        # Check if user is organizer/admin
        if not clarification.is_user_organizer_or_admin(user):
            return Response({
                "error": "Only contest organizers can update clarification status"
            }, status=403)
        
        serializer = ClarificationStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        validated_data = serializer.validated_data
        new_status = validated_data['status']
        reason = validated_data.get('reason', '').strip()
        
        # Update status
        old_status = clarification.status
        clarification.status = new_status
        
        # Handle publishing logic
        if new_status == 'approved':
            clarification.is_published = True
        elif new_status == 'rejected':
            clarification.is_published = False
            # Store rejection reason
            if reason:
                if not hasattr(clarification, 'moderator_notes'):
                    clarification.moderator_notes = []
                clarification.moderator_notes.append({
                    'action': 'rejected',
                    'reason': reason,
                    'moderator': user.id,
                    'timestamp': datetime.now()
                })
        elif new_status == 'answered':
            clarification.is_answered = True
            clarification.answered_at = datetime.now()
            clarification.is_published = True  # Answered clarifications are published
        
        clarification.updated_at = datetime.now()
        
        try:
            clarification.save()
        except Exception as e:
            return Response({"error": f"Failed to update clarification status: {str(e)}"}, status=500)
        
        # Broadcast update if published
        if clarification.is_published:
            broadcast_contest_update(contest_id, {
                "event": "clarification_published",
                "clarification_id": str(clarification.id),
                "problem": clarification.problem_index or 'General',
                "title": clarification.title,
                "status": new_status,
                "is_answered": clarification.is_answered
            })
        
        # Notify author about status change
        self._notify_author(clarification, old_status, new_status, reason)
        
        return Response({
            "message": f"Clarification status updated to {new_status}",
            "clarification": clarification.to_dict(user),
            "old_status": old_status,
            "new_status": new_status,
            "is_published": clarification.is_published
        })
    
    def _notify_author(self, clarification, old_status, new_status, reason):
        """Notify author about status change (placeholder for actual notification system)"""
        # In a real system, you would:
        # 1. Send email notification
        # 2. Send in-app notification
        # 3. Update user's notification feed
        
        print(f"DEBUG: Clarification {clarification.id} status changed from {old_status} to {new_status}")
        if new_status == 'rejected' and reason:
            print(f"DEBUG: Rejection reason: {reason}")


class ClarificationReplyAPIView(APIView):
    """Add replies to clarifications (organizers only)"""
    
    def post(self, request, contest_id, clarification_id):
        """Add a reply to a clarification"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            clarification = Clarification.objects.get(id=clarification_id, contest=contest)
        except Clarification.DoesNotExist:
            return Response({"error": "Clarification not found"}, status=404)
        
        # Check if user is organizer/admin (only organizers can reply)
        if not clarification.can_user_reply(user):
            return Response({
                "error": "Only contest organizers can reply to clarifications"
            }, status=403)
        
        # Check if clarification is approved/published
        if not clarification.is_published:
            return Response({
                "error": "Cannot reply to unpublished clarifications. Approve it first."
            }, status=400)
        
        serializer = ClarificationReplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        content = serializer.validated_data['content'].strip()
        
        # Create reply
        from .models import ClarificationReply
        reply = ClarificationReply(
            content=content,
            author=user,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Add reply to clarification
        clarification.replies.append(reply)
        clarification.is_answered = True
        clarification.answered_at = datetime.now()
        clarification.status = 'answered'
        clarification.updated_at = datetime.now()
        
        try:
            clarification.save()
        except Exception as e:
            return Response({"error": f"Failed to add reply: {str(e)}"}, status=500)
        
        # Broadcast update
        broadcast_contest_update(contest_id, {
            "event": "clarification_replied",
            "clarification_id": str(clarification.id),
            "problem": clarification.problem_index or 'General',
            "title": clarification.title,
            "reply_preview": content[:100] + "..." if len(content) > 100 else content,
            "replier": user.name
        })
        
        return Response({
            "message": "Reply added successfully",
            "reply": reply.to_dict(),
            "clarification": clarification.to_dict(user),
            "is_answered": True
        }, status=201)
    
    def put(self, request, contest_id, clarification_id, reply_id):
        """Edit a reply (organizer only)"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            clarification = Clarification.objects.get(id=clarification_id, contest=contest)
        except Clarification.DoesNotExist:
            return Response({"error": "Clarification not found"}, status=404)
        
        # Find the reply
        reply_index = -1
        reply = None
        for idx, r in enumerate(clarification.replies):
            if str(r.id) == reply_id:
                reply = r
                reply_index = idx
                break
        
        if not reply:
            return Response({"error": "Reply not found"}, status=404)
        
        # Check if user is the reply author
        if reply.author.id != user.id:
            return Response({"error": "You can only edit your own replies"}, status=403)
        
        serializer = ClarificationReplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        # Update reply
        reply.content = serializer.validated_data['content'].strip()
        reply.updated_at = datetime.now()
        reply.is_edited = True
        
        # Update in list
        clarification.replies[reply_index] = reply
        clarification.updated_at = datetime.now()
        
        try:
            clarification.save()
        except Exception as e:
            return Response({"error": f"Failed to update reply: {str(e)}"}, status=500)
        
        return Response({
            "message": "Reply updated successfully",
            "reply": reply.to_dict()
        })


class ClarificationWatchAPIView(APIView):
    """Watch/unwatch a clarification for updates"""
    
    def post(self, request, contest_id, clarification_id):
        """Toggle watch status for a clarification"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            clarification = Clarification.objects.get(id=clarification_id, contest=contest)
        except Clarification.DoesNotExist:
            return Response({"error": "Clarification not found"}, status=404)
        
        # Check if user can see this clarification
        if not clarification.can_user_see(user):
            return Response({"error": "You don't have permission to watch this clarification"}, status=403)
        
        action = request.data.get('action', 'toggle').strip().lower()
        
        # Check current watch status
        is_watching = user.id in [str(w.id) for w in clarification.participants_watching]
        
        if action == 'toggle':
            if is_watching:
                clarification.remove_watcher(user)
                message = "Stopped watching clarification"
                watching = False
            else:
                clarification.add_watcher(user)
                message = "Started watching clarification"
                watching = True
        elif action == 'watch':
            if is_watching:
                return Response({"error": "Already watching this clarification"}, status=400)
            clarification.add_watcher(user)
            message = "Started watching clarification"
            watching = True
        elif action == 'unwatch':
            if not is_watching:
                return Response({"error": "Not watching this clarification"}, status=400)
            clarification.remove_watcher(user)
            message = "Stopped watching clarification"
            watching = False
        else:
            return Response({"error": "Invalid action. Use 'toggle', 'watch', or 'unwatch'"}, status=400)
        
        return Response({
            "message": message,
            "watching": watching,
            "watchers_count": len(clarification.participants_watching)
        })


# clarification/views.py - FIXED ClarificationVoteAPIView
class ClarificationVoteAPIView(APIView):
    """Vote on clarifications with toggle functionality"""
    
    def post(self, request, contest_id, clarification_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            clarification = Clarification.objects.get(id=clarification_id, contest=contest)
        except Clarification.DoesNotExist:
            return Response({"error": "Clarification not found"}, status=404)
        
        # Check if clarification is published
        if not clarification.is_published:
            return Response({"error": "Cannot vote on unpublished clarifications"}, status=400)
        
        # Check if user has already voted
        user_voted = False
        vote_index = -1
        
        for idx, vote in enumerate(clarification.votes):
            if vote.user.id == user.id:
                user_voted = True
                vote_index = idx
                break
        
        # Toggle vote
        if user_voted:
            # Remove vote
            clarification.votes.pop(vote_index)
            clarification.upvotes -= 1
            message = "Vote removed"
            user_voted_state = False
        else:
            # Add vote
            new_vote = ClarificationVote(user=user)
            clarification.votes.append(new_vote)
            clarification.upvotes += 1
            message = "Vote added"
            user_voted_state = True
        
        clarification.updated_at = datetime.now()
        
        try:
            clarification.save()
        except Exception as e:
            return Response({"error": f"Failed to update vote: {str(e)}"}, status=500)
        
        return Response({
            "message": message,
            "upvotes": clarification.upvotes,
            "user_voted": user_voted_state
        })

class MyClarificationsAPIView(APIView):
    """Get user's clarifications across all contests"""
    
    def get(self, request):
        """Get all clarifications by the user"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        # Get all clarifications by user
        user_clarifications = Clarification.objects(author=user).order_by('-created_at')
        
        # Format response
        clarifications_data = []
        for clarification in user_clarifications:
            data = clarification.to_dict(user)
            data['contest_info'] = {
                "id": str(clarification.contest.id),
                "title": clarification.contest.title,
                "status": get_contest_status(clarification.contest)
            }
            clarifications_data.append(data)
        
        return Response({
            "clarifications": clarifications_data,
            "count": len(clarifications_data),
            "stats": {
                "pending": user_clarifications.filter(status='pending').count(),
                "approved": user_clarifications.filter(status='approved').count(),
                "answered": user_clarifications.filter(status='answered').count(),
                "rejected": user_clarifications.filter(status='rejected').count()
            }
        })


class OrganizerClarificationsAPIView(APIView):
    """Get clarifications that need organizer attention"""
    
    def get(self, request, contest_id):
        """Get pending clarifications for organizers"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check if user is organizer/admin
        if not (contest.created_by and contest.created_by.id == user.id) and \
           not (hasattr(user, 'role') and user.role in ['admin', 'superadmin']):
            return Response({"error": "Only contest organizers can view this"}, status=403)
        
        # Get pending clarifications
        pending_clarifications = Clarification.objects(
            contest=contest,
            status='pending',
            is_published=False
        ).order_by('-created_at')
        
        # Get recent answered clarifications
        recent_answered = Clarification.objects(
            contest=contest,
            status='answered',
            is_published=True
        ).order_by('-answered_at').limit(10)
        
        # Format response
        pending_data = [c.to_dict(user) for c in pending_clarifications]
        answered_data = [c.to_dict(user) for c in recent_answered]
        
        stats = {
            "pending": pending_clarifications.count(),
            "published": Clarification.objects(contest=contest, is_published=True).count(),
            "answered": Clarification.objects(contest=contest, is_answered=True).count(),
            "total": Clarification.objects(contest=contest).count()
        }
        
        return Response({
            "pending_clarifications": pending_data,
            "recent_answered": answered_data,
            "stats": stats,
            "contest": {
                "id": str(contest.id),
                "title": contest.title,
                "status": get_contest_status(contest)
            }
        })
    

    