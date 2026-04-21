import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sales.models import SaleEntry
from django.contrib.auth import get_user_model

User = get_user_model()

def verify():
    print("--- Starting Verification ---")
    
    # 1. Test Uniqueness
    bill_no = "TEST-UNIQUE-123"
    promoter = User.objects.filter(role='promoter').first()
    if not promoter:
        print("No promoter found, skipping uniqueness test.")
    else:
        try:
            SaleEntry.objects.create(
                promoter=promoter,
                product_name="Test Product",
                bill_amount=100.00,
                bill_no=bill_no,
                bill_image="test.jpg"
            )
            print("First sale created successfully.")
            
            try:
                SaleEntry.objects.create(
                    promoter=promoter,
                    product_name="Duplicate Product",
                    bill_amount=200.00,
                    bill_no=bill_no,
                    bill_image="dup.jpg"
                )
                print("FAILED: Duplicate bill number was accepted!")
            except Exception as e:
                print(f"PASSED: Duplicate bill number rejected: {e}")
        finally:
            SaleEntry.objects.filter(bill_no=bill_no).delete()

    # 2. Test Audit Trail
    admin = User.objects.filter(role='admin').first()
    if not admin or not promoter:
        print("Admin or Promoter not found, skipping audit test.")
    else:
        sale = SaleEntry.objects.create(
            promoter=promoter,
            product_name="Audit Test",
            bill_amount=50.00,
            bill_no="AUDIT-123",
            bill_image="audit.jpg"
        )
        print(f"Sale created for audit: ID {sale.id}")
        
        # Simulate approval in view
        sale.status = 'approved'
        sale.approved_by = admin
        sale.approved_at = timezone.now()
        sale.save()
        
        fresh_sale = SaleEntry.objects.get(id=sale.id)
        if fresh_sale.approved_by == admin and fresh_sale.approved_at:
            print(f"PASSED: Audit trail populated: approved_by={fresh_sale.approved_by}, approved_at={fresh_sale.approved_at}")
        else:
            print("FAILED: Audit trail not populated correctly.")
        
        fresh_sale.delete()

    # 3. Test Soft Delete filtering
    sale_active = SaleEntry.objects.create(
        promoter=promoter,
        product_name="Active Sale",
        bill_amount=10.00,
        bill_no="ACTIVE-1",
        bill_image="a.jpg",
        is_active=True
    )
    sale_inactive = SaleEntry.objects.create(
        promoter=promoter,
        product_name="Inactive Sale",
        bill_amount=10.00,
        bill_no="INACTIVE-1",
        bill_image="i.jpg",
        is_active=False
    )
    
    print(f"Sales created: Active ID {sale_active.id}, Inactive ID {sale_inactive.id}")
    
    # Check if we can filter (simulating view logic)
    active_count = SaleEntry.objects.filter(is_active=True).count()
    print(f"Current active sales count: {active_count}")
    
    sale_active.delete()
    sale_inactive.delete()
    print("--- Verification Finished ---")

if __name__ == "__main__":
    verify()
