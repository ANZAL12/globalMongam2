from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.contrib.contenttypes.models import ContentType

def log_admin_action(user, content_object, action_flag, change_message=""):
    """
    Manually log an admin action to django.contrib.admin.models.LogEntry.
    """
    LogEntry.objects.log_action(
        user_id=user.id,
        content_type_id=ContentType.objects.get_for_model(content_object).pk,
        object_id=content_object.pk,
        object_repr=str(content_object),
        action_flag=action_flag,
        change_message=change_message,
    )
