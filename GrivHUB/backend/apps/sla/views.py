"""
GrievanceHUB SLA Management & Analytics Views
Real database aggregations, policy management, escalation tracking, and pause/resume control.
"""

import logging
from django.utils import timezone
from django.db.models import Count, Avg, F, Q, ExpressionWrapper, fields
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from backend.grievances.models import Grievance
from backend.apps.sla.models import SLAPolicy, SLAEscalation, SLAPauseLog
from backend.apps.sla.serializers import (
    SLAPolicySerializer,
    SLAEscalationSerializer,
    SLAGrievanceSerializer,
    SLAPauseResumeSerializer,
)
from backend.apps.sla.services.sla_engine import (
    pause_grievance_sla,
    resume_grievance_sla,
    process_all_active_sla,
    ensure_default_sla_policies,
)
from backend.apps.accounts.permissions import IsOfficer, IsAdminUserRole
from backend.apps.accounts.models import User

logger = logging.getLogger("grievancehub.sla")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sla_overview_view(request):
    """
    Returns real database aggregations for SLA performance.
    Calculates compliant, warning, breached, escalated counts, department breakdown,
    and average resolution times directly from the database.
    """
    ensure_default_sla_policies()
    now = timezone.now()

    # Query active grievances
    active_statuses = [
        Grievance.Status.SUBMITTED,
        Grievance.Status.AI_CLASSIFIED,
        Grievance.Status.PENDING_ASSIGNMENT,
        Grievance.Status.ASSIGNED,
        Grievance.Status.IN_PROGRESS,
        Grievance.Status.REOPENED,
        Grievance.Status.ESCALATED,
    ]
    active_qs = Grievance.objects.filter(status__in=active_statuses)
    total_active = active_qs.count()

    # Breached: due_at passed or marked as BREACHED
    breached_count = active_qs.filter(
        Q(due_at__lt=now) | Q(sla_status=Grievance.SLAStatus.BREACHED)
    ).count()

    # Warning
    warning_count = active_qs.filter(sla_status=Grievance.SLAStatus.WARNING).count()

    # Escalated: active grievances with an escalation level assigned
    escalated_count = active_qs.filter(
        ~Q(escalation_level=Grievance.EscalationLevel.NONE)
    ).count()

    # Compliant active complaints
    compliant_count = max(0, total_active - breached_count)
    compliance_rate = round((compliant_count / max(1, total_active)) * 100, 1)

    # Resolution time aggregation from resolved/closed grievances
    resolved_qs = Grievance.objects.filter(
        status__in=[Grievance.Status.RESOLVED, Grievance.Status.CLOSED],
        resolved_at__isnull=False
    )
    total_resolved = resolved_qs.count()

    # Calculate average resolution hours using database duration
    avg_resolution_hours = 0.0
    if total_resolved > 0:
        durations = []
        for g in resolved_qs.only('created_at', 'resolved_at')[:200]:
            if g.resolved_at and g.created_at:
                durations.append((g.resolved_at - g.created_at).total_seconds() / 3600.0)
        if durations:
            avg_resolution_hours = round(sum(durations) / len(durations), 1)

    # Department SLA compliance breakdown from DB
    department_metrics = []
    from backend.apps.departments.models import Department
    all_depts = Department.objects.all()

    for dept in all_depts:
        dept_active = active_qs.filter(assigned_department=dept)
        dept_total = dept_active.count()
        if dept_total == 0:
            # Check resolved history for department
            dept_resolved = resolved_qs.filter(assigned_department=dept).count()
            if dept_resolved > 0:
                department_metrics.append({
                    "department_id": str(dept.id),
                    "code": dept.code,
                    "name": dept.name,
                    "active_complaints": 0,
                    "compliant": 0,
                    "warning": 0,
                    "breached": 0,
                    "compliance_rate": 100.0,
                })
            continue

        dept_breached = dept_active.filter(
            Q(due_at__lt=now) | Q(sla_status=Grievance.SLAStatus.BREACHED)
        ).count()
        dept_warning = dept_active.filter(sla_status=Grievance.SLAStatus.WARNING).count()
        dept_compliant = max(0, dept_total - dept_breached)
        dept_rate = round((dept_compliant / dept_total) * 100, 1)

        department_metrics.append({
            "department_id": str(dept.id),
            "code": dept.code,
            "name": dept.name,
            "active_complaints": dept_total,
            "compliant": dept_compliant,
            "warning": dept_warning,
            "breached": dept_breached,
            "compliance_rate": dept_rate,
        })

    # Breaches by priority
    breaches_by_priority = {}
    for prio_choice in [Grievance.Priority.CRITICAL, Grievance.Priority.HIGH, Grievance.Priority.MEDIUM, Grievance.Priority.LOW]:
        cnt = active_qs.filter(
            priority=prio_choice,
            sla_status=Grievance.SLAStatus.BREACHED
        ).count()
        breaches_by_priority[prio_choice] = cnt

    # Breaches by category
    cat_counts = (
        active_qs.filter(sla_status=Grievance.SLAStatus.BREACHED)
        .values("predicted_category")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    breaches_by_category = {
        row["predicted_category"] or "General Consumer Services": row["count"]
        for row in cat_counts
    }

    # Escalations by level
    esc_counts = (
        SLAEscalation.objects.values("escalation_level")
        .annotate(count=Count("id"))
    )
    escalations_by_level = {
        row["escalation_level"]: row["count"] for row in esc_counts
    }

    return Response({
        "summary": {
            "total_active_complaints": total_active,
            "sla_compliant": compliant_count,
            "sla_warning": warning_count,
            "sla_breached": breached_count,
            "currently_escalated": escalated_count,
            "compliance_rate": compliance_rate,
            "average_resolution_hours": avg_resolution_hours,
            "total_resolved": total_resolved,
        },
        "sla_by_department": department_metrics,
        "breaches_by_priority": breaches_by_priority,
        "breaches_by_category": breaches_by_category,
        "escalations_by_level": escalations_by_level,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sla_grievances_view(request):
    """
    Returns grievances with live calculated SLA status, countdown seconds, and escalation levels.
    """
    qs = Grievance.objects.select_related(
        "sla_policy", "assigned_officer", "assigned_department", "service_area"
    ).all()

    # Role filtering
    if request.user.role == User.Role.CONSUMER and not request.user.is_superuser:
        qs = qs.filter(consumer=request.user)
    elif request.user.role == User.Role.OFFICER and not request.user.is_superuser:
        qs = qs.filter(
            Q(assigned_officer=request.user) | Q(assigned_department__officers=request.user)
        ).distinct()

    # Filter parameters
    sla_status = request.query_params.get("sla_status")
    if sla_status:
        qs = qs.filter(sla_status=sla_status)

    priority = request.query_params.get("priority")
    if priority:
        qs = qs.filter(priority=priority)

    escalated_only = request.query_params.get("escalated")
    if escalated_only and escalated_only.lower() in ("true", "1"):
        qs = qs.filter(~Q(escalation_level=Grievance.EscalationLevel.NONE))

    grievances = qs[:100]
    serializer = SLAGrievanceSerializer(grievances, many=True)
    return Response({"grievances": serializer.data, "count": qs.count()})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sla_escalations_view(request):
    """
    Returns history of SLA escalations with grievance details and utility levels.
    """
    qs = SLAEscalation.objects.select_related(
        "grievance", "grievance__assigned_officer", "acknowledged_by"
    ).all()

    if request.user.role == User.Role.CONSUMER and not request.user.is_superuser:
        qs = qs.filter(grievance__consumer=request.user)
    elif request.user.role == User.Role.OFFICER and not request.user.is_superuser:
        qs = qs.filter(
            Q(grievance__assigned_officer=request.user) |
            Q(grievance__assigned_department__officers=request.user)
        ).distinct()

    level = request.query_params.get("level")
    if level:
        qs = qs.filter(escalation_level=level)

    serializer = SLAEscalationSerializer(qs[:100], many=True)
    return Response({"escalations": serializer.data, "count": qs.count()})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def sla_policies_view(request):
    """
    GET: List all configured SLA policies.
    POST: Admin-only create new SLA policy.
    """
    ensure_default_sla_policies()

    if request.method == "GET":
        policies = SLAPolicy.objects.select_related("department", "service_area").all()
        serializer = SLAPolicySerializer(policies, many=True)
        return Response({"policies": serializer.data, "count": policies.count()})

    elif request.method == "POST":
        if request.user.role != User.Role.ADMIN and not request.user.is_superuser:
            return Response(
                {"error": "Only system administrators can configure SLA policies."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SLAPolicySerializer(data=request.data)
        if serializer.is_valid():
            policy = serializer.save()
            return Response(
                {"message": "SLA Policy created successfully.", "policy": SLAPolicySerializer(policy).data},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminUserRole])
def sla_policy_detail_view(request, policy_id):
    """
    Admin-only policy update or soft-deactivation.
    """
    try:
        policy = SLAPolicy.objects.get(id=policy_id)
    except SLAPolicy.DoesNotExist:
        return Response({"error": "SLA policy not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "PATCH":
        serializer = SLAPolicySerializer(policy, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({"message": "Policy updated.", "policy": SLAPolicySerializer(updated).data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        policy.active = False
        policy.save(update_fields=["active"])
        return Response({"message": "Policy deactivated."})


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOfficer])
def pause_sla_view(request, grievance_id):
    """
    Pauses SLA countdown for legitimate system-defined states (e.g. WAITING_FOR_CONSUMER).
    """
    try:
        grievance = Grievance.objects.get(id=grievance_id)
    except Grievance.DoesNotExist:
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = SLAPauseResumeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    reason_type = serializer.validated_data.get("reason_type", "WAITING_FOR_CONSUMER")
    reason_notes = serializer.validated_data["reason_notes"]

    success = pause_grievance_sla(grievance, request.user, reason_type, reason_notes)
    if not success:
        return Response(
            {"error": "Cannot pause SLA. Grievance may already be paused, resolved, or closed."},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        "message": "SLA countdown paused.",
        "sla_status": grievance.sla_status,
        "paused_at": grievance.paused_at
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsOfficer])
def resume_sla_view(request, grievance_id):
    """
    Resumes SLA countdown, calculates duration paused, and extends due_at accordingly.
    """
    try:
        grievance = Grievance.objects.get(id=grievance_id)
    except Grievance.DoesNotExist:
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)

    success = resume_grievance_sla(grievance, request.user)
    if not success:
        return Response(
            {"error": "Cannot resume SLA. Grievance is not currently paused."},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        "message": "SLA countdown resumed.",
        "sla_status": grievance.sla_status,
        "due_at": grievance.due_at,
        "total_paused_seconds": grievance.total_paused_seconds
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUserRole])
def trigger_process_sla_view(request):
    """
    Triggers batch SLA deadline and escalation evaluation on demand.
    """
    summary = process_all_active_sla()
    return Response({
        "message": "SLA batch processing executed successfully.",
        "summary": summary
    })
