#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Automatically create the superuser without needing the Render Shell
DJANGO_SUPERUSER_PASSWORD="Anzal@2002" python manage.py createsuperuser --email mohammedanzel123@gmail.com --noinput || true