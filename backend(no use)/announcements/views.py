from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdminUserRole
from .models import Announcement
from .serializers import AnnouncementSerializer
from django.contrib.admin.models import ADDITION, CHANGE, DELETION
from core.utils import log_admin_action

class AnnouncementCreateView(generics.CreateAPIView):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAdminUserRole]

    def perform_create(self, serializer):
        announcement = serializer.save()
        
        # Log the action
        log_admin_action(
            user=self.request.user,
            content_object=announcement,
            action_flag=ADDITION,
            change_message=f"Created announcement: {announcement.title}"
        )
        
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

    def perform_update(self, serializer):
        announcement = serializer.save()
        log_admin_action(
            user=self.request.user,
            content_object=announcement,
            action_flag=CHANGE,
            change_message=f"Updated announcement: {announcement.title}"
        )

    def perform_destroy(self, instance):
        title = instance.title
        log_admin_action(
            user=self.request.user,
            content_object=instance,
            action_flag=DELETION,
            change_message=f"Deleted announcement: {title}"
        )
        instance.delete()
