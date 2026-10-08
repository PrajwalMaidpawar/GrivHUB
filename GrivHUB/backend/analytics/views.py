import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from backend.grievances.models import Grievance
from backend.apps.departments.models import Department
from backend.apps.incidents.models import Incident
from backend.apps.feedback.models import MLCorrection
from django.contrib.auth import get_user_model

logger = logging.getLogger("grievancehub.analytics")
User = get_user_model()

@api_view(['GET'])
@permission_classes([AllowAny])
def analytics_overview_view(request):
    queryset = Grievance.objects.select_related("assigned_department")
    total = queryset.count()
    resolved = Grievance.objects.filter(status=Grievance.Status.RESOLVED).count()
    closed = Grievance.objects.filter(status=Grievance.Status.CLOSED).count()
    in_progress = Grievance.objects.filter(status=Grievance.Status.IN_PROGRESS).count()
    pending = Grievance.objects.filter(status__in=[Grievance.Status.SUBMITTED, Grievance.Status.PENDING_ASSIGNMENT, Grievance.Status.ASSIGNED]).count()
    active = Grievance.objects.filter(status__in=[Grievance.Status.SUBMITTED, Grievance.Status.PENDING_ASSIGNMENT, Grievance.Status.ASSIGNED, Grievance.Status.IN_PROGRESS, Grievance.Status.REOPENED]).count()
    critical = queryset.filter(priority=Grievance.Priority.CRITICAL).count()
    sla_breaches = queryset.filter(
        due_at__lt=timezone.now(),
        status__in=[Grievance.Status.SUBMITTED, Grievance.Status.PENDING_ASSIGNMENT, Grievance.Status.ASSIGNED, Grievance.Status.IN_PROGRESS, Grievance.Status.REOPENED],
    ).count()

    sla_compliance_rate = round((resolved + closed) / max(1, total) * 100, 1)

    # Category distribution
    cat_counts = Grievance.objects.values('predicted_category').annotate(count=Count('id')).order_by('-count')
    category_distribution = {c['predicted_category'] or 'General Consumer Services': c['count'] for c in cat_counts}

    # Priority distribution
    prio_counts = Grievance.objects.values('priority').annotate(count=Count('id'))
    priority_distribution = {p['priority']: p['count'] for p in prio_counts}

    # Incidents count
    incidents_count = Incident.objects.count()
    corrections_count = MLCorrection.objects.count()

    status_counts = {
        row["status"]: row["count"]
        for row in queryset.values("status").annotate(count=Count("id"))
    }
    departments = {}
    for row in queryset.values("assigned_department_id", "assigned_department__code", "assigned_department__name").annotate(total=Count("id")):
        key = str(row["assigned_department_id"]) if row["assigned_department_id"] else "UNASSIGNED"
        departments[key] = {
            "code": row["assigned_department__code"] or "UNASSIGNED",
            "name": row["assigned_department__name"] or "Unassigned MSEDCL Complaints",
            "total": row["total"],
            "active": queryset.filter(assigned_department_id=row["assigned_department_id"], status__in=[Grievance.Status.SUBMITTED, Grievance.Status.PENDING_ASSIGNMENT, Grievance.Status.ASSIGNED, Grievance.Status.IN_PROGRESS, Grievance.Status.REOPENED]).count() if row["assigned_department_id"] else queryset.filter(assigned_department__isnull=True).count(),
            "resolved": queryset.filter(assigned_department_id=row["assigned_department_id"], status__in=[Grievance.Status.RESOLVED, Grievance.Status.CLOSED]).count() if row["assigned_department_id"] else queryset.filter(assigned_department__isnull=True, status__in=[Grievance.Status.RESOLVED, Grievance.Status.CLOSED]).count(),
        }
    monthly_trends = [
        {"month": row["month"].strftime("%Y-%m"), "count": row["count"]}
        for row in queryset.annotate(month=TruncMonth("created_at")).values("month").annotate(count=Count("id")).order_by("month")
    ]
    alerts = []
    for grievance in queryset.filter(priority=Grievance.Priority.CRITICAL, status__in=[Grievance.Status.SUBMITTED, Grievance.Status.PENDING_ASSIGNMENT, Grievance.Status.ASSIGNED, Grievance.Status.IN_PROGRESS])[:20]:
        alerts.append({"alert_id": f"critical-{grievance.id}", "alert_type": "CRITICAL_COMPLAINT", "severity": "CRITICAL", "title": "Critical electrical complaint", "description": grievance.title, "grievance_id": grievance.complaint_number})
    for grievance in queryset.filter(due_at__lt=timezone.now(), status__in=[Grievance.Status.SUBMITTED, Grievance.Status.PENDING_ASSIGNMENT, Grievance.Status.ASSIGNED, Grievance.Status.IN_PROGRESS])[:20]:
        alerts.append({"alert_id": f"sla-{grievance.id}", "alert_type": "SLA_BREACH", "severity": "HIGH", "title": "SLA breach", "description": grievance.title, "grievance_id": grievance.complaint_number})

    return Response({
        "summary": {
            "total_grievances": total,
            "pending": pending,
            "in_progress": in_progress,
            "resolved": resolved + closed,
            "critical": critical,
            "sla_breaches": sla_breaches,
        },
        "by_status": status_counts,
        "by_category": category_distribution,
        "by_department": departments,
        "monthly_trends": monthly_trends,
        "alerts": alerts,
        "total_grievances": total,
        "active_grievances": active,
        "in_progress": in_progress,
        "resolved_grievances": resolved + closed,
        "sla_compliance_rate": round((total - sla_breaches) / max(1, total) * 100, 1),
        "category_distribution": category_distribution,
        "priority_distribution": priority_distribution,
        "active_incidents": incidents_count,
        "human_ml_corrections": corrections_count,
        "total_consumers": User.objects.filter(role=User.Role.CONSUMER).count(),
        "total_officers": User.objects.filter(role=User.Role.OFFICER).count(),
    })
