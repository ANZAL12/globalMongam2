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
        
        # Notify promoters
        from users.models import User
        from core.notifications import send_push_message
        
        targets = announcement.target_promoters.all()
        if targets.exists():
            # Notify only the targeted promoters
            promoters = [p for p in targets if p.expo_push_token]
        else:
            # Notify all promoters
            promoters = User.objects.filter(role='promoter', expo_push_token__isnull=False).exclude(expo_push_token='')
            
        for promoter in promoters:
            send_push_message(
                token=promoter.expo_push_token,
                title="New Announcement 📢",
                message=announcement.title,
                extra={"announcement_id": announcement.id}
            )

class AnnouncementListView(generics.ListAPIView):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Announcement.objects.all().order_by('-created_at')
        if getattr(user, 'role', None) == 'promoter':
            from django.db.models import Q
            queryset = queryset.filter(Q(target_promoters__isnull=True) | Q(target_promoters=user)).distinct()
        return queryset

class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAdminUserRole]
