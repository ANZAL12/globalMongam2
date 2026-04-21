import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sales.models import SaleEntry
from users.models import User
from django.core.files.uploadedfile import SimpleUploadedFile

def test_create_sale():
    try:
        user = User.objects.filter(role='promoter').first()
        if not user:
            print("No promoter found")
            return

        print(f"Testing with user: {user.email}")
        
        # Create a dummy image
        image_content = b"fake image content"
        image = SimpleUploadedFile("test.jpg", image_content, content_type="image/jpeg")
        
        sale = SaleEntry(
            promoter=user,
            product_name="Test Product",
            bill_amount=100.00,
            bill_no="TEST-BILL-999",
            bill_image=image
        )
        sale.save()
        print(f"Sale created successfully: {sale.id}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_create_sale()
