"""
WSGI config for GrievanceHUB project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.grievancehub.settings')

application = get_wsgi_application()
