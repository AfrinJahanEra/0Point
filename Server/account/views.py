from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import jwt
import hashlib
from datetime import datetime  # Add this import

from .models import Account, BannedAccount, IPAddress, DeviceFingerprint
from .serializers import SignupSerializer, LoginSerializer
from admin.secret import ADMIN_SECRET_PASSWORD


class SignupView(APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            
            # Check if email is already registered and not deleted
            if Account.objects(email=email, is_deleted=False).first():
                return Response({"error": "Email already exists"}, status=400)
            
            # Check if email is in banned accounts
            banned_account = BannedAccount.objects(email=email).first()
            if banned_account:
                return Response({"error": "This email is banned from registration"}, status=403)
            
            # Get IP address from request
            ip_address = self.get_client_ip(request)
            
            # Check if IP address is banned
            banned_by_ip = BannedAccount.objects(ip_addresses__in=[ip_address]).first()
            if banned_by_ip:
                return Response({"error": "Your network/IP is banned from registration"}, status=403)
            
            # Get device fingerprint
            device_fingerprint = self.generate_device_fingerprint(request)
            
            # Check if device is banned
            banned_by_device = BannedAccount.objects(device_fingerprints__in=[device_fingerprint]).first()
            if banned_by_device:
                return Response({"error": "This device is banned from registration"}, status=403)
            
            role = serializer.validated_data.get("role", "user")
            
            # If role is admin, validate secret password
            if role == "admin":
                secret_password = request.data.get("secret_password")
                if secret_password != ADMIN_SECRET_PASSWORD:
                    return Response({"error": "Invalid admin secret password"}, status=400)
            
            # Create IP address object
            ip_obj = IPAddress(
                address=ip_address,
                last_used=datetime.utcnow()
            )
            
            # Create device fingerprint object
            device_obj = DeviceFingerprint(
                fingerprint=device_fingerprint,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                last_used=datetime.utcnow()
            )
            
            user = Account(
                name=serializer.validated_data["name"],
                email=email,
                role=role,
                year=serializer.validated_data.get("year"),
                department=serializer.validated_data.get("department"),
                ip_addresses=[ip_obj],  # Store as IPAddress object
                device_fingerprints=[device_obj]  # Store as DeviceFingerprint object
            )
            user.set_password(serializer.validated_data["password"])
            user.save()

            return Response({"message": "Account created successfully"}, status=201)

        return Response(serializer.errors, status=400)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def generate_device_fingerprint(self, request):
        """Generate a simple device fingerprint"""
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
        accept_encoding = request.META.get('HTTP_ACCEPT_ENCODING', '')
        
        # Create a fingerprint string
        fingerprint_string = f"{user_agent}:{accept_language}:{accept_encoding}"
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()


class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = Account.objects(email=email, is_deleted=False).first()

        if not user:
            return Response({"error": "Invalid email or password"}, status=400)

        if not user.check_password(password):
            return Response({"error": "Invalid email or password"}, status=400)

        payload = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role,
        }

        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        return Response({"token": token, "user": payload})