from rest_framework import serializers
from .models import User
import json
from django.contrib.admin.models import LogEntry

class CreatePromoterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    shop_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    full_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    gpay_number = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists.")
        return value

class PasswordLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class PromoterListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'shop_name', 'full_name', 'phone_number', 'gpay_number', 'is_active', 'date_joined']

class PromoterDetailSerializer(serializers.ModelSerializer):
    sales_history = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'shop_name', 'full_name', 'phone_number', 'gpay_number', 'is_active', 'date_joined', 'sales_history']

    def get_sales_history(self, obj):
        from sales.serializers import SaleEntrySerializer
        sales = obj.sales.all().order_by('-created_at')
        return SaleEntrySerializer(sales, many=True).data

class AdminLogEntrySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.email', default='unknown', read_only=True)

    class Meta:
        model = LogEntry
        fields = ['id', 'action_time', 'username', 'content_type_id', 'object_id', 'object_repr', 'action_flag', 'change_message']
