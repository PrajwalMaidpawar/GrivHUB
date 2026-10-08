from rest_framework import serializers
from backend.apps.sla.models import SLAPolicy, SLAEscalation, SLAPauseLog
from backend.grievances.models import Grievance


class SLAPolicySerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    service_area_name = serializers.CharField(source="service_area.name", read_only=True)

    class Meta:
        model = SLAPolicy
        fields = [
            "id",
            "name",
            "priority",
            "category",
            "department",
            "department_name",
            "service_area",
            "service_area_name",
            "target_minutes",
            "warning_minutes",
            "resolution_target_hours",
            "escalation_threshold_hours",
            "sla_clock_type",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SLAEscalationSerializer(serializers.ModelSerializer):
    complaint_number = serializers.CharField(source="grievance.complaint_number", read_only=True)
    grievance_title = serializers.CharField(source="grievance.title", read_only=True)
    priority = serializers.CharField(source="grievance.priority", read_only=True)
    assigned_officer = serializers.SerializerMethodField()

    class Meta:
        model = SLAEscalation
        fields = [
            "id",
            "grievance",
            "complaint_number",
            "grievance_title",
            "priority",
            "assigned_officer",
            "escalation_level",
            "escalated_to_designation",
            "reason",
            "escalated_at",
            "acknowledged",
            "acknowledged_at",
            "acknowledged_by",
        ]
        read_only_fields = ["id", "escalated_at"]

    def get_assigned_officer(self, obj):
        officer = obj.grievance.assigned_officer
        return officer.get_full_name() or officer.username if officer else "Unassigned"


class SLAGrievanceSerializer(serializers.ModelSerializer):
    policy_name = serializers.CharField(source="sla_policy.name", read_only=True)
    assigned_officer_name = serializers.SerializerMethodField()
    assigned_department_name = serializers.CharField(source="assigned_department.name", read_only=True)
    remaining_seconds = serializers.ReadOnlyField()
    is_breached = serializers.ReadOnlyField()
    is_warning = serializers.ReadOnlyField()
    escalation_display = serializers.ReadOnlyField()

    class Meta:
        model = Grievance
        fields = [
            "id",
            "complaint_number",
            "title",
            "priority",
            "status",
            "sla_status",
            "escalation_level",
            "escalation_display",
            "sla_policy",
            "policy_name",
            "due_at",
            "breached_at",
            "remaining_seconds",
            "is_breached",
            "is_warning",
            "is_paused",
            "pause_reason",
            "assigned_officer_name",
            "assigned_department_name",
            "consumer_number",
            "created_at",
        ]

    def get_assigned_officer_name(self, obj):
        return obj.assigned_officer.get_full_name() or obj.assigned_officer.username if obj.assigned_officer else None


class SLAPauseResumeSerializer(serializers.Serializer):
    reason_type = serializers.CharField(required=False, default="WAITING_FOR_CONSUMER")
    reason_notes = serializers.CharField(required=True)
