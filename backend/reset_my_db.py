import os
import django
import sys

def main():
    sys.path.append(r"a:\GlobalAgencies\backend")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    django.setup()
    
    from django.contrib.auth import get_user_model
    from django.core.management import call_command
    
    try:
        # call_command('flush', '--no-input') # Already flushed
        User = get_user_model()
        
        # Check if exists
        try:
            admin_user = User.objects.get(email='admin@example.com')
            admin_user.set_password('password123')
            admin_user.save()
            print("Admin user updated.")
        except User.DoesNotExist:
            User.objects.create_superuser(email='admin@example.com', password='password123')
            print("Admin user created.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
