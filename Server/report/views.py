from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import BlogReport
from .serializers import BlogReportSerializer, ReviewReportSerializer
from blog.models import Blog
from notification.models import Notification
from account.models import Account
from utils.cache_keys import invalidate_admin_reports
from datetime import datetime
import jwt
from django.conf import settings

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
def create_blog_report(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        serializer = BlogReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        blog_id = serializer.validated_data['blog_id']
        reason = serializer.validated_data['reason']
        
        blog = Blog.objects(id=blog_id).first()
        if not blog:
            return Response({"error": "Blog not found"}, status=status.HTTP_404_NOT_FOUND)
        
        existing_report = BlogReport.objects(blog=blog, reporter=user, status='pending').first()
        if existing_report:
            return Response({"error": "You have already reported this blog"}, status=status.HTTP_400_BAD_REQUEST)
        
        report = BlogReport(
            blog=blog,
            reporter=user,
            reason=reason
        )
        report.save()
        
        # Invalidate admin reports cache for real-time update
        invalidate_admin_reports()
        
        return Response({
            "message": "Blog reported successfully",
            "report": report.to_dict()
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_pending_reports(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if user.role != 'admin':
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        reports = BlogReport.objects(status='pending').order_by('-created_at')
        reports_data = [report.to_dict() for report in reports]
        
        return Response(reports_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_all_reports(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if user.role != 'admin':
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Use MongoDB aggregation for fast bulk fetch with lookups
        pipeline = [
            {"$sort": {"created_at": -1}},
            {"$limit": 200},  # Limit to recent 200 reports for performance
            # Lookup blog data
            {"$lookup": {
                "from": "blogs",
                "localField": "blog",
                "foreignField": "_id",
                "as": "blog_data"
            }},
            # Lookup reporter data
            {"$lookup": {
                "from": "accounts",
                "localField": "reporter",
                "foreignField": "_id",
                "as": "reporter_data"
            }},
            # Lookup reviewed_by data
            {"$lookup": {
                "from": "accounts",
                "localField": "reviewed_by",
                "foreignField": "_id",
                "as": "reviewed_by_data"
            }},
            # Lookup blog author (nested lookup)
            {"$lookup": {
                "from": "accounts",
                "let": {"blog_author": {"$arrayElemAt": ["$blog_data.author", 0]}},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": ["$_id", "$$blog_author"]}}}
                ],
                "as": "blog_author_data"
            }},
            # Project final shape
            {"$project": {
                "id": {"$toString": "$_id"},
                "reason": 1,
                "status": 1,
                "admin_note": 1,
                "created_at": 1,
                "updated_at": 1,
                "reviewed_at": 1,
                "blog": {
                    "$cond": {
                        "if": {"$gt": [{"$size": "$blog_data"}, 0]},
                        "then": {
                            "id": {"$toString": {"$arrayElemAt": ["$blog_data._id", 0]}},
                            "title": {"$arrayElemAt": ["$blog_data.title", 0]},
                            "author": {
                                "$cond": {
                                    "if": {"$gt": [{"$size": "$blog_author_data"}, 0]},
                                    "then": {
                                        "id": {"$toString": {"$arrayElemAt": ["$blog_author_data._id", 0]}},
                                        "name": {"$arrayElemAt": ["$blog_author_data.name", 0]},
                                        "email": {"$arrayElemAt": ["$blog_author_data.email", 0]}
                                    },
                                    "else": None
                                }
                            }
                        },
                        "else": {
                            "id": "unknown",
                            "title": "[Deleted Blog]",
                            "author": None
                        }
                    }
                },
                "reporter": {
                    "$cond": {
                        "if": {"$gt": [{"$size": "$reporter_data"}, 0]},
                        "then": {
                            "id": {"$toString": {"$arrayElemAt": ["$reporter_data._id", 0]}},
                            "name": {"$arrayElemAt": ["$reporter_data.name", 0]},
                            "email": {"$arrayElemAt": ["$reporter_data.email", 0]}
                        },
                        "else": None
                    }
                },
                "reviewed_by": {
                    "$cond": {
                        "if": {"$gt": [{"$size": "$reviewed_by_data"}, 0]},
                        "then": {
                            "id": {"$toString": {"$arrayElemAt": ["$reviewed_by_data._id", 0]}},
                            "name": {"$arrayElemAt": ["$reviewed_by_data.name", 0]}
                        },
                        "else": None
                    }
                }
            }}
        ]
        
        # Execute aggregation
        reports_data = list(BlogReport.objects.aggregate(pipeline))
        
        # Format dates
        for report in reports_data:
            report['_id'] = report.pop('id', str(report.get('_id', '')))
            report['id'] = report['_id']
            if report.get('created_at'):
                report['created_at'] = report['created_at'].isoformat() if hasattr(report['created_at'], 'isoformat') else str(report['created_at'])
            if report.get('updated_at'):
                report['updated_at'] = report['updated_at'].isoformat() if hasattr(report['updated_at'], 'isoformat') else str(report['updated_at'])
            if report.get('reviewed_at'):
                report['reviewed_at'] = report['reviewed_at'].isoformat() if hasattr(report['reviewed_at'], 'isoformat') else str(report['reviewed_at'])
        
        return Response(reports_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error in get_all_reports: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def review_report(request, report_id):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if user.role != 'admin':
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        serializer = ReviewReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        report = BlogReport.objects(id=report_id).first()
        if not report:
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)
        
        action = serializer.validated_data['action']
        admin_note = serializer.validated_data.get('admin_note', '')
        
        report.status = 'approved' if action == 'approve' else 'rejected'
        report.reviewed_by = user
        report.reviewed_at = datetime.utcnow()
        report.admin_note = admin_note
        report.save()
        
        if action == 'approve':
            blog = report.blog
            if blog:
                blog_author = blog.author
                blog_title = blog.title
                blog.delete()
                
                Notification(
                    user=blog_author,
                    title="Blog Deleted",
                    message=f"Your blog '{blog_title}' has been deleted due to a report being approved.",
                    type='blog_deleted',
                    related_blog_id=str(report.blog.id),
                    related_report_id=str(report.id)
                ).save()
        
        Notification(
            user=report.reporter,
            title=f"Report {report.status.capitalize()}",
            message=f"Your report has been {report.status}. {admin_note if admin_note else ''}",
            type=f'report_{report.status}',
            related_report_id=str(report.id)
        ).save()
        
        # Invalidate admin reports cache for real-time update
        invalidate_admin_reports()
        
        return Response({
            "message": f"Report {report.status} successfully",
            "report": report.to_dict()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

