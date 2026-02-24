from django.contrib import admin
from .models import SaleEntry

@admin.register(SaleEntry)
class SaleEntryAdmin(admin.ModelAdmin):
    list_display = ('id', 'promoter', 'product_name', 'bill_no', 'status', 'payment_status', 'bill_amount', 'created_at')
    list_filter = ('status', 'payment_status', 'created_at')
    search_fields = ('promoter__email', 'product_name', 'bill_no')
