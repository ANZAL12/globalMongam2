from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class SaleEntry(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    
    PAYMENT_STATUS_CHOICES = (
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
    )

    promoter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')
    product_name = models.CharField(max_length=255)
    bill_amount = models.DecimalField(max_digits=10, decimal_places=2)
    bill_no = models.CharField(max_length=100, unique=True)
    bill_image = models.ImageField(upload_to='bills/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    incentive_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Audit trail
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_sales')
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # Soft delete
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if self.bill_no:
            self.bill_no = self.bill_no.upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product_name} - {self.promoter.email}"
