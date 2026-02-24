from rest_framework import serializers
from .models import SaleEntry

class SaleEntrySerializer(serializers.ModelSerializer):
    promoter_email = serializers.EmailField(source='promoter.email', read_only=True)

    class Meta:
        model = SaleEntry
        fields = [
            'id', 'promoter', 'promoter_email', 'product_name', 'bill_amount', 'bill_no',
            'bill_image', 'status', 'incentive_amount', 'payment_status', 'created_at',
            'approved_by', 'approved_at', 'paid_at'
        ]
        read_only_fields = ['id', 'promoter', 'status', 'incentive_amount', 'payment_status', 'created_at', 'approved_by', 'approved_at', 'paid_at']

class SaleEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleEntry
        fields = ['id', 'product_name', 'bill_amount', 'bill_no', 'bill_image']
        extra_kwargs = {
            'bill_no': {'required': True, 'allow_blank': False}
        }
        read_only_fields = ['id']

    def validate_bill_no(self, value):
        if value:
            upper_val = value.upper()
            if SaleEntry.objects.filter(bill_no=upper_val).exists():
                raise serializers.ValidationError("sale entry with this bill no already exists.")
            return upper_val
        return value

class SaleStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleEntry
        fields = ['status', 'incentive_amount']

    def validate(self, data):
        status = data.get('status', self.instance.status if self.instance else None)
        incentive_amount = data.get('incentive_amount', self.instance.incentive_amount if self.instance else None)

        if status == 'approved' and incentive_amount is None:
            raise serializers.ValidationError({"incentive_amount": "Incentive amount is required when approving a sale."})

        return data
