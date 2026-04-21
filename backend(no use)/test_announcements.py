import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from announcements.models import Announcement
from users.models import User
from rest_framework.test import APIClient

client = APIClient()
promoter = User.objects.filter(role='promoter').first()
client.force_authenticate(user=promoter)

response = client.get('/api/announcements/')
print("Status Code:", response.status_code)
print("Data length:", len(response.data) if isinstance(response.data, list) else response.data)
