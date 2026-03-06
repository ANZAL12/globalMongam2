import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from .models import User
from core.permissions import IsAdminUserRole
from .serializers import CreatePromoterSerializer, PromoterListSerializer, PasswordLoginSerializer, PromoterDetailSerializer
from django.contrib.auth import authenticate
from django.contrib.admin.models import ADDITION, CHANGE, DELETION
from core.utils import log_admin_action


class GoogleLoginView(APIView):
    def post(self, request):
        token = request.data.get("id_token")

        if not token:
            return Response({"error": "No token provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify token
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            email = idinfo.get("email")
            google_id = idinfo.get("sub")

            # Check if user exists
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response(
                    {"error": "User not registered by admin"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Update google_id if missing
            if not user.google_id:
                user.google_id = google_id
                user.save(update_fields=['google_id'])

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


class CreatePromoterView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        serializer = CreatePromoterSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get('email')
            password = serializer.validated_data.get('password')
            shop_name = serializer.validated_data.get('shop_name', '')
            full_name = serializer.validated_data.get('full_name', '')
            phone_number = serializer.validated_data.get('phone_number', '')
            gpay_number = serializer.validated_data.get('gpay_number', '')
            
            user = User.objects.create_user(
                email=email,
                role='promoter',
                shop_name=shop_name,
                full_name=full_name,
                phone_number=phone_number,
                gpay_number=gpay_number,
                is_active=True
            )
            user.set_password(password)
            user.save()
            
            # Log the action
            log_admin_action(
                user=request.user,
                content_object=user,
                action_flag=ADDITION,
                change_message=f"Created promoter: {user.email}"
            )
            
            refresh = RefreshToken.for_user(user)

            return Response({
                "message": "Promoter created successfully",
                "user": {
                    "email": user.email,
                    "role": user.role,
                    "shop_name": user.shop_name
                },
                "refresh": str(refresh),
                "access": str(refresh.access_token)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordLoginView(APIView):
    def post(self, request):
        serializer = PasswordLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.get('email')
        password = serializer.validated_data.get('password')

        user = authenticate(email=email, password=password)

        if not user:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        # Security checks
        if not settings.DEBUG:
            if user.role != 'admin':
                return Response({"error": "Password login not allowed for this role in production"}, status=status.HTTP_403_FORBIDDEN)

        # Generate JWT
        refresh = RefreshToken.for_user(user)

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "role": user.role
        }, status=status.HTTP_200_OK)

from rest_framework import generics
from django.contrib.admin.models import LogEntry
from .serializers import PromoterListSerializer, AdminLogEntrySerializer

class PromoterListView(generics.ListAPIView):
    serializer_class = PromoterListSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        return User.objects.filter(role='promoter').order_by('-date_joined')

class PromoterDetailView(generics.RetrieveAPIView):
    serializer_class = PromoterDetailSerializer
    permission_classes = [IsAdminUserRole]
    queryset = User.objects.filter(role='promoter')

class UpdatePushTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('expo_push_token')
        if token is None:
            return Response({"error": "No token provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        request.user.expo_push_token = token
        request.user.save(update_fields=['expo_push_token'])
        return Response({"message": "Push token updated successfully"}, status=status.HTTP_200_OK)

class AdminLogListView(generics.ListAPIView):
    serializer_class = AdminLogEntrySerializer
    permission_classes = [IsAdminUserRole]
    queryset = LogEntry.objects.all().order_by('-action_time')

