from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdminUserRole, IsPromoter
from .models import SaleEntry
from .serializers import SaleEntrySerializer, SaleEntryCreateSerializer, SaleStatusUpdateSerializer
from django.utils import timezone
from core.notifications import send_push_message
from django.contrib.admin.models import CHANGE
from core.utils import log_admin_action

class SaleCreateView(generics.CreateAPIView):
    serializer_class = SaleEntryCreateSerializer
    permission_classes = [IsPromoter]

    def perform_create(self, serializer):
        serializer.save(promoter=self.request.user)

class PromoterSaleListView(generics.ListAPIView):
    serializer_class = SaleEntrySerializer
    permission_classes = [IsPromoter]

    def get_queryset(self):
        return SaleEntry.objects.filter(promoter=self.request.user, is_active=True).order_by('-created_at')

class AdminSaleListView(generics.ListAPIView):
    serializer_class = SaleEntrySerializer
    permission_classes = [IsAdminUserRole]
    queryset = SaleEntry.objects.filter(is_active=True).order_by('-created_at')

class AdminSaleApproveView(generics.UpdateAPIView):
    queryset = SaleEntry.objects.all()
    serializer_class = SaleStatusUpdateSerializer
    permission_classes = [IsAdminUserRole]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'pending':
            return Response({"detail": "Only pending sales can be approved."}, status=status.HTTP_400_BAD_REQUEST)
        
        request.data['status'] = 'approved'
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        instance.approved_by = self.request.user
        instance.approved_at = timezone.now()
        self.perform_update(serializer)

        # Log the action
        log_admin_action(
            user=self.request.user,
            content_object=instance,
            action_flag=CHANGE,
            change_message=f"Approved sale for {instance.product_name} by {instance.promoter.email if instance.promoter else 'N/A'}"
        )
        
        # Send Notification to Promoter
        if instance.promoter and instance.promoter.expo_push_token:
            send_push_message(
                token=instance.promoter.expo_push_token,
                title="Sale Approved! ✅",
                message=f"Your sale for {instance.product_name} has been approved.",
                extra={"sale_id": instance.id}
            )
        
        # Return full representation
        return Response(SaleEntrySerializer(instance).data)

class AdminSaleRejectView(generics.UpdateAPIView):
    queryset = SaleEntry.objects.all()
    permission_classes = [IsAdminUserRole]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'pending':
            return Response({"detail": "Only pending sales can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
        
        instance.status = 'rejected'
        instance.save()
        
        # Log the action
        log_admin_action(
            user=self.request.user,
            content_object=instance,
            action_flag=CHANGE,
            change_message=f"Rejected sale for {instance.product_name} by {instance.promoter.email if instance.promoter else 'N/A'}"
        )
        
        # Send Notification to Promoter
        if instance.promoter and instance.promoter.expo_push_token:
            send_push_message(
                token=instance.promoter.expo_push_token,
                title="Sale Rejected ❌",
                message=f"Your sale for {instance.product_name} has been rejected.",
                extra={"sale_id": instance.id}
            )
            
        return Response(SaleEntrySerializer(instance).data)

class AdminSaleMarkPaidView(generics.UpdateAPIView):
    queryset = SaleEntry.objects.all()
    permission_classes = [IsAdminUserRole]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'approved':
            return Response({"detail": "Only approved sales can be marked as paid."}, status=status.HTTP_400_BAD_REQUEST)
        if instance.payment_status == 'paid':
            return Response({"detail": "Sale is already marked as paid."}, status=status.HTTP_400_BAD_REQUEST)
            
        instance.payment_status = 'paid'
        instance.paid_at = timezone.now()
        instance.save()
        
        # Log the action
        log_admin_action(
            user=self.request.user,
            content_object=instance,
            action_flag=CHANGE,
            change_message=f"Marked sale as PAID for {instance.product_name} by {instance.promoter.email if instance.promoter else 'N/A'}"
        )
        
        # Send Notification to Promoter
        if instance.promoter and instance.promoter.expo_push_token:
            send_push_message(
                token=instance.promoter.expo_push_token,
                title="Incentive Paid! 💰",
                message=f"You have been paid ₹{instance.incentive_amount} for {instance.product_name}.",
                extra={"sale_id": instance.id}
            )
            
        return Response(SaleEntrySerializer(instance).data)
