# apps/contest/utils/auth.py
import jwt
from django.conf import settings
from account.models import Account

def get_user_from_request(request):
    """
    Lightweight helper to extract user from Authorization header 'Bearer <token>'.
    Returns Account document or None.
    Works with the JWT token your accounts.login endpoint issues (payload with user_id).
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
    # user_id may be string of ObjectId; Account.objects(id=user_id) works
    user = Account.objects(id=user_id, is_deleted=False).first()
    return user
