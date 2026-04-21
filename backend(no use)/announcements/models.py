from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Announcement(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    image = models.ImageField(upload_to='announcements/', null=True, blank=True)
    target_promoters = models.ManyToManyField(User, blank=True, related_name='targeted_announcements')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
