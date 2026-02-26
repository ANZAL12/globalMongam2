from rest_framework import serializers
from .models import Announcement

from django.contrib.auth import get_user_model

User = get_user_model()

class AnnouncementSerializer(serializers.ModelSerializer):
    target_promoters = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.filter(role='promoter'), required=False)
    target_promoter_emails = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'description', 'image', 'target_promoters', 'target_promoter_emails', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_target_promoter_emails(self, obj):
        return [user.email for user in obj.target_promoters.all()]
