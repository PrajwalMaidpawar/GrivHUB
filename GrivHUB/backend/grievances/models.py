import uuid
from django.db import models
from django.conf import settings
from backend.apps.departments.models import Department, ServiceArea, ElectricalAsset

class Grievance(models.Model):
    class Category(models.TextChoices):
        POWER_OUTAGE = "Power Outage / No Supply", "Power Outage / No Supply"
        VOLTAGE_FLUCTUATION = "Voltage Fluctuation / Low Voltage", "Voltage Fluctuation / Low Voltage"
        METER_ISSUES = "Meter Issues", "Meter Issues"
        BILLING_PAYMENT = "Billing and Payment", "Billing and Payment"
        TRANSFORMER_FAULT = "Transformer Fault", "Transformer Fault"
        HAZARD_WIRE_POLE = "Pole / Wire / Electrical Hazard", "Pole / Wire / Electrical Hazard"
        NEW_CONNECTION = "New Connection / Service Request", "New Connection / Service Request"
        PUBLIC_INFRA = "Street/Public Electrical Infrastructure", "Street/Public Electrical Infrastructure"
        POWER_THEFT = "Power Theft / Unauthorized Connection", "Power Theft / Unauthorized Connection"
        GENERAL_SERVICES = "General Consumer Services", "General Consumer Services"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical Safety Hazard"

    class PrioritySource(models.TextChoices):
        ML = "ML", "Machine Learning Model"
        RULE_BASED = "RULE_BASED", "Safety Rule Engine"
        MANUAL = "MANUAL", "Human Officer Override"

    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        AI_CLASSIFIED = "AI_CLASSIFIED", "AI Classified"
        PENDING_ASSIGNMENT = "PENDING_ASSIGNMENT", "Pending Assignment"
        ASSIGNED = "ASSIGNED", "Assigned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"
        REOPENED = "REOPENED", "Reopened"
        ESCALATED = "ESCALATED", "Escalated"
        CANCELLED = "CANCELLED", "Cancelled"

    class RiskLevel(models.TextChoices):
        NONE = "NONE", "No Immediate Hazard"
        LOW = "LOW", "Low Risk"
        HIGH = "HIGH", "High Risk"
        CRITICAL_HAZARD = "CRITICAL_HAZARD", "Critical Electrical Hazard (Live Wire / Sparking)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint_number = models.CharField(max_length=50, unique=True, db_index=True)
    consumer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="grievances")
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    consumer_number = models.CharField(max_length=32, blank=True, null=True, db_index=True)
    attachments = models.JSONField(default=list, blank=True)
    location = models.JSONField(default=dict, blank=True)
    progress_updates = models.JSONField(default=list, blank=True)
    resolution_summary = models.TextField(blank=True, null=True)
    resolution_details = models.TextField(blank=True, null=True)
    resolution_evidence = models.JSONField(default=list, blank=True)
    citizen_rating = models.PositiveSmallIntegerField(blank=True, null=True)
    citizen_feedback = models.TextField(blank=True, null=True)
    reopen_reason = models.TextField(blank=True, null=True)
    
    provided_category = models.CharField(max_length=100, blank=True, null=True, help_text="Category selected by consumer (optional)")
    predicted_category = models.CharField(max_length=100, choices=Category.choices, blank=True, null=True, help_text="AI Predicted Category")
    verified_category = models.CharField(max_length=100, choices=Category.choices, blank=True, null=True, help_text="Human verified Category")
    
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    priority_source = models.CharField(max_length=20, choices=PrioritySource.choices, default=PrioritySource.RULE_BASED)
    
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.SUBMITTED, db_index=True)
    safety_risk_level = models.CharField(max_length=30, choices=RiskLevel.choices, default=RiskLevel.NONE)
    
    location_address = models.TextField(blank=True, null=True)
    service_area = models.ForeignKey(ServiceArea, on_delete=models.SET_NULL, null=True, blank=True, related_name="grievances")
    asset = models.ForeignKey(ElectricalAsset, on_delete=models.SET_NULL, null=True, blank=True, related_name="grievances")
    
    assigned_department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="grievances")
    assigned_officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_grievances")
    
    class SLAStatus(models.TextChoices):
        NOT_STARTED = "NOT_STARTED", "Not Started"
        ACTIVE = "ACTIVE", "Active / Within SLA"
        WARNING = "WARNING", "SLA Warning"
        BREACHED = "BREACHED", "SLA Breached"
        PAUSED = "PAUSED", "SLA Clock Paused"
        RESOLVED = "RESOLVED", "Resolved Within SLA"
        CLOSED = "CLOSED", "Closed"

    class EscalationLevel(models.TextChoices):
        NONE = "NONE", "Normal Operational Handling"
        LEVEL_1 = "LEVEL_1", "Level 1 — Section / Junior Engineer"
        LEVEL_2 = "LEVEL_2", "Level 2 — Assistant Engineer / Sub-Division"
        LEVEL_3 = "LEVEL_3", "Level 3 — Executive Engineer / Division"
        LEVEL_4 = "LEVEL_4", "Level 4 — Superintending Engineer / Circle"

    model_version = models.CharField(max_length=50, default="1.0.0")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_at = models.DateTimeField(blank=True, null=True, db_index=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    closed_at = models.DateTimeField(blank=True, null=True)

    # Real MSEDCL SLA Engine Tracking
    sla_policy = models.ForeignKey("sla.SLAPolicy", on_delete=models.SET_NULL, null=True, blank=True, related_name="grievances")
    sla_status = models.CharField(max_length=30, choices=SLAStatus.choices, default=SLAStatus.ACTIVE, db_index=True)
    escalation_level = models.CharField(max_length=30, choices=EscalationLevel.choices, default=EscalationLevel.NONE, db_index=True)
    breached_at = models.DateTimeField(blank=True, null=True, db_index=True)
    is_paused = models.BooleanField(default=False)
    paused_at = models.DateTimeField(blank=True, null=True)
    resumed_at = models.DateTimeField(blank=True, null=True)
    pause_reason = models.TextField(blank=True, null=True)
    paused_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="paused_grievances")
    total_paused_seconds = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.complaint_number} - {self.title[:30]} ({self.status})"

    @property
    def effective_category(self):
        return self.verified_category or self.predicted_category or self.provided_category or "General Consumer Services"

    @property
    def remaining_seconds(self):
        from django.utils import timezone
        if self.status in [self.Status.RESOLVED, self.Status.CLOSED] or not self.due_at:
            return 0
        diff = (self.due_at - timezone.now()).total_seconds()
        return int(diff)

    @property
    def is_breached(self):
        from django.utils import timezone
        if self.status in [self.Status.RESOLVED, self.Status.CLOSED]:
            return bool(self.breached_at)
        if not self.due_at:
            return False
        return timezone.now() > self.due_at

    @property
    def is_warning(self):
        return self.sla_status == self.SLAStatus.WARNING

    @property
    def escalation_display(self):
        return self.get_escalation_level_display() if hasattr(self, 'get_escalation_level_display') else str(self.escalation_level)


class GrievanceStatusHistory(models.Model):
    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name="history")
    from_status = models.CharField(max_length=30, choices=Grievance.Status.choices, blank=True, null=True)
    to_status = models.CharField(max_length=30, choices=Grievance.Status.choices)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    remarks = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.grievance.complaint_number}: {self.from_status} -> {self.to_status}"


class ComplaintUpdate(models.Model):
    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name="updates")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_internal_note = models.BooleanField(default=False)
    update_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Update on {self.grievance.complaint_number} by {self.author.username}"
