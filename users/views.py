from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from .models import User


class GoogleLoginView(APIView):
    def post(self, request):
        token = request.data.get("id_token")

        if not token:
            return Response({"error": "No token provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify token
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            email = idinfo.get("email")
            name = idinfo.get("name")
            google_id = idinfo.get("sub")

            # Get or create user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "role": "promoter",
                    "google_id": google_id,
                    "first_name": name
                }
            )

            # Generate JWT
            refresh = RefreshToken.for_user(user)

            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "role": user.role
            })

        except ValueError:
            return Response({"error": "Invalid Google token"}, status=status.HTTP_400_BAD_REQUEST)

from rest_framework.permissions import IsAuthenticated


class TestProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "message": "You are authenticated!",
            "user": request.user.email,
            "role": request.user.role
        })