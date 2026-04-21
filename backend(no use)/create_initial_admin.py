import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
try:    User.objects.create_superuser(username='admin', email='admin@example.com', password='password123')
except Exception as e:    print(e)
