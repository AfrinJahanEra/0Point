# discussion/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
import pytz
from mongoengine.queryset.visitor import Q
from contest.views import get_contest_status

from .models import Discussion, Comment, DiscussionVote
from .serializers import (
    DiscussionCreateSerializer, 
    DiscussionUpdateSerializer,
    CommentCreateSerializer,
    CommentUpdateSerializer
)
from contest.utils.auth import get_user_from_request
from contest.models import Contest
from account.models import Account
from utils.cache_keys import invalidate_discussions, CK, TTL_DISCUSSION_LIST
from django.core.cache import cache


class DiscussionListCreateAPIView(APIView):
    """List and create discussions for a contest"""
    
    def get(self, request, contest_id):
        """Get discussions with filters and sorting"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        user = get_user_from_request(request)
        
        # Get query parameters
        search_query = request.query_params.get('search', '').strip()
        problem_filter = request.query_params.get('problem', '').strip().upper()
        tag_filter = request.query_params.get('tag', '').strip()
        sort_by = request.query_params.get('sort', 'recent')  # recent, popular
        page = int(request.query_params.get('page', 1))
        per_page = int(request.query_params.get('per_page', 20))
        
        # Build query
        query = Q(contest=contest)
        
        # Apply problem filter
        if problem_filter:
            if problem_filter == 'GENERAL':
                query &= Q(problem_index=None) | Q(problem_index='')
            else:
                query &= Q(problem_index=problem_filter)
        
        # Apply search
        if search_query:
            query &= (
                Q(title__icontains=search_query) |
                Q(content__icontains=search_query) |
                Q(tags__icontains=search_query)
            )
        
        # Apply tag filter
        if tag_filter:
            query &= Q(tags__icontains=tag_filter)
        
        # Get discussions
        discussions = Discussion.objects(query)
        
        # Apply sorting
        if sort_by == 'popular':
            discussions = discussions.order_by('-upvotes', '-created_at')
        elif sort_by == 'comments':
            discussions = discussions.order_by('-comment_count', '-created_at')
        else:  # recent
            discussions = discussions.order_by('-created_at')
        
        # Pagination
        total = discussions.count()
        start = (page - 1) * per_page
        end = start + per_page
        paginated_discussions = discussions[start:end]
        
        # Prepare response data with user-specific info
        discussions_data = []
        for discussion in paginated_discussions:
            data = self.format_discussion_for_frontend(discussion, user)
            discussions_data.append(data)
        
        return Response({
            "discussions": discussions_data,
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
                "total_discussions": total
            }
        })
    
    # In discussion/views.py - COMPLETE FIX
    def post(self, request, contest_id):
        """Create a new discussion"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        # Check if contest allows discussions
        contest_status = get_contest_status(contest)
        if contest_status == "draft":
            return Response({"error": "Discussions not allowed for draft contests"}, status=403)
        
        # Map frontend field names to backend field names
        data = request.data.copy()
        
        # Convert 'problem' to 'problem_index' if present
        if 'problem' in data:
            data['problem_index'] = data.pop('problem')
        
        serializer = DiscussionCreateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        validated_data = serializer.validated_data
        
        # Validate problem index if provided
        problem_index = validated_data.get('problem_index', '').strip().upper()
        
        if problem_index:
            # Check if it's "GENERAL" (should be handled as empty)
            if problem_index == 'GENERAL':
                problem_index = None
            else:
                # Validate against actual contest problems
                valid_problems = [p.index for p in contest.problems]
                if problem_index not in valid_problems:
                    return Response({"error": f"Invalid problem index. Valid: {', '.join(valid_problems)} or General"}, status=400)
        
        # Create discussion
        discussion = Discussion(
            contest=contest,
            author=user,
            title=validated_data['title'].strip(),
            content=validated_data['content'].strip(),
            problem_index=problem_index,  # Will be None for General
            tags=[tag.strip() for tag in validated_data.get('tags', []) if tag.strip()],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        try:
            discussion.save()
        except Exception as e:
            return Response({"error": f"Failed to create discussion: {str(e)}"}, status=500)
        
        # Invalidate discussion list cache so the new discussion appears immediately
        invalidate_discussions(contest_id)

        return Response({
            "message": "Discussion created successfully",
            "discussion": self.format_discussion_for_frontend(discussion, user)
        }, status=201)

    def format_discussion_for_frontend(self, discussion, user=None):
        """Format discussion data for frontend consumption"""
        
        # Get author info based on your Account model
        author = discussion.author
        
        # Fix the batch line - handle None values
        department = getattr(author, 'department', '') or ''
        year = getattr(author, 'year', '') or ''
        
        mapped_data = {
            "id": str(discussion.id),
            "title": discussion.title,
            "content": discussion.content,
            "author": {
                "id": str(author.id) if author else None,
                "name": author.name if author else "Unknown",
                "email": author.email if author else "",
                "avatar": "",
                "rating": getattr(author, 'rating', 0),
                "role": self.get_author_role(discussion),
                "batch": f"{department} {year}".strip()
            },
            # Handle None as "General"
            "problem": discussion.problem_index if discussion.problem_index else 'General',
            "tags": discussion.tags,
            "createdAt": discussion.created_at.isoformat() if discussion.created_at else None,
            "upvotes": discussion.upvotes,
            "downvotes": discussion.downvotes,
            "comments": discussion.comment_count,
            "saved": False if not user else user.id in [str(saved_user.id) for saved_user in discussion.saved_by],
            "voteStatus": None
        }
        
        # Add user-specific data
        if user:
            # Check if user has voted
            user_vote = next(
                (vote for vote in discussion.votes if vote.user.id == user.id),
                None
            )
            if user_vote:
                mapped_data["voteStatus"] = "upvoted" if user_vote.vote_type == 'upvote' else "downvoted"
            
            # Check if saved
            mapped_data["saved"] = user.id in [str(saved_user.id) for saved_user in discussion.saved_by]
        
        return mapped_data

    def get_author_role(self, discussion):
        """Determine author's role for display"""
        if not discussion.author:
            return "Participant"
        
        # Check if author is contest creator
        if discussion.contest.created_by and discussion.contest.created_by.id == discussion.author.id:
            return "Contest Organizer"
        
        # Check based on rating
        rating = getattr(discussion.author, 'rating', 0)
        if rating >= 2000:
            return "Top Contestant"
        elif rating >= 1800:
            return "Problem Solver"
        else:
            return "Participant"

class DiscussionDetailAPIView(APIView):
    """Retrieve, update, or delete a discussion"""
    
    def get(self, request, contest_id, discussion_id):
        """Get discussion details"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            discussion = Discussion.objects.get(id=discussion_id, contest=contest)
        except Discussion.DoesNotExist:
            return Response({"error": "Discussion not found"}, status=404)
        
        user = get_user_from_request(request)
        
        # Increment view count
        discussion.increment_view()
        
        # Format for frontend - create instance without importing
        list_view = DiscussionListCreateAPIView()
        data = list_view.format_discussion_for_frontend(discussion, user)
        
        return Response(data)
    
    def put(self, request, contest_id, discussion_id):
        """Update a discussion"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            discussion = Discussion.objects.get(id=discussion_id, contest=contest)
        except Discussion.DoesNotExist:
            return Response({"error": "Discussion not found"}, status=404)
        
        # Check ownership
        if discussion.author.id != user.id:
            return Response({"error": "You can only edit your own discussions"}, status=403)
        
        # Check if discussion is locked
        if discussion.is_locked:
            return Response({"error": "This discussion is locked and cannot be edited"}, status=403)
        
        # Map frontend field names
        data = request.data.copy()
        if 'problem' in data:
            data['problem_index'] = data.pop('problem')
        
        serializer = DiscussionUpdateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        validated_data = serializer.validated_data
        
        # Update fields
        if 'title' in validated_data:
            discussion.title = validated_data['title'].strip()
        if 'content' in validated_data:
            discussion.content = validated_data['content'].strip()
        if 'problem_index' in validated_data:
            problem_index = validated_data['problem_index'].strip().upper()
            if problem_index:
                valid_problems = [p.index for p in contest.problems]
                if problem_index not in valid_problems:
                    return Response({"error": f"Invalid problem index. Valid: {', '.join(valid_problems)}"}, status=400)
            discussion.problem_index = problem_index if problem_index else None
        if 'tags' in validated_data:
            discussion.tags = [tag.strip() for tag in validated_data['tags'] if tag.strip()]
        
        discussion.is_edited = True
        discussion.updated_at = datetime.now()
        
        try:
            discussion.save()
        except Exception as e:
            return Response({"error": f"Failed to update discussion: {str(e)}"}, status=500)
        
        # Invalidate discussion list cache so the updated discussion appears immediately
        invalidate_discussions(contest_id)

        # Format for frontend
        list_view = DiscussionListCreateAPIView()
        
        return Response({
            "message": "Discussion updated successfully",
            "discussion": list_view.format_discussion_for_frontend(discussion, user)
        })

class DiscussionVoteAPIView(APIView):
    """Handle voting on discussions"""
    
    def post(self, request, contest_id, discussion_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            discussion = Discussion.objects.get(id=discussion_id, contest=contest)
        except Discussion.DoesNotExist:
            return Response({"error": "Discussion not found"}, status=404)
        
        vote_type = request.data.get('vote_type', '').strip().lower()
        
        # Map frontend vote_status to backend vote_type
        vote_mapping = {
            'upvoted': 'upvote',
            'downvoted': 'downvote',
            'remove': 'remove'
        }
        
        if vote_type in vote_mapping:
            vote_type = vote_mapping[vote_type]
        
        if vote_type not in ['upvote', 'downvote', 'remove']:
            return Response({"error": "Invalid vote type. Use 'upvote', 'downvote', or 'remove'"}, status=400)
        
        # Find existing vote
        existing_vote = None
        existing_vote_index = -1
        for idx, vote in enumerate(discussion.votes):
            if vote.user.id == user.id:
                existing_vote = vote
                existing_vote_index = idx
                break
        
        # Handle vote
        if vote_type == 'remove':
            if existing_vote:
                # Remove vote
                if existing_vote.vote_type == 'upvote':
                    discussion.upvotes -= 1
                else:
                    discussion.downvotes -= 1
                
                discussion.votes.pop(existing_vote_index)
            else:
                return Response({"error": "No vote to remove"}, status=400)
        else:
            if existing_vote:
                # Change vote
                if existing_vote.vote_type == vote_type:
                    return Response({"error": f"You already {vote_type}d this post"}, status=400)
                
                # Remove old vote count
                if existing_vote.vote_type == 'upvote':
                    discussion.upvotes -= 1
                else:
                    discussion.downvotes -= 1
                
                # Update vote
                existing_vote.vote_type = vote_type
                existing_vote.voted_at = datetime.now()
            else:
                # Add new vote
                new_vote = DiscussionVote(
                    user=user,
                    vote_type=vote_type,
                    voted_at=datetime.now()
                )
                discussion.votes.append(new_vote)
            
            # Update count
            if vote_type == 'upvote':
                discussion.upvotes += 1
            else:
                discussion.downvotes += 1
        
        try:
            discussion.save()
        except Exception as e:
            return Response({"error": f"Failed to update vote: {str(e)}"}, status=500)
        
        # Map backend vote_type to frontend vote_status
        vote_status_mapping = {
            'upvote': 'upvoted',
            'downvote': 'downvoted',
            'remove': None
        }
        
        return Response({
            "message": f"Vote {'removed' if vote_type == 'remove' else 'updated'} successfully",
            "upvotes": discussion.upvotes,
            "downvotes": discussion.downvotes,
            "vote_status": vote_status_mapping.get(vote_type)
        })

class DiscussionSaveAPIView(APIView):
    """Save/unsave a discussion with toggle functionality"""
    
    def post(self, request, contest_id, discussion_id):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            discussion = Discussion.objects.get(id=discussion_id, contest=contest)
        except Discussion.DoesNotExist:
            return Response({"error": "Discussion not found"}, status=404)
        
        # Get the action from request, default to 'toggle'
        action = request.data.get('action', 'toggle').strip().lower()
        
        # FIX: Proper ID comparison - convert everything to strings
        # Check if user has already saved this discussion
        current_user_id_str = str(user.id)
        saved_user_ids = []
        
        # Safely get all saved user IDs as strings
        for saved_user in discussion.saved_by:
            try:
                saved_user_id = str(saved_user.id)
                saved_user_ids.append(saved_user_id)
            except (AttributeError, TypeError):
                # Skip if user or id is None/malformed
                continue
        
        # Check current saved status
        is_currently_saved = current_user_id_str in saved_user_ids
        
        # Handle different actions
        if action == 'toggle':
            # Toggle save/unsave
            if is_currently_saved:
                # Unsave - remove user from saved_by
                discussion.saved_by = [u for u in discussion.saved_by if str(u.id) != current_user_id_str]
                saved = False
                message = "Discussion unsaved"
            else:
                # Save - add user to saved_by
                discussion.saved_by.append(user)
                saved = True
                message = "Discussion saved"
                
        elif action == 'save':
            # Explicit save action
            if is_currently_saved:
                return Response({
                    "error": "Discussion already saved"
                }, status=400)
            discussion.saved_by.append(user)
            saved = True
            message = "Discussion saved"
            
        elif action == 'unsave':
            # Explicit unsave action
            if not is_currently_saved:
                return Response({
                    "error": "Discussion not saved"
                }, status=400)
            discussion.saved_by = [u for u in discussion.saved_by if str(u.id) != current_user_id_str]
            saved = False
            message = "Discussion unsaved"
            
        else:
            return Response({"error": "Invalid action. Use 'toggle', 'save', or 'unsave'"}, status=400)
        
        # Save the updated discussion
        try:
            discussion.save()
        except Exception as e:
            return Response({"error": f"Failed to update saved status: {str(e)}"}, status=500)
        
        return Response({
            "message": message,
            "saved": saved,
            "action": action
        })

# discussion/views.py - Updated CommentListCreateAPIView
from .utils import find_comment_by_id, get_comment_depth, increment_parent_reply_count

class CommentListCreateAPIView(APIView):
    """List and create comments on a discussion"""
    
    def get(self, request, contest_id, discussion_id):
        """Get all comments for a discussion in nested format"""
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            discussion = Discussion.objects.get(id=discussion_id, contest=contest)
        except Discussion.DoesNotExist:
            return Response({"error": "Discussion not found"}, status=404)
        
        # Get nested comments structure
        nested_comments = discussion.get_nested_comments()
        
        return Response({
            "discussion_id": str(discussion.id),
            "comments": nested_comments,
            "total_comments": discussion.comment_count
        })
    
    def post(self, request, contest_id, discussion_id):
        """Add a comment to a discussion (supports nested replies)"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            discussion = Discussion.objects.get(id=discussion_id, contest=contest)
        except Discussion.DoesNotExist:
            return Response({"error": "Discussion not found"}, status=404)
        
        # Check if discussion is locked
        if discussion.is_locked:
            return Response({"error": "This discussion is locked and cannot be commented on"}, status=403)
        
        serializer = CommentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        data = serializer.validated_data
        parent_comment_id = data.get('parent_comment_id')
        
        # Validate parent comment if provided
        if parent_comment_id:
            parent_comment = find_comment_by_id(discussion.comments, parent_comment_id)
            if not parent_comment:
                return Response({"error": "Parent comment not found"}, status=404)
            
            # Check depth limit (optional, prevent too deep nesting)
            max_depth = 5
            if parent_comment.depth >= max_depth:
                return Response({"error": "Maximum reply depth reached"}, status=400)
        
        # Calculate depth for new comment
        depth = get_comment_depth(discussion.comments, parent_comment_id)
        
        # Create comment
        comment = Comment(
            content=data['content'].strip(),
            author=user,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            parent_comment_id=parent_comment_id,
            depth=depth
        )
        
        # Add to discussion
        discussion.comments.append(comment)
        discussion.comment_count += 1
        
        # Increment parent's reply count
        if parent_comment_id:
            increment_parent_reply_count(discussion.comments, parent_comment_id)
        
        discussion.updated_at = datetime.now()
        
        try:
            discussion.save()
        except Exception as e:
            return Response({"error": f"Failed to add comment: {str(e)}"}, status=500)
        
        # Get the newly added comment
        new_comment = discussion.comments[-1]
        
        return Response({
            "message": "Comment added successfully",
            "comment": new_comment.to_dict(),
            "parent_comment_id": parent_comment_id
        }, status=201)

# Update CommentDetailAPIView to handle parent-child relationships
class CommentDetailAPIView(APIView):
    """Update or delete a comment"""
    
    def delete(self, request, contest_id, discussion_id, comment_id):
        """Delete a comment and its replies"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            discussion = Discussion.objects.get(id=discussion_id, contest=contest)
        except Discussion.DoesNotExist:
            return Response({"error": "Discussion not found"}, status=404)
        
        # Find the comment and its index
        comment_index = -1
        comment_to_delete = None
        for idx, c in enumerate(discussion.comments):
            if str(c.id) == comment_id:
                comment_to_delete = c
                comment_index = idx
                break
        
        if not comment_to_delete:
            return Response({"error": "Comment not found"}, status=404)
        
        # Check permissions
        is_comment_author = comment_to_delete.author.id == user.id
        is_discussion_author = discussion.author.id == user.id
        is_admin = hasattr(user, 'role') and user.role in ['admin', 'superadmin']
        
        if not (is_comment_author or is_discussion_author or is_admin):
            return Response({"error": "You don't have permission to delete this comment"}, status=403)
        
        # Find and delete all replies to this comment
        replies_to_delete = []
        for c in discussion.comments:
            if c.parent_comment_id == comment_id:
                replies_to_delete.append(str(c.id))
        
        # Remove the comment and its replies
        updated_comments = []
        for c in discussion.comments:
            if str(c.id) != comment_id and str(c.id) not in replies_to_delete:
                updated_comments.append(c)
        
        discussion.comments = updated_comments
        discussion.comment_count = len(updated_comments)
        
        # Update parent's reply count if this was a reply
        if comment_to_delete.parent_comment_id:
            parent_comment = find_comment_by_id(discussion.comments, comment_to_delete.parent_comment_id)
            if parent_comment and parent_comment.replies_count > 0:
                parent_comment.replies_count -= 1
        
        discussion.updated_at = datetime.now()
        
        try:
            discussion.save()
        except Exception as e:
            return Response({"error": f"Failed to delete comment: {str(e)}"}, status=500)
        
        return Response({
            "message": "Comment and its replies deleted successfully",
            "deleted_comment_id": comment_id,
            "deleted_reply_ids": replies_to_delete
        })

class CommentDetailAPIView(APIView):
    """Update or delete a comment"""
    
    def put(self, request, contest_id, discussion_id, comment_id):
        """Update a comment"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            discussion = Discussion.objects.get(id=discussion_id, contest=contest)
        except Discussion.DoesNotExist:
            return Response({"error": "Discussion not found"}, status=404)
        
        # Find the comment
        comment_index = -1
        comment = None
        for idx, c in enumerate(discussion.comments):
            if str(c.id) == comment_id:
                comment = c
                comment_index = idx
                break
        
        if not comment:
            return Response({"error": "Comment not found"}, status=404)
        
        # Check ownership
        if comment.author.id != user.id:
            return Response({"error": "You can only edit your own comments"}, status=403)
        
        serializer = CommentUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        # Update comment
        comment.content = serializer.validated_data['content'].strip()
        comment.updated_at = datetime.now()
        comment.is_edited = True
        
        # Update in list
        discussion.comments[comment_index] = comment
        discussion.updated_at = datetime.now()
        
        try:
            discussion.save()
        except Exception as e:
            return Response({"error": f"Failed to update comment: {str(e)}"}, status=500)
        
        return Response({
            "message": "Comment updated successfully",
            "comment": comment.to_dict()
        })
    
    def delete(self, request, contest_id, discussion_id, comment_id):
        """Delete a comment"""
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        try:
            contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)
        
        try:
            discussion = Discussion.objects.get(id=discussion_id, contest=contest)
        except Discussion.DoesNotExist:
            return Response({"error": "Discussion not found"}, status=404)
        
        # Find the comment
        comment_index = -1
        comment = None
        for idx, c in enumerate(discussion.comments):
            if str(c.id) == comment_id:
                comment = c
                comment_index = idx
                break
        
        if not comment:
            return Response({"error": "Comment not found"}, status=404)
        
        # Check permissions (author, admin, or discussion author)
        is_comment_author = comment.author.id == user.id
        is_discussion_author = discussion.author.id == user.id
        is_admin = hasattr(user, 'role') and user.role in ['admin', 'superadmin']
        
        if not (is_comment_author or is_discussion_author or is_admin):
            return Response({"error": "You don't have permission to delete this comment"}, status=403)
        
        # Remove comment
        discussion.comments.pop(comment_index)
        discussion.comment_count -= 1
        discussion.updated_at = datetime.now()
        
        try:
            discussion.save()
        except Exception as e:
            return Response({"error": f"Failed to delete comment: {str(e)}"}, status=500)
        
        return Response({"message": "Comment deleted successfully"})

class MySavedDiscussionsAPIView(APIView):
    """Get user's saved discussions"""
    
    def get(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({"error": "Authentication required"}, status=401)
        
        # Get discussions saved by user
        saved_discussions = Discussion.objects(saved_by__in=[user])
        
        # Format response
        discussions_data = []
        for discussion in saved_discussions:
            data = discussion.to_dict()
            data["saved"] = True
            discussions_data.append(data)
        
        return Response({
            "saved_discussions": discussions_data,
            "count": len(discussions_data)
        })
    
