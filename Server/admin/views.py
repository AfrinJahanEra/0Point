from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import jwt

from .secret import ADMIN_SECRET_PASSWORD
from account.models import Account
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
        blog_count = Blog.objects(is_draft=False).count()
        contest_count = Contest.objects.count()
        problem_count = Problem.objects.count()
        submission_count = Submission.objects.count()
        
        return Response({
            "stats": {
                "users": user_count,
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
            user_data.append({
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at,
                "is_inactive": user.is_inactive,
                "blog_count": user.blog_count,
                "rating": user.rating,
                "badge": user.badge
            })
        
        return Response(user_data)
    
    def delete(self, request, user_id):
        try:
            user = Account.objects.get(id=user_id)
            user.is_deleted = True
            user.save()
            return Response({"message": "User deleted successfully"})
        except Account.DoesNotExist:
            return Response({"error": "User not found"}, status=404)


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
            creator = Account.objects.get(id=contest.created_by) if contest.created_by else None
            contest_data.append({
                "id": str(contest.id),
                "title": contest.title,
                "type": contest.type,
                "created_by": creator.name if creator else "Unknown",
                "created_at": contest.created_at,
                "start_time": contest.start_time,
                "duration_minutes": contest.duration_minutes,
                "participants": contest.participants
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
            user = Account.objects.get(id=submission.user_id) if submission.user_id else None
            problem = Problem.objects.get(id=submission.problem_id) if submission.problem_id else None
            
            submission_data.append({
                "id": str(submission.id),
                "user": user.name if user else "Unknown",
                "problem": problem.title if problem else "Unknown",
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
