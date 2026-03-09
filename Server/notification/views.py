from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Notification
from account.models import Account
import jwt
from django.conf import settings
from django.core.cache import cache

NOTIF_CACHE_TTL = 20  # seconds

def _notif_cache_key(user_id):
    return f'notif_list_{user_id}'

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

    cache_key = _notif_cache_key(str(user.id))
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached, status=status.HTTP_200_OK)

    try:
        notifications = list(
            Notification.objects(user=user)
            .order_by('-created_at')
            .limit(50)
        )
        notifications_data = [n.to_dict() for n in notifications]
        unread_count = sum(1 for n in notifications if not n.is_read)

        payload = {
            "notifications": notifications_data,
            "unread_count": unread_count,
        }
        cache.set(cache_key, payload, NOTIF_CACHE_TTL)
        return Response(payload, status=status.HTTP_200_OK)

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
        cache.delete(_notif_cache_key(str(user.id)))
        
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
        updated = Notification.objects(user=user, is_read=False).update(set__is_read=True)
        cache.delete(_notif_cache_key(str(user.id)))
        
        return Response({
            "message": f"Marked {updated} notifications as read"
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
        cache.delete(_notif_cache_key(str(user.id)))
        
        return Response({
            "message": "Notification deleted"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

