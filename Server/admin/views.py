from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.core.mail import send_mail
from django.core.cache import cache
import jwt
import hashlib
from datetime import datetime, timedelta

from .secret import ADMIN_SECRET_PASSWORD
from account.models import Account, BannedAccount, IPAddress, DeviceFingerprint
from contest.models import Contest
from blog.models import Blog, BlogComment, BlogVote, BlogCommentVote
from problem.models import Problem
from submission.models import Submission
from announcement.models import Announcement
from testcontest.models import TestContest, TestContestSubmission
from virtual.models import VirtualContest, VirtualContestSubmission
from tutorial.models import Tutorial
from compiler.models import CodeSubmission

# Cache TTLs (seconds)
_ADMIN_STATS_TTL = 60      # stats change frequently, keep short
_ADMIN_LIST_TTL  = 90      # lists (users, blogs, contests, …)
_ADMIN_SUBS_TTL  = 30      # submissions refresh faster


def send_ban_notification_email(user_email, user_name, ban_reason):
    """Send professional email notification to banned user"""
    subject = 'Account Suspension Notice - 0Point Platform'
    
    message = f"""Dear {user_name},

We are writing to inform you that your account on the 0Point platform has been permanently suspended.

Reason for Suspension:
{ban_reason}

As a result of this action:
- Your account has been permanently deactivated
- You will no longer be able to access the platform
- All associated data has been removed from our active systems

This decision was made after careful review and is in accordance with our Terms of Service and Community Guidelines. Account suspensions are permanent and cannot be appealed.

If you believe this action was taken in error or have questions regarding our policies, please contact our support team at support@0point.com.

Thank you for your understanding.

Best regards,
The 0Point Administration Team

---
This is an automated message. Please do not reply to this email.
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[user_email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send ban notification email: {str(e)}")
        return False


class AdminLoginView(APIView):
    def post(self, request):
        secret_password = request.data.get("secret_password")
        email = request.data.get("email")
        password = request.data.get("password")
        
        # Validate admin secret password
        if secret_password != ADMIN_SECRET_PASSWORD:
            return Response({"error": "Invalid admin secret password"}, status=401)
        
        # Validate user credentials
        user = Account.objects(email=email, is_deleted=False).first()
        if not user:
            return Response({"error": "Invalid email or password"}, status=400)
        
        if not user.check_password(password):
            return Response({"error": "Invalid email or password"}, status=400)
        
        # Check if user is admin
        if user.role != "admin":
            return Response({"error": "User is not an admin"}, status=403)
        
        # Generate token
        payload = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role,
        }
        
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
        
        return Response({
            "token": token, 
            "user": payload,
            "message": "Admin login successful"
        })


class AdminDashboardView(APIView):
    def get(self, request):
        cached = cache.get('zp:admin_stats')
        if cached is not None:
            return Response(cached)

        # Get comprehensive counts for dashboard
        user_count = Account.objects(is_deleted=False).count()
        admin_count = Account.objects(is_deleted=False, role='admin').count()
        banned_count = BannedAccount.objects.count()
        
        # Blog stats
        blog_count = Blog.objects(is_draft=False).count()
        draft_blog_count = Blog.objects(is_draft=True).count()
        blog_comment_count = BlogComment.objects(is_deleted=False).count()
        blog_vote_count = BlogVote.objects.count()
        
        # Contest stats
        contest_count = Contest.objects.count()
        live_contest_count = Contest.objects(status='live').count()
        upcoming_contest_count = Contest.objects(status='upcoming').count()
        test_contest_count = TestContest.objects.count()
        virtual_contest_count = VirtualContest.objects.count()
        
        # Problem stats - count from contest problems
        problem_count = 0
        for contest in Contest.objects.only('problems'):
            if contest.problems:
                problem_count += len(contest.problems)
        
        # Submission stats
        submission_count = Submission.objects.count()
        ac_submission_count = Submission.objects(verdict='AC').count()
        test_submission_count = TestContestSubmission.objects.count()
        virtual_submission_count = VirtualContestSubmission.objects.count()
        code_execution_count = CodeSubmission.objects.count()
        
        # Announcement and Tutorial stats
        announcement_count = Announcement.objects.count()
        tutorial_count = Tutorial.objects.count()
        
        # Recent activity stats (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_users_week = Account.objects(is_deleted=False, created_at__gte=week_ago).count()
        new_blogs_week = Blog.objects(created_at__gte=week_ago).count()
        submissions_week = Submission.objects(submitted_at__gte=week_ago).count()
        
        # Activity trends (last 24 hours)
        day_ago = datetime.utcnow() - timedelta(days=1)
        submissions_today = Submission.objects(submitted_at__gte=day_ago).count()
        new_users_today = Account.objects(is_deleted=False, created_at__gte=day_ago).count()
        
        result = {
            "stats": {
                "users": {
                    "total": user_count,
                    "admins": admin_count,
                    "banned": banned_count,
                    "new_this_week": new_users_week,
                    "new_today": new_users_today
                },
                "blogs": {
                    "published": blog_count,
                    "drafts": draft_blog_count,
                    "comments": blog_comment_count,
                    "votes": blog_vote_count,
                    "new_this_week": new_blogs_week
                },
                "contests": {
                    "total": contest_count,
                    "live": live_contest_count,
                    "upcoming": upcoming_contest_count,
                    "test_contests": test_contest_count,
                    "virtual_contests": virtual_contest_count
                },
                "problems": {
                    "total": problem_count
                },
                "submissions": {
                    "total": submission_count,
                    "accepted": ac_submission_count,
                    "acceptance_rate": round((ac_submission_count / submission_count * 100) if submission_count > 0 else 0, 2),
                    "test_submissions": test_submission_count,
                    "virtual_submissions": virtual_submission_count,
                    "code_executions": code_execution_count,
                    "this_week": submissions_week,
                    "today": submissions_today
                },
                "announcements": announcement_count,
                "tutorials": tutorial_count
            }
        }
        cache.set('zp:admin_stats', result, _ADMIN_STATS_TTL)
        return Response(result)


class AdminUsersView(APIView):
    def get(self, request):
        search = request.GET.get('search', '')
        limit = int(request.GET.get('limit', 100))  # Default limit

        # Only cache the default (no search) request
        cache_key = f'zp:admin_users_list_{limit}' if not search else None
        if cache_key:
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)
            from mongoengine.queryset.visitor import Q
            users = Account.objects(
                Q(is_deleted=False) & (Q(name__icontains=search) | Q(email__icontains=search))
            ).order_by("-created_at").limit(limit)
        else:
            users = Account.objects(is_deleted=False).order_by("-created_at").limit(limit)
        
        user_data = []
        
        for user in users:
            try:
                # Get all IP addresses (including legacy)
                all_ips = []
                
                # Check new ip_addresses field
                if hasattr(user, 'ip_addresses'):
                    for ip_obj in user.ip_addresses:
                        if hasattr(ip_obj, 'address'):
                            all_ips.append(ip_obj.address)
                
                # Check old ip_address field
                if hasattr(user, 'ip_address') and user.ip_address:
                    if user.ip_address not in all_ips:
                        all_ips.append(user.ip_address)
                
                # Get device fingerprints
                device_fps = []
                if hasattr(user, 'device_fingerprints'):
                    for df_obj in user.device_fingerprints:
                        if hasattr(df_obj, 'fingerprint'):
                            device_fps.append(df_obj.fingerprint)
                
                user_data.append({
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "created_at": user.created_at,
                    "is_inactive": user.is_inactive,
                    "is_banned": user.is_banned,
                    "blog_count": user.blog_count,
                    "rating": user.rating,
                    "badge": user.badge,
                    "ip_addresses": all_ips,
                    "ip_count": len(all_ips),
                    "device_count": len(device_fps),
                })
            except Exception as e:
                # Fallback for users with data issues
                user_data.append({
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "created_at": user.created_at,
                    "is_inactive": user.is_inactive,
                    "is_banned": user.is_banned,
                    "blog_count": user.blog_count,
                    "rating": user.rating,
                    "badge": user.badge,
                    "ip_addresses": [],
                    "ip_count": 0,
                    "device_count": 0,
                    "error": "Data format issue"
                })
        
        if cache_key:
            cache.set(cache_key, user_data, _ADMIN_LIST_TTL)
        return Response(user_data)
    
    def delete(self, request, user_id):
        try:
            # Get admin info from JWT token
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                try:
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                    admin_email = payload.get('email', 'System')
                except:
                    admin_email = 'System'
            else:
                admin_email = 'System'
            
            user = Account.objects.get(id=user_id)
            
            # Get ban reason from request
            ban_reason = request.data.get('ban_reason', 'Violation of terms of service')
            
            # Send email notification BEFORE deleting user
            email_sent = send_ban_notification_email(
                user_email=user.email,
                user_name=user.name,
                ban_reason=ban_reason
            )
            
            # Get all IP addresses
            all_ips = []
            if hasattr(user, 'ip_addresses'):
                for ip_obj in user.ip_addresses:
                    if hasattr(ip_obj, 'address'):
                        all_ips.append(ip_obj.address)
            
            if hasattr(user, 'ip_address') and user.ip_address:
                if user.ip_address not in all_ips:
                    all_ips.append(user.ip_address)
            
            # Get device fingerprints
            device_fps = []
            if hasattr(user, 'device_fingerprints'):
                for df_obj in user.device_fingerprints:
                    if hasattr(df_obj, 'fingerprint'):
                        device_fps.append(df_obj.fingerprint)
            
            # Create banned account record BEFORE deleting
            banned_account = BannedAccount(
                original_user_id=str(user.id),
                email=user.email,
                name=user.name,
                ip_addresses=all_ips,
                device_fingerprints=device_fps,
                reason=ban_reason,
                banned_by=admin_email,
                banned_at=datetime.utcnow()
            )
            banned_account.save()
            
            # Permanently delete the user
            user.delete()

            # Invalidate user/stats caches
            cache.delete('zp:admin_stats')
            cache.delete_many([f'zp:admin_users_list_{l}' for l in [50, 100, 200]])
            cache.delete('zp:admin_banned_list')
            
            return Response({
                "message": "User permanently banned and deleted",
                "email_notification_sent": email_sent,
                "details": {
                    "email": user.email,
                    "reason": ban_reason,
                    "prevention_measures": [
                        f"Email blocked from registration",
                        f"IP addresses blocked: {len(all_ips)}",
                        f"Devices blocked: {len(device_fps)}"
                    ]
                }
            })
            
        except Account.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        except Exception as e:
            return Response({"error": f"Error banning user: {str(e)}"}, status=500)


class AdminBannedAccountsView(APIView):
    """View to see all banned accounts"""
    def get(self, request):
        cached = cache.get('zp:admin_banned_list')
        if cached is not None:
            return Response(cached)

        banned_accounts = BannedAccount.objects.order_by("-banned_at")
        banned_data = []
        
        for banned in banned_accounts:
            banned_data.append({
                "id": str(banned.id),
                "original_user_id": banned.original_user_id,
                "email": banned.email,
                "name": banned.name,
                "reason": banned.reason,
                "banned_by": banned.banned_by,
                "banned_at": banned.banned_at,
                "ip_addresses": banned.ip_addresses,
                "device_fingerprints_count": len(banned.device_fingerprints),
                "prevention_summary": f"Prevents registration for {len(banned.ip_addresses)} IPs and {len(banned.device_fingerprints)} devices"
            })
        
        cache.set('zp:admin_banned_list', banned_data, _ADMIN_LIST_TTL)
        return Response(banned_data)


class AdminBlogsView(APIView):
    def get(self, request):
        # Get query params for filtering
        status_filter = request.GET.get('status', 'all')  # all, published, draft
        search = request.GET.get('search', '')
        limit = int(request.GET.get('limit', 30))  # Reduced default from 50 to 30

        # Cache only default (no search) requests
        # v2 suffix busts any old cache that lacked full_content / co_authors
        cache_key = f'zp:admin_blogs_v3_{status_filter}_{limit}' if not search else None
        if cache_key:
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)
        query = {}
        if status_filter == 'published':
            query['is_draft'] = False
            query['is_published'] = True
        elif status_filter == 'draft':
            query['is_draft'] = True
        
        # Apply search if provided
        if search:
            from mongoengine.queryset.visitor import Q
            blogs = Blog.objects(Q(**query) & (Q(title__icontains=search) | Q(tags__icontains=search))).order_by("-created_at").limit(limit)
        else:
            blogs = Blog.objects(**query).order_by("-created_at").limit(limit)
        
        # Batch get blog IDs for counts
        blog_ids = [blog.id for blog in blogs]
        
        # Pre-compute counts using batch queries (much faster than N+1)
        comment_counts = {}
        upvote_counts = {}
        downvote_counts = {}
        
        if blog_ids:
            # Use $in operator for batch queries instead of individual counts
            from mongoengine.queryset.visitor import Q
            
            # Batch count comments
            comment_pipeline = BlogComment.objects(
                Q(blog__in=blog_ids) & Q(is_deleted=False)
            ).aggregate([
                {'$group': {'_id': '$blog', 'count': {'$sum': 1}}}
            ])
            for doc in comment_pipeline:
                comment_counts[str(doc['_id'])] = doc['count']
            
            # Batch count upvotes
            upvote_pipeline = BlogVote.objects(
                Q(blog__in=blog_ids) & Q(vote_type='upvote')
            ).aggregate([
                {'$group': {'_id': '$blog', 'count': {'$sum': 1}}}
            ])
            for doc in upvote_pipeline:
                upvote_counts[str(doc['_id'])] = doc['count']
            
            # Batch count downvotes
            downvote_pipeline = BlogVote.objects(
                Q(blog__in=blog_ids) & Q(vote_type='downvote')
            ).aggregate([
                {'$group': {'_id': '$blog', 'count': {'$sum': 1}}}
            ])
            for doc in downvote_pipeline:
                downvote_counts[str(doc['_id'])] = doc['count']
        
        # Pre-fetch all authors to avoid N+1
        author_ids = set()
        for blog in blogs:
            if blog.author:
                author_ids.add(blog.author.id)
        
        authors_map = {}
        if author_ids:
            for author in Account.objects(id__in=list(author_ids)).only('id', 'name', 'email', 'role'):
                authors_map[str(author.id)] = author
        
        blog_data = []
        for blog in blogs:
            bid_str = str(blog.id)
            author_id = str(blog.author.id) if blog.author else None
            author = authors_map.get(author_id) if author_id else None
            
            upvotes = upvote_counts.get(bid_str, 0)
            downvotes = downvote_counts.get(bid_str, 0)
            
            blog_data.append({
                "id": bid_str,
                "title": blog.title,
                "content_preview": blog.content[:200] + "..." if len(blog.content) > 200 else blog.content,
                "full_content": blog.content,
                "tags": blog.tags,
                "co_authors": [
                    {"id": str(ca.id), "name": ca.name, "email": ca.email}
                    for ca in (blog.co_authors or [])
                    if ca
                ],
                "author": {
                    "id": author_id,
                    "name": author.name if author else "Unknown",
                    "email": author.email if author else "Unknown",
                    "role": author.role if author else "Unknown",
                },
                "created_at": blog.created_at,
                "published_at": blog.published_at,
                "is_published": blog.is_published,
                "is_draft": blog.is_draft,
                "comment_count": comment_counts.get(bid_str, 0),
                "upvotes": upvotes,
                "downvotes": downvotes,
                "score": upvotes - downvotes
            })
        
        if cache_key:
            cache.set(cache_key, blog_data, _ADMIN_LIST_TTL)
        return Response(blog_data)

    def delete(self, request, blog_id):
        try:
            blog = Blog.objects.get(id=blog_id)
            # Option to permanently delete or just unpublish
            permanent = request.data.get('permanent', False)
            
            if permanent:
                # Delete all comments
                BlogComment.objects(blog=blog).delete()
                # Delete all votes
                BlogVote.objects(blog=blog).delete()
                # Delete blog
                blog.delete()
                return Response({"message": "Blog permanently deleted with all comments and votes"})
            else:
                # Just unpublish
                blog.is_draft = True
                blog.is_published = False
                blog.save()
                return Response({"message": "Blog unpublished successfully"})
        except Blog.DoesNotExist:
            return Response({"error": "Blog not found"}, status=404)


class AdminContestsView(APIView):
    def get(self, request):
        # Get query params for filtering
        status_filter = request.GET.get('status', 'all')
        search = request.GET.get('search', '')
        limit = int(request.GET.get('limit', 50))
        
        # Cache only unsearched requests (v2 = includes statement/test_cases)
        cache_key = f'zp:admin_contests_v2_{status_filter}_{limit}' if not search else None
        if cache_key:
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)

        # Build query
        query = {}
        if status_filter != 'all':
            query['status'] = status_filter
        
        # Apply search
        if search:
            from mongoengine.queryset.visitor import Q
            contests = Contest.objects(Q(**query) & Q(title__icontains=search)).order_by("-start_time").limit(limit)
        else:
            contests = Contest.objects(**query).order_by("-start_time").limit(limit)
        
        # Collect contest IDs once (materialize queryset)
        contest_list = list(contests)
        contest_ids = [c.id for c in contest_list]
        
        if not contest_ids:
            return Response([])

        # Batch count registrations, submissions, announcements via aggregation
        from contest.models import ContestRegistration

        def _batch_count(qs, group_field):
            """Run a $group aggregation and return {str(id): count} map."""
            result = {}
            pipeline = [{'$group': {'_id': f'${group_field}', 'count': {'$sum': 1}}}]
            for doc in qs.aggregate(pipeline):
                result[str(doc['_id'])] = doc['count']
            return result

        from mongoengine.queryset.visitor import Q as MQ
        registration_counts = _batch_count(
            ContestRegistration.objects(contest__in=contest_ids), 'contest'
        )
        submission_counts = _batch_count(
            Submission.objects(contest__in=contest_ids), 'contest'
        )
        announcement_counts = _batch_count(
            Announcement.objects(contest__in=contest_ids), 'contest'
        )
        
        contest_data = []
        
        for contest in contest_list:
            creator = contest.created_by if contest.created_by else None
            cid_str = str(contest.id)
            
            # Get problem count
            problem_count = len(contest.problems) if contest.problems else 0
            
            # Serialize problems with full data including statement and test cases
            problems_data = []
            if contest.problems:
                for problem in contest.problems:
                    tc_list = []
                    for tc in (problem.test_cases or []):
                        tc_list.append({
                            "input": tc.input,
                            "output": tc.output,
                            "explanation": tc.explanation or "",
                            "sample": tc.sample,
                            "hidden": tc.hidden,
                            "difficulty": tc.difficulty or "",
                        })
                    problems_data.append({
                        "index": problem.index,
                        "title": problem.title,
                        "statement": problem.statement,
                        "difficulty": problem.difficulty if hasattr(problem, 'difficulty') else '',
                        "points": problem.points if hasattr(problem, 'points') else 0,
                        "time_limit_seconds": problem.time_limit_seconds,
                        "memory_limit_mb": problem.memory_limit_mb,
                        "tags": list(problem.tags) if problem.tags else [],
                        "tutorial": problem.tutorial or "",
                        "test_cases": tc_list,
                        "test_case_count": len(tc_list),
                    })
            
            contest_data.append({
                "id": cid_str,
                "title": contest.title,
                "description": contest.description,
                "type": contest.type,
                "platform": contest.platform,
                "status": contest.status,
                "visibility": contest.visibility,
                "created_by": {
                    "id": str(creator.id) if creator else None,
                    "name": creator.name if creator else "Unknown",
                    "email": creator.email if creator else "Unknown"
                },
                "start_time": contest.start_time,
                "duration": contest.duration,
                "test_start_time": contest.test_start_time,
                "registration_required": contest.registration_required,
                "registration_count": registration_counts.get(cid_str, 0),
                "submission_count": submission_counts.get(cid_str, 0),
                "announcement_count": announcement_counts.get(cid_str, 0),
                "problem_count": problem_count,
                "problems": problems_data,
                "testers": contest.testers,
                "editorial_published": contest.editorial_published,
                "require_screen_recording": contest.require_screen_recording,
                "leaderboard_public": contest.leaderboard_public,
                "allow_practice": contest.allow_practice,
                "rating_changes": contest.rating_changes
            })
        
        if cache_key:
            cache.set(cache_key, contest_data, _ADMIN_LIST_TTL)
        return Response(contest_data)
    
    def delete(self, request, contest_id):
        try:
            contest = Contest.objects.get(id=contest_id)
            contest.status = "past"
            contest.save()
            return Response({"message": "Contest deleted successfully"})
        except Contest.DoesNotExist:
            return Response({"error": "Contest not found"}, status=404)


class AdminProblemsView(APIView):
    def get(self, request):
        limit = int(request.GET.get('limit', 100))
        
        # Fetch problems from all contests (flatten contest.problems embedded documents)
        # v2 suffix busts cache that lacked statement/test_cases
        cache_key = f'zp:admin_problems_v2_{limit}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        
        # Do NOT use .only() here — embedded documents need full fetch to include
        # statement, test_cases, tutorial, tags, etc.
        contests = Contest.objects.order_by("-start_time").limit(limit)
        
        problem_data = []
        for contest in contests:
            if not contest.problems:
                continue
            for problem in contest.problems:
                # Serialize test cases fully
                test_cases = []
                for tc in (problem.test_cases or []):
                    test_cases.append({
                        "input": tc.input,
                        "output": tc.output,
                        "explanation": tc.explanation or "",
                        "sample": tc.sample,
                        "hidden": tc.hidden,
                        "difficulty": tc.difficulty or "",
                    })
                
                problem_data.append({
                    "index": problem.index,
                    "title": problem.title,
                    "statement": problem.statement,
                    "difficulty": problem.difficulty or "",
                    "points": problem.points if hasattr(problem, 'points') else 0,
                    "time_limit": problem.time_limit_seconds,
                    "memory_limit": problem.memory_limit_mb,
                    "tags": list(problem.tags) if problem.tags else [],
                    "tutorial": problem.tutorial or "",
                    "test_cases": test_cases,
                    "test_case_count": len(test_cases),
                    "contest_id": str(contest.id),
                    "contest_title": contest.title,
                    "contest_type": contest.type,
                    "contest_status": contest.status,
                })
        
        cache.set(cache_key, problem_data, _ADMIN_LIST_TTL)
        return Response(problem_data)
    
    def delete(self, request, problem_id):
        try:
            problem = Problem.objects.get(id=problem_id)
            # For problems, we'll just mark as inactive by changing title
            problem.title = f"[DELETED] {problem.title}"
            problem.save()
            return Response({"message": "Problem deleted successfully"})
        except Problem.DoesNotExist:
            return Response({"error": "Problem not found"}, status=404)


class AdminSubmissionsView(APIView):
    def get(self, request):
        # Get query params for filtering
        verdict_filter = request.GET.get('verdict', 'all')  # all, AC, WA, TLE, etc.
        language_filter = request.GET.get('language', 'all')
        search_user = request.GET.get('user', '')
        limit = int(request.GET.get('limit', 50))  # Reduced default from 100 to 50
        
        # Build query
        query = {}
        if verdict_filter != 'all':
            query['verdict'] = verdict_filter
        if language_filter != 'all':
            query['language'] = language_filter
        
        # Apply user search
        if search_user:
            from mongoengine.queryset.visitor import Q
            users = Account.objects(Q(name__icontains=search_user) | Q(email__icontains=search_user)).only('id')
            user_ids = [user.id for user in users]
            if user_ids:
                query['user__in'] = user_ids
        
        # Use only() to fetch only needed fields - reduces data transfer
        submissions = Submission.objects(**query).only(
            'id', 'user', 'contest', 'problem_index', 'problem_code', 'problem_title',
            'language', 'verdict', 'execution_time', 'memory', 'passed_test_cases',
            'total_test_cases', 'failed_test_case', 'code', 'error_message',
            'compile_output', 'submitted_at', 'judged_at', 'contest_time'
        ).order_by("-submitted_at").limit(limit)
        
        # Pre-fetch all user and contest data to avoid N+1 queries
        user_ids = set()
        contest_ids = set()
        for sub in submissions:
            if sub.user:
                user_ids.add(sub.user.id)
            if sub.contest:
                contest_ids.add(sub.contest.id)
        
        # Batch fetch users and contests
        users_map = {}
        contests_map = {}
        
        if user_ids:
            for user in Account.objects(id__in=list(user_ids)).only('id', 'name', 'email', 'rating', 'badge'):
                users_map[str(user.id)] = user
        
        if contest_ids:
            for contest in Contest.objects(id__in=list(contest_ids)).only('id', 'title', 'type'):
                contests_map[str(contest.id)] = contest
        
        submission_data = []
        for submission in submissions:
            user_id = str(submission.user.id) if submission.user else None
            contest_id = str(submission.contest.id) if submission.contest else None
            
            user = users_map.get(user_id) if user_id else None
            contest = contests_map.get(contest_id) if contest_id else None
            
            submission_data.append({
                "id": str(submission.id),
                "user": {
                    "id": user_id,
                    "name": user.name if user else "Unknown",
                    "email": user.email if user else "Unknown",
                    "rating": getattr(user, 'rating', 0) if user else 0,
                    "badge": getattr(user, 'badge', 'none') if user else 'none'
                },
                "contest": {
                    "id": contest_id,
                    "title": contest.title if contest else "Unknown",
                    "type": contest.type if contest else None
                },
                "problem_index": submission.problem_index,
                "problem_code": submission.problem_code,
                "problem_title": submission.problem_title if submission.problem_title else "Unknown",
                "language": submission.language,
                "verdict": submission.verdict,
                "execution_time": submission.execution_time,
                "memory": submission.memory,
                "passed_test_cases": submission.passed_test_cases,
                "total_test_cases": submission.total_test_cases,
                "failed_test_case": submission.failed_test_case,
                "code_preview": submission.code[:150] + "..." if len(submission.code) > 150 else submission.code,
                "full_code": submission.code,
                "error_message": submission.error_message,
                "compile_output": submission.compile_output,
                "submitted_at": submission.submitted_at,
                "judged_at": submission.judged_at,
                "contest_time": submission.contest_time
            })
        
        # Use estimated count for large collections to avoid slow count()
        total_count = len(submission_data) if len(submission_data) < limit else limit + 1
        
        return Response({
            "submissions": submission_data,
            "total": total_count,
            "showing": len(submission_data)
        })
    
    def delete(self, request, submission_id):
        try:
            submission = Submission.objects.get(id=submission_id)
            permanent = request.data.get('permanent', False)
            
            if permanent:
                submission.delete()
                return Response({"message": "Submission permanently deleted"})
            else:
                submission.verdict = "DELETED"
                submission.save()
                return Response({"message": "Submission marked as deleted"})
        except Submission.DoesNotExist:
            return Response({"error": "Submission not found"}, status=404)


class AdminAnnouncementsView(APIView):
    """Admin view for managing all announcements"""
    def get(self, request):
        # Get query params
        contest_id = request.GET.get('contest_id', '')
        is_important = request.GET.get('important', '')
        
        # Build query
        query = {}
        if contest_id:
            try:
                contest = Contest.objects.get(id=contest_id)
                query['contest'] = contest
            except Contest.DoesNotExist:
                pass
        
        if is_important == 'true':
            query['is_important'] = True
        
        announcements = Announcement.objects(**query).order_by("-created_at")
        announcement_data = []
        
        for announcement in announcements:
            contest = announcement.contest if announcement.contest else None
            author = announcement.author if announcement.author else None
            
            announcement_data.append({
                "id": str(announcement.id),
                "contest_id": str(contest.id) if contest else None,
                "contest_title": contest.title if contest else None,
                "contest_type": contest.type if contest else None,
                "author": author.name if author else "Unknown",
                "text": announcement.text,
                "topic": announcement.topic if hasattr(announcement, 'topic') and announcement.topic else None,
                "problem_index": announcement.problem_index,
                "is_important": announcement.is_important,
                "is_pinned": announcement.is_pinned,
                "type": announcement.type,
                "created_at": announcement.created_at,
                "updated_at": announcement.updated_at if hasattr(announcement, 'updated_at') else None
            })
        
        return Response(announcement_data)
    
    def delete(self, request, announcement_id):
        try:
            announcement = Announcement.objects.get(id=announcement_id)
            announcement.delete()
            return Response({"message": "Announcement deleted successfully"})
        except Announcement.DoesNotExist:
            return Response({"error": "Announcement not found"}, status=404)


class AdminTutorialsView(APIView):
    """Admin view for managing all tutorials"""
    def get(self, request):
        contest_id = request.GET.get('contest_id', '')
        
        # Build query
        query = {}
        if contest_id:
            try:
                contest = Contest.objects.get(id=contest_id)
                query['contest'] = contest
            except Contest.DoesNotExist:
                pass
        
        tutorials = Tutorial.objects(**query).order_by("-created_at")
        tutorial_data = []
        
        for tutorial in tutorials:
            contest = tutorial.contest if tutorial.contest else None
            creator = tutorial.created_by if tutorial.created_by else None
            
            tutorial_data.append({
                "id": str(tutorial.id),
                "contest": {
                    "id": str(contest.id) if contest else None,
                    "title": contest.title if contest else "Unknown"
                },
                "problem_index": tutorial.problem_index,
                "content_preview": tutorial.content[:200] + "..." if len(tutorial.content) > 200 else tutorial.content,
                "full_content": tutorial.content,
                "created_by": {
                    "id": str(creator.id) if creator else None,
                    "name": creator.name if creator else "Unknown",
                    "email": creator.email if creator else "Unknown"
                },
                "created_at": tutorial.created_at,
                "updated_at": tutorial.updated_at,
                "version": tutorial.version
            })
        
        return Response(tutorial_data)
    
    def delete(self, request, tutorial_id):
        try:
            tutorial = Tutorial.objects.get(id=tutorial_id)
            tutorial.delete()
            return Response({"message": "Tutorial deleted successfully"})
        except Tutorial.DoesNotExist:
            return Response({"error": "Tutorial not found"}, status=404)


class AdminTestContestsView(APIView):
    """Admin view for managing test contests"""
    def get(self, request):
        test_contests = TestContest.objects.order_by("-created_at")
        test_contest_data = []
        
        for tc in test_contests:
            original_contest = tc.original_contest if tc.original_contest else None
            creator = tc.created_by if tc.created_by else None
            
            # Get submission count
            tc_submission_count = TestContestSubmission.objects(test_contest=tc).count()
            
            test_contest_data.append({
                "id": str(tc.id),
                "title": tc.title,
                "original_contest": {
                    "id": str(original_contest.id) if original_contest else None,
                    "title": original_contest.title if original_contest else "Unknown"
                },
                "status": tc.status,
                "test_start_time": tc.test_start_time,
                "duration": tc.duration,
                "testers": tc.testers,
                "tester_count": len(tc.testers) if tc.testers else 0,
                "submission_count": tc_submission_count,
                "problem_count": len(tc.problems) if tc.problems else 0,
                "created_by": {
                    "id": str(creator.id) if creator else None,
                    "name": creator.name if creator else "Unknown"
                },
                "created_at": tc.created_at
            })
        
        return Response(test_contest_data)
    
    def delete(self, request, test_contest_id):
        try:
            test_contest = TestContest.objects.get(id=test_contest_id)
            # Delete all submissions
            TestContestSubmission.objects(test_contest=test_contest).delete()
            # Delete test contest
            test_contest.delete()
            return Response({"message": "Test contest and all submissions deleted successfully"})
        except TestContest.DoesNotExist:
            return Response({"error": "Test contest not found"}, status=404)


class AdminVirtualContestsView(APIView):
    """Admin view for managing virtual contests"""
    def get(self, request):
        virtual_contests = VirtualContest.objects.order_by("-virtual_start_time")
        virtual_contest_data = []
        
        for vc in virtual_contests:
            original_contest = vc.contest if vc.contest else None
            user = vc.user if vc.user else None
            
            # Get submission count
            vc_submission_count = VirtualContestSubmission.objects(virtual_contest=vc).count()
            
            virtual_contest_data.append({
                "id": str(vc.id),
                "user": {
                    "id": str(user.id) if user else None,
                    "name": user.name if user else "Unknown",
                    "email": user.email if user else "Unknown"
                },
                "contest": {
                    "id": str(original_contest.id) if original_contest else None,
                    "title": original_contest.title if original_contest else "Unknown"
                },
                "virtual_start_time": vc.virtual_start_time,
                "virtual_end_time": vc.virtual_end_time,
                "status": vc.status,
                "submission_count": vc_submission_count,
                "completed_at": vc.completed_at if hasattr(vc, 'completed_at') else None
            })
        
        return Response(virtual_contest_data)
    
    def delete(self, request, virtual_contest_id):
        try:
            virtual_contest = VirtualContest.objects.get(id=virtual_contest_id)
            # Delete all submissions
            VirtualContestSubmission.objects(virtual_contest=virtual_contest).delete()
            # Delete virtual contest
            virtual_contest.delete()
            return Response({"message": "Virtual contest and all submissions deleted successfully"})
        except VirtualContest.DoesNotExist:
            return Response({"error": "Virtual contest not found"}, status=404)


class AdminBlogCommentsView(APIView):
    """Admin view for managing blog comments"""
    def get(self, request):
        blog_id = request.GET.get('blog_id', '')
        include_deleted = request.GET.get('include_deleted', 'false')
        
        # Build query
        query = {}
        if blog_id:
            try:
                blog = Blog.objects.get(id=blog_id)
                query['blog'] = blog
            except Blog.DoesNotExist:
                pass
        
        if include_deleted != 'true':
            query['is_deleted'] = False
        
        comments = BlogComment.objects(**query).order_by("-created_at")
        comment_data = []
        
        for comment in comments:
            blog = comment.blog if comment.blog else None
            author = comment.author if comment.author else None
            
            # Get vote counts
            upvote_count = BlogCommentVote.objects(comment=comment, vote_type='upvote').count()
            downvote_count = BlogCommentVote.objects(comment=comment, vote_type='downvote').count()
            
            comment_data.append({
                "id": str(comment.id),
                "blog": {
                    "id": str(blog.id) if blog else None,
                    "title": blog.title if blog else "Unknown"
                },
                "author": {
                    "id": str(author.id) if author else None,
                    "name": author.name if author else "Unknown",
                    "email": author.email if author else "Unknown"
                },
                "content": comment.content,
                "parent_comment_id": str(comment.parent_comment.id) if comment.parent_comment else None,
                "reply_count": len(comment.replies) if comment.replies else 0,
                "is_deleted": comment.is_deleted,
                "created_at": comment.created_at,
                "updated_at": comment.updated_at,
                "upvotes": upvote_count,
                "downvotes": downvote_count,
                "score": upvote_count - downvote_count
            })
        
        return Response(comment_data)
    
    def delete(self, request, comment_id):
        try:
            comment = BlogComment.objects.get(id=comment_id)
            permanent = request.data.get('permanent', False)
            
            if permanent:
                # Delete all votes for this comment
                BlogCommentVote.objects(comment=comment).delete()
                # Delete all replies
                for reply in comment.replies:
                    BlogCommentVote.objects(comment=reply).delete()
                    reply.delete()
                # Delete comment
                comment.delete()
                return Response({"message": "Comment permanently deleted with all votes and replies"})
            else:
                # Soft delete
                comment.is_deleted = True
                comment.save()
                return Response({"message": "Comment marked as deleted"})
        except BlogComment.DoesNotExist:
            return Response({"error": "Comment not found"}, status=404)