from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdminUserRole
from .models import Announcement
from .serializers import AnnouncementSerializer

class AnnouncementCreateView(generics.CreateAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAdminUserRole]

    def perform_create(self, serializer):
        announcement = serializer.save()
        
        # Notify all promoters
        from users.models import User
        from core.notifications import send_push_message
        
        promoters = User.objects.filter(role='promoter', expo_push_token__isnull=False).exclude(expo_push_token='')
        for promoter in promoters:
            send_push_message(
                token=promoter.expo_push_token,
                title="New Announcement 📢",
                message=announcement.title,
                extra={"announcement_id": announcement.id}
            )

class AnnouncementListView(generics.ListAPIView):
    queryset = Announcement.objects.all().order_by('-created_at')
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]
