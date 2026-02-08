from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import jwt
import hashlib
from datetime import datetime  # Add this import

from .secret import ADMIN_SECRET_PASSWORD
from account.models import Account, BannedAccount, IPAddress, DeviceFingerprint
from contest.models import Contest
from blog.models import Blog
from problem.models import Problem
from submission.models import Submission


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
        # Get counts for dashboard
        user_count = Account.objects(is_deleted=False).count()
        banned_count = BannedAccount.objects.count()
        blog_count = Blog.objects(is_draft=False).count()
        contest_count = Contest.objects.count()
        problem_count = Problem.objects.count()
        submission_count = Submission.objects.count()
        
        return Response({
            "stats": {
                "users": user_count,
                "banned_users": banned_count,
                "blogs": blog_count,
                "contests": contest_count,
                "problems": problem_count,
                "submissions": submission_count
            }
        })


class AdminUsersView(APIView):
    def get(self, request):
        users = Account.objects(is_deleted=False).order_by("-created_at")
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
            user.delete()  # This permanently removes from MongoDB
            
            return Response({
                "message": "User permanently banned and deleted",
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
        
        return Response(banned_data)


class AdminBlogsView(APIView):
    def get(self, request):
        blogs = Blog.objects(is_draft=False).order_by("-created_at")
        blog_data = []
        
        for blog in blogs:
            author = blog.author if blog.author else None
            blog_data.append({
                "id": str(blog.id),
                "title": blog.title,
                "author": author.name if author else "Unknown",
                "author_email": author.email if author else "Unknown",
                "created_at": blog.created_at,
                "is_published": blog.is_published,
                "is_draft": blog.is_draft
            })
        
        return Response(blog_data)
    
    def delete(self, request, blog_id):
        try:
            blog = Blog.objects.get(id=blog_id)
            blog.is_draft = True
            blog.is_published = False
            blog.save()
            return Response({"message": "Blog deleted successfully"})
        except Blog.DoesNotExist:
            return Response({"error": "Blog not found"}, status=404)


class AdminContestsView(APIView):
    def get(self, request):
        contests = Contest.objects.order_by("-start_time")
        contest_data = []
        
        for contest in contests:
            creator = contest.created_by if contest.created_by else None
            contest_data.append({
                "id": str(contest.id),
                "title": contest.title,
                "type": contest.type,
                "created_by": creator.name if creator else "Unknown",
                "start_time": contest.start_time,
                "duration": contest.duration,
                "status": contest.status
            })
        
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
        problems = Problem.objects.order_by("-created_at")
        problem_data = []
        
        for problem in problems:
            problem_data.append({
                "id": str(problem.id),
                "title": problem.title,
                "difficulty": problem.difficulty,
                "created_at": problem.created_at,
                "time_limit": problem.time_limit,
                "memory_limit": problem.memory_limit
            })
        
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
        submissions = Submission.objects.order_by("-submitted_at")
        submission_data = []
        
        for submission in submissions:
            user = submission.user if submission.user else None
            
            submission_data.append({
                "id": str(submission.id),
                "user": user.name if user else "Unknown",
                "problem": submission.problem_title if submission.problem_title else "Unknown",
                "language": submission.language,
                "status": submission.verdict,
                "submitted_at": submission.submitted_at
            })
        
        return Response(submission_data)
    
    def delete(self, request, submission_id):
        try:
            submission = Submission.objects.get(id=submission_id)
            submission.verdict = "DELETED"
            submission.save()
            return Response({"message": "Submission deleted successfully"})
        except Submission.DoesNotExist:
            return Response({"error": "Submission not found"}, status=404)