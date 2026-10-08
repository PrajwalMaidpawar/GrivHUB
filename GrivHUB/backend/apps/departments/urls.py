from django.urls import path
from backend.apps.departments import views

urlpatterns = [
    path('', views.list_departments_view, name='departments-list'),
]
