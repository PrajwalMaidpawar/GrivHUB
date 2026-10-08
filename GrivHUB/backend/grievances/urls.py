"""
GrievanceHUB URL Configuration for Django REST Framework
Supports endpoints with or without trailing slash.
"""

from django.urls import re_path
from backend.grievances import views

urlpatterns = [
    re_path(r"^health/?$", views.system_health_view, name="system-health"),
    re_path(r"^ml/health/?$", views.ml_health_view, name="ml-health"),
    re_path(r"^grievances/classify/?$", views.classify_text_view, name="grievances-classify"),
    re_path(r"^grievances/?$", views.submit_grievance_view, name="grievances-list-create"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/?$", views.get_grievance_detail_view, name="grievances-detail"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/route/?$", views.trigger_routing_view, name="grievances-route"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/assign/?$", views.manual_assignment_view, name="grievances-assign"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/reassign/?$", views.reassign_grievance_view, name="grievances-reassign"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/correct-category/?$", views.correct_category_view, name="grievances-correct-category"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/history/?$", views.grievance_history_view, name="grievances-history"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/start/?$", views.officer_start_work_view, name="grievances-start"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/progress/?$", views.officer_progress_update_view, name="grievances-progress"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/resolve/?$", views.officer_submit_resolution_view, name="grievances-resolve"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/timeline/?$", views.grievance_timeline_view, name="grievances-timeline"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/comments/?$", views.grievance_comments_view, name="grievances-comments"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/confirm-resolution/?$", views.citizen_confirm_resolution_view, name="grievances-confirm-resolution"),
    re_path(r"^grievances/(?P<grievance_id>[A-Za-z0-9\-]+)/reopen/?$", views.citizen_reopen_view, name="grievances-reopen"),
    re_path(r"^departments/?$", views.list_departments_view, name="departments-list"),
    re_path(r"^departments/(?P<department_id>[A-Za-z0-9\-]+)/grievances/?$", views.department_queue_view, name="departments-queue"),
    re_path(r"^officers/?$", views.list_officers_view, name="officers-list"),
    re_path(r"^officers/(?P<officer_id>[A-Za-z0-9\-]+)/workload/?$", views.officer_workload_view, name="officers-workload"),
    re_path(r"^routing/audits/?$", views.list_routing_audits_view, name="routing-audits"),
]
