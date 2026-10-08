from django.db import models
from django.conf import settings
from backend.grievances.models import Grievance
from backend.apps.departments.models import Department, ServiceArea

class SLAPolicy(models.Model):
    class ClockType(models.TextChoices):
        CONTINUOUS_24H = "24_HOURS", "24/7 Continuous Utility Clock"
        BUSINESS_HOURS = "BUSINESS_HOURS", "Business Hours (09:00 - 18:00)"

    name = models.CharField(max_length=150, default="Standard SLA Policy")
    priority = models.CharField(max_length=20, choices=Grievance.Priority.choices)
    category = models.CharField(max_length=100, blank=True, null=True, choices=Grievance.Category.choices)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="sla_policies")
    service_area = models.ForeignKey(ServiceArea, on_delete=models.SET_NULL, null=True, blank=True, related_name="sla_policies")

    # Duration thresholds in minutes
    target_minutes = models.IntegerField(default=1440, help_text="Target resolution time in minutes")
    warning_minutes = models.IntegerField(default=120, help_text="Warning threshold before deadline in minutes")

    # Compatibility hours fields
    resolution_target_hours = models.IntegerField(default=24, help_text="Target hours to resolve complaint")
    escalation_threshold_hours = models.IntegerField(default=2, help_text="Hours after breach before next escalation level")

    sla_clock_type = models.CharField(max_length=30, choices=ClockType.choices, default=ClockType.CONTINUOUS_24H)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["priority", "-target_minutes"]
        verbose_name = "SLA Policy"
        verbose_name_plural = "SLA Policies"

    def save(self, *args, **kwargs):
        if self.target_minutes and not self.resolution_target_hours:
            self.resolution_target_hours = max(1, self.target_minutes // 60)
        elif self.resolution_target_hours and not self.target_minutes:
            self.target_minutes = self.resolution_target_hours * 60
        super().save(*args, **kwargs)

    def __str__(self):
        cat_str = f" [{self.category}]" if self.category else ""
        dept_str = f" ({self.department.code})" if self.department else ""
        return f"{self.name}: {self.priority}{cat_str}{dept_str} - {self.target_minutes}m target, {self.warning_minutes}m warning"


class SLAEscalation(models.Model):
    class Level(models.TextChoices):
        LEVEL_1 = "LEVEL_1", "Level 1 — Section / Junior Engineer"
        LEVEL_2 = "LEVEL_2", "Level 2 — Assistant Engineer / Sub-Division"
        LEVEL_3 = "LEVEL_3", "Level 3 — Executive Engineer / Division"
        LEVEL_4 = "LEVEL_4", "Level 4 — Superintending Engineer / Circle"

    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name="escalations")
    escalation_level = models.CharField(max_length=20, choices=Level.choices, default=Level.LEVEL_1)
    reason = models.TextField()
    escalated_to_designation = models.CharField(max_length=100, default="Junior Engineer")
    escalated_at = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(blank=True, null=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_escalations"
    )

    class Meta:
        ordering = ["-escalated_at"]
        constraints = [
            models.UniqueConstraint(fields=["grievance", "escalation_level"], name="unique_grievance_escalation_level")
        ]

    def __str__(self):
        return f"{self.grievance.complaint_number} escalated to {self.escalation_level} ({self.escalated_to_designation})"


class SLAPauseLog(models.Model):
    class PauseReason(models.TextChoices):
        WAITING_FOR_CONSUMER = "WAITING_FOR_CONSUMER", "Waiting for Consumer Input / Premises Access"
        PARTS_PROCUREMENT = "PARTS_PROCUREMENT", "Spare Parts / Transformer Procurement in Transit"
        SAFETY_CLEARANCE = "SAFETY_CLEARANCE", "Awaiting Safety / Civil Clearance"
        SCHEDULED_SHUTDOWN = "SCHEDULED_SHUTDOWN", "Scheduled Maintenance Window Coordination"
        OTHER = "OTHER", "Other Legitimate Administrative Reason"

    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name="sla_pauses")
    paused_at = models.DateTimeField(auto_now_add=True)
    resumed_at = models.DateTimeField(blank=True, null=True)
    reason_type = models.CharField(max_length=50, choices=PauseReason.choices, default=PauseReason.WAITING_FOR_CONSUMER)
    reason_notes = models.TextField()
    paused_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="initiated_sla_pauses"
    )
    duration_seconds = models.IntegerField(default=0)

    class Meta:
        ordering = ["-paused_at"]

    def __str__(self):
        status = "Active" if not self.resumed_at else f"Closed ({self.duration_seconds}s)"
        return f"Pause for {self.grievance.complaint_number}: {self.reason_type} ({status})"
