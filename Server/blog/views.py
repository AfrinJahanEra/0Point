# blog/views.py
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Blog, BlogCommentVote, BlogVote, BlogComment
from .serializers import BlogCommentVoteSerializer, BlogSerializer, BlogVoteSerializer, BlogCommentSerializer
from account.models import Account
import jwt
from django.conf import settings
from django.core.cache import cache
from utils.cache_keys import invalidate_blog_list, CK

def get_user_from_request(request):
    """
    Extract user from Authorization header 'Bearer <token>'.
    Returns Account document or None.
    """
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth:
        return None
    parts = auth.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return None
    user_id = payload.get("user_id")
    if not user_id:
        return None
    user = Account.objects(id=user_id, is_deleted=False).first()
    return user

@api_view(['POST'])
def create_blog(request):
    """Create a new blog post"""
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    serializer = BlogSerializer(data=request.data, context={'request': request, 'user': user})
    if serializer.is_valid():
        blog = serializer.save()

        # Check if we should publish immediately
        publish_immediately = request.data.get('publish', False)
        if publish_immediately:
            blog.is_draft = False
            blog.is_published = True
            blog.save()

            # Update author's blog count
            blog.author.blog_count += 1
            blog.author.save()

            # Invalidate blog list cache so the new post appears immediately
            invalidate_blog_list()

        return Response(blog.to_dict(), status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def save_draft(request, blog_id):
    """Save blog as draft"""
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        blog = Blog.objects.get(id=blog_id)
        # Check if user is author or co-author
        if blog.author != user and user not in blog.co_authors:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        serializer = BlogSerializer(blog, data=request.data, partial=True, context={'request': request, 'user': user})
        if serializer.is_valid():
            blog = serializer.save()
            blog.is_draft = True
            blog.is_published = False
            blog.save()
            return Response(blog.to_dict(), status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Blog.DoesNotExist:
        return Response({'error': 'Blog not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def publish_blog(request, blog_id):
    """Publish a blog post"""
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        blog = Blog.objects.get(id=blog_id)
        # Check if user is author or co-author
        if blog.author != user and user not in blog.co_authors:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        # Update the blog with new data if provided
        serializer = BlogSerializer(blog, data=request.data, partial=True, context={'request': request, 'user': user})
        if serializer.is_valid():
            blog = serializer.save()
            blog.is_draft = False
            blog.is_published = True
            blog.save()

            # Update author's blog count
            blog.author.blog_count += 1
            blog.author.save()

            # Invalidate published blog list cache
            invalidate_blog_list()

            return Response(blog.to_dict(), status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Blog.DoesNotExist:
        return Response({'error': 'Blog not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def get_blog(request, blog_id):
    """Get a specific blog post (includes live vote counts for targeted refresh)"""
    try:
        blog = Blog.objects.get(id=blog_id)
        # Check if user can view this blog
        if blog.is_draft:
            user = get_user_from_request(request)
            if not user or (blog.author != user and user not in blog.co_authors):
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        # Return with live vote counts
        d = blog.to_dict()
        return Response(d, status=status.HTTP_200_OK)
    except Blog.DoesNotExist:
        return Response({'error': 'Blog not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def list_published_blogs(request):
    """List all published blogs"""
    CACHE_KEY = CK.blog_list()
    CACHE_TTL = 60  # 60 seconds

    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return Response(cached, status=status.HTTP_200_OK)

    try:
        blogs = list(Blog.objects(is_published=True).order_by('-published_at'))

        # Batch-fetch all vote counts in 2 queries instead of 2*N queries
        from collections import defaultdict
        blog_ids = [b.id for b in blogs]
        up_counts   = defaultdict(int)
        down_counts = defaultdict(int)
        for vote in BlogVote.objects(blog__in=blog_ids).only('blog', 'vote_type'):
            bid = vote.blog.id
            if vote.vote_type == 'upvote':
                up_counts[bid] += 1
            else:
                down_counts[bid] += 1

        blog_data = []
        for blog in blogs:
            d = blog.to_dict_no_votes()
            up   = up_counts[blog.id]
            down = down_counts[blog.id]
            d['upvotes']   = up
            d['downvotes'] = down
            d['score']     = up - down
            blog_data.append(d)

        cache.set(CACHE_KEY, blog_data, timeout=CACHE_TTL)
        return Response(blog_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def list_user_drafts(request):
    """List user's draft blogs"""
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        blogs = Blog.objects(author=user, is_draft=True).order_by('-updated_at')
        blog_data = [blog.to_dict() for blog in blogs]
        return Response(blog_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def list_user_published_blogs(request):
    """List user's published blogs"""
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        blogs = Blog.objects(author=user, is_published=True).order_by('-published_at')
        blog_data = [blog.to_dict() for blog in blogs]
        return Response(blog_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def create_test_blog(request):
    """Create a test blog for debugging"""
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Create a test blog
        blog = Blog(
            title="Test Blog Post",
            content="This is a test blog post to verify the system is working.",
            tags=["test", "debug"],
            author=user,
            is_draft=False,
            is_published=True
        )
        blog.save()
        return Response({'message': 'Test blog created', 'blog': blog.to_dict()}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def vote_blog(request, blog_id):
    """Vote on a blog post (upvote/downvote)"""
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        blog = Blog.objects.get(id=blog_id, is_published=True)
    except Blog.DoesNotExist:
        return Response({'error': 'Blog not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = BlogVoteSerializer(data={'blog_id': blog_id, 'vote_type': request.data.get('vote_type')}, context={'request': request, 'user': user})
    if serializer.is_valid():
        result = serializer.save()

        # Compute updated counts after the vote
        upvotes   = BlogVote.objects(blog=blog, vote_type='upvote').count()
        downvotes = BlogVote.objects(blog=blog, vote_type='downvote').count()
        current_vote = BlogVote.objects(blog=blog, user=user).first()
        user_vote = current_vote.vote_type if current_vote else None

        # Invalidate published list cache so next full-page load reflects new counts
        invalidate_blog_list()

        if isinstance(result, dict) and result.get('message') == 'Vote removed':
            return Response({
                'message': 'Vote removed', 'vote_type': None,
                'upvotes': upvotes, 'downvotes': downvotes,
                'score': upvotes - downvotes, 'user_vote': user_vote
            }, status=status.HTTP_200_OK)
        return Response({
            'message': 'Vote recorded',
            'upvotes': upvotes, 'downvotes': downvotes,
            'score': upvotes - downvotes, 'user_vote': user_vote
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_blog_votes(request, blog_id):
    """Get vote counts for a blog"""
    try:
        blog = Blog.objects.get(id=blog_id, is_published=True)
        upvotes = BlogVote.objects(blog=blog, vote_type='upvote').count()
        downvotes = BlogVote.objects(blog=blog, vote_type='downvote').count()
        
        # Check user's vote if authenticated
        user_vote = None
        user = get_user_from_request(request)
        if user:
            vote = BlogVote.objects(blog=blog, user=user).first()
            user_vote = vote.vote_type if vote else None
        
        return Response({
            'upvotes': upvotes,
            'downvotes': downvotes,
            'score': upvotes - downvotes,
            'user_vote': user_vote
        }, status=status.HTTP_200_OK)
    except Blog.DoesNotExist:
        return Response({'error': 'Blog not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def create_comment(request, blog_id):
    """Create a comment on a blog post"""
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        blog = Blog.objects.get(id=blog_id, is_published=True)
    except Blog.DoesNotExist:
        return Response({'error': 'Blog not found'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data.copy()
    data['blog_id'] = blog_id

    serializer = BlogCommentSerializer(data=data, context={'request': request, 'user': user})
    if serializer.is_valid():
        comment = serializer.save()
        # Return comment dict with user_vote = None (newly created, no votes yet)
        comment_dict = comment.to_dict()
        comment_dict['user_vote'] = None
        comment_dict['replies'] = []  # fresh comment has no replies
        return Response(comment_dict, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_blog_comments(request, blog_id):
    """Get all comments for a blog post"""
    try:
        blog = Blog.objects.get(id=blog_id, is_published=True)
        
        # Get top-level comments (no parent)
        comments = BlogComment.objects(blog=blog, parent_comment=None, is_deleted=False).order_by('created_at')
        count = comments.count()
        print(f"[Comments] Blog {blog_id}: found {count} top-level comments")
        
        user = get_user_from_request(request)
        
        comment_data = []
        for comment in comments:
            comment_dict = comment.to_dict()
            # Add user vote information if user is authenticated
            if user:
                vote = BlogCommentVote.objects(comment=comment, user=user).first()
                comment_dict['user_vote'] = vote.vote_type if vote else None
            else:
                comment_dict['user_vote'] = None
            
            # Recursively get replies with vote info
            comment_dict['replies'] = get_nested_replies_with_votes(comment, user)
            comment_data.append(comment_dict)
        
        print(f"[Comments] Blog {blog_id}: returning {len(comment_data)} comments with replies")
        return Response(comment_data, status=status.HTTP_200_OK)
    except Blog.DoesNotExist:
        print(f"[Comments] Blog {blog_id}: not found")
        return Response({'error': 'Blog not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"[Comments] Blog {blog_id}: error - {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def get_nested_replies_with_votes(comment, user):
    """Helper function to get nested replies recursively with vote information"""
    replies = []
    for reply in comment.replies:
        if not reply.is_deleted:
            reply_dict = reply.to_dict()  # No include_replies, replies added separately
            
            # Add user vote information if user is authenticated
            if user:
                vote = BlogCommentVote.objects(comment=reply, user=user).first()
                reply_dict['user_vote'] = vote.vote_type if vote else None
            else:
                reply_dict['user_vote'] = None
            
            # Recursively get nested replies
            reply_dict['replies'] = get_nested_replies_with_votes(reply, user)
            replies.append(reply_dict)
    return replies


@api_view(['GET'])
def get_comment_votes(request, comment_id):
    """Get vote counts for a comment"""
    try:
        comment = BlogComment.objects.get(id=comment_id, is_deleted=False)
        upvotes = BlogCommentVote.objects(comment=comment, vote_type='upvote').count()
        downvotes = BlogCommentVote.objects(comment=comment, vote_type='downvote').count()
        
        # Check user's vote if authenticated
        user_vote = None
        user = get_user_from_request(request)
        if user:
            vote = BlogCommentVote.objects(comment=comment, user=user).first()
            user_vote = vote.vote_type if vote else None
        
        return Response({
            'upvotes': upvotes,
            'downvotes': downvotes,
            'score': upvotes - downvotes,
            'user_vote': user_vote
        }, status=status.HTTP_200_OK)
    except BlogComment.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def vote_comment(request, comment_id):
    """Vote on a comment (upvote/downvote)"""
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        comment = BlogComment.objects.get(id=comment_id, is_deleted=False)
    except BlogComment.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = BlogCommentVoteSerializer(
        data={'comment_id': comment_id, 'vote_type': request.data.get('vote_type')},
        context={'request': request, 'user': user}
    )
    if serializer.is_valid():
        serializer.save()

        # Always return current counts (whether vote was added, changed, or removed)
        upvotes   = BlogCommentVote.objects(comment=comment, vote_type='upvote').count()
        downvotes = BlogCommentVote.objects(comment=comment, vote_type='downvote').count()
        current_vote = BlogCommentVote.objects(comment=comment, user=user).first()
        user_vote = current_vote.vote_type if current_vote else None

        return Response({
            'upvotes': upvotes,
            'downvotes': downvotes,
            'score': upvotes - downvotes,
            'user_vote': user_vote
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def delete_comment(request, comment_id):
    """Delete a comment (soft delete)"""
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        comment = BlogComment.objects.get(id=comment_id)
        
        # Check if user is the author or blog author
        if comment.author != user and comment.blog.author != user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        comment.is_deleted = True
        comment.save()
        
        return Response({'message': 'Comment deleted'}, status=status.HTTP_200_OK)
    except BlogComment.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
