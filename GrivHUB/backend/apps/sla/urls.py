from django.urls import path
from backend.apps.sla import views

urlpatterns = [
    path('overview/', views.sla_overview_view, name='sla-overview'),
    path('grievances/', views.list_sla_grievances_view, name='sla-grievances'),
    path('escalations/', views.list_sla_escalations_view, name='sla-escalations'),
    path('policies/', views.sla_policies_view, name='sla-policies'),
    path('policies/<int:policy_id>/', views.sla_policy_detail_view, name='sla-policy-detail'),
    path('grievances/<uuid:grievance_id>/pause/', views.pause_sla_view, name='sla-pause'),
    path('grievances/<uuid:grievance_id>/resume/', views.resume_sla_view, name='sla-resume'),
    path('process/', views.trigger_process_sla_view, name='sla-trigger-process'),
]
