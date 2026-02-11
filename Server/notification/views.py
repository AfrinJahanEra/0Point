from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Notification
from account.models import Account
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

@api_view(['GET'])
def get_user_notifications(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        notifications = Notification.objects(user=user).order_by('-created_at')
        notifications_data = [notification.to_dict() for notification in notifications]
        
        unread_count = Notification.objects(user=user, is_read=False).count()
        
        return Response({
            "notifications": notifications_data,
            "unread_count": unread_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def mark_notification_read(request, notification_id):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        notification = Notification.objects(id=notification_id, user=user).first()
        if not notification:
            return Response({"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)
        
        notification.is_read = True
        notification.save()
        
        return Response({
            "message": "Notification marked as read",
            "notification": notification.to_dict()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def mark_all_notifications_read(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        notifications = Notification.objects(user=user, is_read=False)
        for notification in notifications:
            notification.is_read = True
            notification.save()
        
        return Response({
            "message": f"Marked {notifications.count()} notifications as read"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def delete_notification(request, notification_id):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        notification = Notification.objects(id=notification_id, user=user).first()
        if not notification:
            return Response({"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)
        
        notification.delete()
        
        return Response({
            "message": "Notification deleted"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

