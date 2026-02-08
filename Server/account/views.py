from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import jwt

from .models import Account
from .serializers import SignupSerializer, LoginSerializer
from admin.secret import ADMIN_SECRET_PASSWORD


class SignupView(APIView):
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():

            # Duplicate email check
            if Account.objects(email=serializer.validated_data["email"], is_deleted=False).first():
                return Response({"error": "Email already exists"}, status=400)

            role = serializer.validated_data.get("role", "user")
            
            # If role is admin, validate secret password
            if role == "admin":
                secret_password = request.data.get("secret_password")
                if secret_password != ADMIN_SECRET_PASSWORD:
                    return Response({"error": "Invalid admin secret password"}, status=400)
            
            user = Account(
                name=serializer.validated_data["name"],
                email=serializer.validated_data["email"],
                role=role,
                year=serializer.validated_data.get("year"),
                department=serializer.validated_data.get("department"),
            )
            user.set_password(serializer.validated_data["password"])
            user.save()

            return Response({"message": "Account created successfully"}, status=201)

        return Response(serializer.errors, status=400)

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
