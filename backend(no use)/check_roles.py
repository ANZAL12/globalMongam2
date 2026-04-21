import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User

for u in User.objects.all():
    print(f"User: {u.email} | Role: {u.role} | Active: {u.is_active}")
