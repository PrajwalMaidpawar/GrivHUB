from django.urls import path
from backend.analytics import views

urlpatterns = [
    path('overview/', views.analytics_overview_view, name='analytics-overview'),
    path('msedcl-overview/', views.analytics_overview_view, name='msedcl-analytics-overview'),
]
