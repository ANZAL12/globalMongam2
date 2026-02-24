import os
import django
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User

for u in User.objects.all():
    print(f"User: {u.email} | Role: {u.role} | Token: {u.expo_push_token}")
