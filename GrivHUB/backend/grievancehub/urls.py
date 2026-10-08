"""
GrievanceHUB Master URL Dispatcher & Router
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('backend.apps.accounts.urls')),
    path('api/admin/', include('backend.apps.accounts.admin_urls')),
    path('api/departments/', include('backend.apps.departments.urls')),
    path('api/analytics/', include('backend.analytics.urls')),
    path('api/sla/', include('backend.apps.sla.urls')),
    path('api/', include('backend.grievances.urls')),
]
