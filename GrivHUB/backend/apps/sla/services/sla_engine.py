"""
GrievanceHUB MSEDCL SLA Policy & Escalation Engine
Configurable, database-driven SLA tracking, warning thresholds,
hierarchical utility escalations (JE -> AE -> EE -> SE), pause/resume management,
and audit trails with idempotent background execution.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any
from django.utils import timezone
from django.db import transaction
from django.db.models import Q

from backend.grievances.models import Grievance
from backend.apps.sla.models import SLAPolicy, SLAEscalation, SLAPauseLog
from backend.apps.notifications.services.notification_dispatcher import dispatch_notification
from backend.apps.audit.models import AuditLog

logger = logging.getLogger("grievancehub.sla")


# Standard MSEDCL default policies for initial seeding / fallback
DEFAULT_MSEDCL_POLICIES = [
    {
        "name": "MSEDCL Emergency Electrical Safety Hazard",
        "priority": Grievance.Priority.CRITICAL,
        "category": Grievance.Category.HAZARD_WIRE_POLE,
        "target_minutes": 120,      # 2 Hours
        "warning_minutes": 30,      # 30 Mins warning
        "escalation_threshold_hours": 1,
        "sla_clock_type": SLAPolicy.ClockType.CONTINUOUS_24H,
    },
    {
        "name": "MSEDCL High Voltage Transformer Breakdown",
        "priority": Grievance.Priority.HIGH,
        "category": Grievance.Category.TRANSFORMER_FAULT,
        "target_minutes": 720,      # 12 Hours
        "warning_minutes": 120,     # 2 Hours warning
        "escalation_threshold_hours": 3,
        "sla_clock_type": SLAPolicy.ClockType.CONTINUOUS_24H,
    },
    {
        "name": "MSEDCL Area Power Outage Supply Restoration",
        "priority": Grievance.Priority.HIGH,
        "category": Grievance.Category.POWER_OUTAGE,
        "target_minutes": 480,      # 8 Hours
        "warning_minutes": 120,     # 2 Hours warning
        "escalation_threshold_hours": 2,
        "sla_clock_type": SLAPolicy.ClockType.CONTINUOUS_24H,
    },
    {
        "name": "MSEDCL Voltage Quality & Phase Fluctuation",
        "priority": Grievance.Priority.MEDIUM,
        "category": Grievance.Category.VOLTAGE_FLUCTUATION,
        "target_minutes": 1440,     # 24 Hours
        "warning_minutes": 240,     # 4 Hours warning
        "escalation_threshold_hours": 6,
        "sla_clock_type": SLAPolicy.ClockType.CONTINUOUS_24H,
    },
    {
        "name": "MSEDCL Smart & Electronic Meter Verification",
        "priority": Grievance.Priority.MEDIUM,
        "category": Grievance.Category.METER_ISSUES,
        "target_minutes": 2880,     # 48 Hours
        "warning_minutes": 360,     # 6 Hours warning
        "escalation_threshold_hours": 12,
        "sla_clock_type": SLAPolicy.ClockType.CONTINUOUS_24H,
    },
    {
        "name": "MSEDCL Billing, Tariff & Payment Reconciliation",
        "priority": Grievance.Priority.LOW,
        "category": Grievance.Category.BILLING_PAYMENT,
        "target_minutes": 4320,     # 72 Hours
        "warning_minutes": 480,     # 8 Hours warning
        "escalation_threshold_hours": 24,
        "sla_clock_type": SLAPolicy.ClockType.CONTINUOUS_24H,
    },
    # General Priority Level Fallbacks
    {
        "name": "MSEDCL General Critical Safety Policy",
        "priority": Grievance.Priority.CRITICAL,
        "category": None,
        "target_minutes": 120,
        "warning_minutes": 30,
        "escalation_threshold_hours": 1,
        "sla_clock_type": SLAPolicy.ClockType.CONTINUOUS_24H,
    },
    {
        "name": "MSEDCL General High Priority Policy",
        "priority": Grievance.Priority.HIGH,
        "category": None,
        "target_minutes": 480,
        "warning_minutes": 120,
        "escalation_threshold_hours": 2,
        "sla_clock_type": SLAPolicy.ClockType.CONTINUOUS_24H,
    },
    {
        "name": "MSEDCL General Medium Priority Policy",
        "priority": Grievance.Priority.MEDIUM,
        "category": None,
        "target_minutes": 1440,
        "warning_minutes": 240,
        "escalation_threshold_hours": 6,
        "sla_clock_type": SLAPolicy.ClockType.CONTINUOUS_24H,
    },
    {
        "name": "MSEDCL General Low Priority Policy",
        "priority": Grievance.Priority.LOW,
        "category": None,
        "target_minutes": 4320,
        "warning_minutes": 480,
        "escalation_threshold_hours": 24,
        "sla_clock_type": SLAPolicy.ClockType.CONTINUOUS_24H,
    },
]


def ensure_default_sla_policies():
    """Seeds baseline MSEDCL SLA policies if none exist."""
    if SLAPolicy.objects.exists():
        return
    for item in DEFAULT_MSEDCL_POLICIES:
        SLAPolicy.objects.create(
            name=item["name"],
            priority=item["priority"],
            category=item.get("category"),
            target_minutes=item["target_minutes"],
            warning_minutes=item["warning_minutes"],
            resolution_target_hours=max(1, item["target_minutes"] // 60),
            escalation_threshold_hours=item.get("escalation_threshold_hours", 2),
            sla_clock_type=item.get("sla_clock_type", SLAPolicy.ClockType.CONTINUOUS_24H),
            active=True
        )
    logger.info("Initialized default MSEDCL SLA policies in database.")


def find_matching_sla_policy(
    priority: str,
    category: Optional[str] = None,
    department = None,
    service_area = None
) -> Optional[SLAPolicy]:
    """
    Finds the most specific active SLAPolicy matching:
    1. Priority + Category + Department + ServiceArea
    2. Priority + Category + Department
    3. Priority + Category
    4. Priority only (General fallback)
    """
    ensure_default_sla_policies()
    base_qs = SLAPolicy.objects.filter(priority=priority, active=True)

    # 1. Exact match with category, department, service_area
    if category and department and service_area:
        match = base_qs.filter(category=category, department=department, service_area=service_area).first()
        if match:
            return match

    # 2. Match with category and department
    if category and department:
        match = base_qs.filter(category=category, department=department, service_area__isnull=True).first()
        if match:
            return match

    # 3. Match with category
    if category:
        match = base_qs.filter(category=category, department__isnull=True, service_area__isnull=True).first()
        if match:
            return match

    # 4. Fallback to priority only
    match = base_qs.filter(category__isnull=True, department__isnull=True, service_area__isnull=True).first()
    if match:
        return match

    # 5. Any active policy with that priority
    return base_qs.first()


def calculate_due_date(
    priority: str,
    created_at: Optional[datetime] = None,
    category: Optional[str] = None,
    department = None,
    service_area = None
) -> Tuple[datetime, datetime, Optional[SLAPolicy]]:
    """
    Authoritative SLA due date and warning timestamp calculation.
    Returns: (due_at, warning_at, policy)
    """
    start_time = created_at or timezone.now()
    policy = find_matching_sla_policy(priority, category, department, service_area)

    if policy:
        target_minutes = policy.target_minutes or (policy.resolution_target_hours * 60)
        warning_minutes = policy.warning_minutes or max(15, target_minutes // 4)
    else:
        # Static fallback if no policy found
        fallback_targets = {
            Grievance.Priority.CRITICAL: 120,
            Grievance.Priority.HIGH: 480,
            Grievance.Priority.MEDIUM: 1440,
            Grievance.Priority.LOW: 4320,
        }
        target_minutes = fallback_targets.get(priority, 1440)
        warning_minutes = max(15, target_minutes // 4)

    due_at = start_time + timedelta(minutes=target_minutes)
    warning_at = due_at - timedelta(minutes=warning_minutes)

    return due_at, warning_at, policy


def apply_sla_to_grievance(grievance: Grievance) -> Grievance:
    """
    Applies authoritative SLA policy and calculates due date for a grievance.
    """
    due_at, warning_at, policy = calculate_due_date(
        priority=grievance.priority,
        created_at=grievance.created_at,
        category=grievance.effective_category,
        department=grievance.assigned_department,
        service_area=grievance.service_area
    )
    grievance.sla_policy = policy
    grievance.due_at = due_at
    grievance.sla_status = Grievance.SLAStatus.ACTIVE
    grievance.save(update_fields=['sla_policy', 'due_at', 'sla_status'])

    # Record SLA initiation audit log
    AuditLog.objects.create(
        actor=None,
        action_type="SLA_STARTED",
        resource_type="GRIEVANCE",
        resource_id=str(grievance.id),
        details={
            "complaint_number": grievance.complaint_number,
            "policy_name": policy.name if policy else "Default Policy",
            "due_at": due_at.isoformat(),
            "target_minutes": policy.target_minutes if policy else 1440
        }
    )
    return grievance


def pause_grievance_sla(grievance: Grievance, actor, reason_type: str, reason_notes: str) -> bool:
    """
    Pauses SLA countdown for legitimate system-defined reasons (e.g. WAITING_FOR_CONSUMER).
    Records auditable pause log.
    """
    if grievance.is_paused or grievance.status in [Grievance.Status.RESOLVED, Grievance.Status.CLOSED]:
        return False

    now = timezone.now()
    with transaction.atomic():
        grievance.is_paused = True
        grievance.paused_at = now
        grievance.pause_reason = f"{reason_type}: {reason_notes}"
        grievance.paused_by = actor
        grievance.sla_status = Grievance.SLAStatus.PAUSED
        grievance.save(update_fields=['is_paused', 'paused_at', 'pause_reason', 'paused_by', 'sla_status'])

        SLAPauseLog.objects.create(
            grievance=grievance,
            reason_type=reason_type,
            reason_notes=reason_notes,
            paused_by=actor
        )

        AuditLog.objects.create(
            actor=actor,
            action_type="SLA_PAUSED",
            resource_type="GRIEVANCE",
            resource_id=str(grievance.id),
            details={
                "complaint_number": grievance.complaint_number,
                "reason_type": reason_type,
                "reason_notes": reason_notes,
                "paused_at": now.isoformat()
            }
        )

    logger.info(f"SLA paused for grievance {grievance.complaint_number} by {actor}")
    return True


def resume_grievance_sla(grievance: Grievance, actor) -> bool:
    """
    Resumes SLA countdown, calculates duration paused, and extends due_at accordingly.
    """
    if not grievance.is_paused or not grievance.paused_at:
        return False

    now = timezone.now()
    with transaction.atomic():
        duration_seconds = max(0, int((now - grievance.paused_at).total_seconds()))

        # Update active pause log
        active_pause = SLAPauseLog.objects.filter(grievance=grievance, resumed_at__isnull=True).first()
        if active_pause:
            active_pause.resumed_at = now
            active_pause.duration_seconds = duration_seconds
            active_pause.save(update_fields=['resumed_at', 'duration_seconds'])

        # Shift deadline forward by paused time
        if grievance.due_at:
            grievance.due_at = grievance.due_at + timedelta(seconds=duration_seconds)

        grievance.total_paused_seconds += duration_seconds
        grievance.is_paused = False
        grievance.resumed_at = now
        grievance.paused_at = None

        # Re-evaluate status
        if grievance.due_at and now >= grievance.due_at:
            grievance.sla_status = Grievance.SLAStatus.BREACHED
        else:
            grievance.sla_status = Grievance.SLAStatus.ACTIVE

        grievance.save(update_fields=[
            'due_at', 'total_paused_seconds', 'is_paused',
            'resumed_at', 'paused_at', 'sla_status'
        ])

        AuditLog.objects.create(
            actor=actor,
            action_type="SLA_RESUMED",
            resource_type="GRIEVANCE",
            resource_id=str(grievance.id),
            details={
                "complaint_number": grievance.complaint_number,
                "resumed_at": now.isoformat(),
                "paused_duration_seconds": duration_seconds,
                "new_due_at": grievance.due_at.isoformat() if grievance.due_at else None
            }
        )

    logger.info(f"SLA resumed for grievance {grievance.complaint_number} (extended by {duration_seconds}s)")
    return True


def evaluate_single_grievance_sla(grievance: Grievance, now: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Evaluates SLA state for an individual grievance.
    Detects warning, breach, and hierarchical escalation levels.
    Fully IDEMPOTENT: Never creates duplicate escalation or notification records.
    """
    now = now or timezone.now()
    result = {
        "grievance_id": str(grievance.id),
        "complaint_number": grievance.complaint_number,
        "old_status": grievance.sla_status,
        "new_status": grievance.sla_status,
        "warning_triggered": False,
        "breach_triggered": False,
        "escalations_created": []
    }

    # If resolved or closed, ensure SLA completed
    if grievance.status in [Grievance.Status.RESOLVED, Grievance.Status.CLOSED]:
        if grievance.sla_status not in [Grievance.SLAStatus.RESOLVED, Grievance.SLAStatus.CLOSED]:
            grievance.sla_status = Grievance.SLAStatus.RESOLVED
            grievance.save(update_fields=['sla_status'])
            result["new_status"] = Grievance.SLAStatus.RESOLVED
        return result

    # If paused, clock remains frozen
    if grievance.is_paused:
        return result

    # Ensure due_at exists
    if not grievance.due_at:
        apply_sla_to_grievance(grievance)

    policy = grievance.sla_policy or find_matching_sla_policy(grievance.priority, grievance.effective_category)
    warning_minutes = policy.warning_minutes if policy else 60
    escalation_interval_hours = policy.escalation_threshold_hours if policy else 2

    warning_threshold = grievance.due_at - timedelta(minutes=warning_minutes)

    # 1. SLA WARNING CHECK
    if warning_threshold <= now < grievance.due_at:
        if grievance.sla_status != Grievance.SLAStatus.WARNING:
            grievance.sla_status = Grievance.SLAStatus.WARNING
            grievance.save(update_fields=['sla_status'])
            result["new_status"] = Grievance.SLAStatus.WARNING
            result["warning_triggered"] = True

            # Notify assigned officer
            if grievance.assigned_officer:
                dispatch_notification(
                    recipient=grievance.assigned_officer,
                    title="⚠ SLA Warning Approaching",
                    message=f"Complaint #{grievance.complaint_number} is approaching its SLA deadline ({grievance.due_at.strftime('%H:%M %d-%b')}).",
                    notification_type="SLA_WARNING",
                    grievance_id=str(grievance.id)
                )

            AuditLog.objects.create(
                actor=None,
                action_type="SLA_WARNING",
                resource_type="GRIEVANCE",
                resource_id=str(grievance.id),
                details={
                    "complaint_number": grievance.complaint_number,
                    "due_at": grievance.due_at.isoformat(),
                    "warning_at": warning_threshold.isoformat()
                }
            )

    # 2. SLA BREACH & ESCALATION CHECK
    elif now >= grievance.due_at:
        if grievance.sla_status != Grievance.SLAStatus.BREACHED:
            grievance.sla_status = Grievance.SLAStatus.BREACHED
            if not grievance.breached_at:
                grievance.breached_at = grievance.due_at
            grievance.save(update_fields=['sla_status', 'breached_at'])
            result["new_status"] = Grievance.SLAStatus.BREACHED
            result["breach_triggered"] = True

            # Notify officer & consumer
            if grievance.assigned_officer:
                dispatch_notification(
                    recipient=grievance.assigned_officer,
                    title="🚨 SLA Breached",
                    message=f"Complaint #{grievance.complaint_number} has exceeded its resolution SLA target.",
                    notification_type="SLA_BREACH",
                    grievance_id=str(grievance.id)
                )
            if grievance.consumer:
                dispatch_notification(
                    recipient=grievance.consumer,
                    title="Complaint Update — Expedited Follow-up",
                    message=f"Resolution for Complaint #{grievance.complaint_number} is taking longer than expected. It has been prioritized for escalation.",
                    notification_type="CONSUMER_UPDATE",
                    grievance_id=str(grievance.id)
                )

            AuditLog.objects.create(
                actor=None,
                action_type="SLA_BREACHED",
                resource_type="GRIEVANCE",
                resource_id=str(grievance.id),
                details={
                    "complaint_number": grievance.complaint_number,
                    "breached_at": grievance.due_at.isoformat(),
                    "evaluated_at": now.isoformat()
                }
            )

        # 3. HIERARCHICAL UTILITY ESCALATION (Idempotent)
        overdue_seconds = (now - grievance.due_at).total_seconds()
        interval_seconds = escalation_interval_hours * 3600

        escalation_levels = [
            (SLAEscalation.Level.LEVEL_1, 0, "Junior Engineer / Section Officer", Grievance.EscalationLevel.LEVEL_1),
            (SLAEscalation.Level.LEVEL_2, interval_seconds, "Assistant Engineer / Sub-Division In-charge", Grievance.EscalationLevel.LEVEL_2),
            (SLAEscalation.Level.LEVEL_3, interval_seconds * 2, "Executive Engineer / Division Head", Grievance.EscalationLevel.LEVEL_3),
            (SLAEscalation.Level.LEVEL_4, interval_seconds * 3, "Superintending Engineer / Circle Officer", Grievance.EscalationLevel.LEVEL_4),
        ]

        for level_code, required_overdue, designation, grievance_level in escalation_levels:
            if overdue_seconds >= required_overdue:
                # Idempotency check: only create if record does not already exist
                if not SLAEscalation.objects.filter(grievance=grievance, escalation_level=level_code).exists():
                    esc = SLAEscalation.objects.create(
                        grievance=grievance,
                        escalation_level=level_code,
                        escalated_to_designation=designation,
                        reason=f"SLA breach exceeded by {int(overdue_seconds // 60)} minutes. Escalated to {designation}."
                    )
                    grievance.escalation_level = grievance_level
                    grievance.status = Grievance.Status.ESCALATED
                    grievance.save(update_fields=['escalation_level', 'status'])
                    result["escalations_created"].append(level_code)

                    # Send notification for escalation
                    if grievance.assigned_officer:
                        dispatch_notification(
                            recipient=grievance.assigned_officer,
                            title=f"Escalation: {level_code}",
                            message=f"Complaint #{grievance.complaint_number} escalated to {designation}.",
                            notification_type="SLA_ESCALATED",
                            grievance_id=str(grievance.id)
                        )

                    AuditLog.objects.create(
                        actor=None,
                        action_type="SLA_ESCALATED",
                        resource_type="GRIEVANCE",
                        resource_id=str(grievance.id),
                        details={
                            "complaint_number": grievance.complaint_number,
                            "level": level_code,
                            "designation": designation,
                            "reason": esc.reason
                        }
                    )
                    logger.info(f"Escalated complaint {grievance.complaint_number} to {level_code} ({designation})")

    return result


def process_all_active_sla(now: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Main batch processing function.
    Runs periodically (e.g. via management command `python manage.py process_sla`).
    Scans all active grievances, evaluates warning/breach states, applies idempotent escalations.
    """
    ensure_default_sla_policies()
    now = now or timezone.now()

    active_grievances = Grievance.objects.filter(
        status__in=[
            Grievance.Status.SUBMITTED,
            Grievance.Status.AI_CLASSIFIED,
            Grievance.Status.PENDING_ASSIGNMENT,
            Grievance.Status.ASSIGNED,
            Grievance.Status.IN_PROGRESS,
            Grievance.Status.REOPENED,
            Grievance.Status.ESCALATED
        ]
    ).select_related('sla_policy', 'assigned_officer', 'consumer', 'assigned_department', 'service_area')

    total_evaluated = 0
    warnings_marked = 0
    breaches_marked = 0
    escalations_created = 0

    for grievance in active_grievances:
        total_evaluated += 1
        eval_res = evaluate_single_grievance_sla(grievance, now=now)
        if eval_res["warning_triggered"]:
            warnings_marked += 1
        if eval_res["breach_triggered"]:
            breaches_marked += 1
        escalations_created += len(eval_res["escalations_created"])

    summary = {
        "timestamp": now.isoformat(),
        "total_active_evaluated": total_evaluated,
        "warnings_marked": warnings_marked,
        "breaches_marked": breaches_marked,
        "escalations_created": escalations_created
    }
    logger.info(f"SLA Processing Complete: {summary}")
    return summary


# Backwards compatibility alias
check_and_escalate_overdue_grievances = process_all_active_sla
