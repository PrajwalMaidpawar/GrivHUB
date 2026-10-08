import logging
from typing import Dict, Any, List, Optional
from django.db import models
from django.contrib.auth import get_user_model
from backend.apps.departments.models import Department, ServiceArea
from backend.apps.accounts.models import OfficerProfile
from backend.grievances.models import Grievance, GrievanceStatusHistory
from backend.apps.assignments.models import GrievanceAssignment
from backend.apps.assignments.services.recommendation_engine import recommend_officers_for_grievance
from backend.apps.audit.models import AuditLog

logger = logging.getLogger("grievancehub.routing")
User = get_user_model()

CATEGORY_DEPARTMENT_MAPPING = {
    Grievance.Category.POWER_OUTAGE: "POWER_SUPPLY",
    Grievance.Category.VOLTAGE_FLUCTUATION: "POWER_SUPPLY",
    Grievance.Category.METER_ISSUES: "METERING",
    Grievance.Category.BILLING_PAYMENT: "BILLING",
    Grievance.Category.TRANSFORMER_FAULT: "MAINTENANCE",
    Grievance.Category.HAZARD_WIRE_POLE: "EMERGENCY_SAFETY",
    Grievance.Category.NEW_CONNECTION: "COMMERCIAL",
    Grievance.Category.PUBLIC_INFRA: "MAINTENANCE",
    Grievance.Category.POWER_THEFT: "COMMERCIAL",
    Grievance.Category.GENERAL_SERVICES: "POWER_SUPPLY",
}

class RoutingService:
    def resolve_service_area(self, location: Optional[Dict[str, Any]]) -> Optional[ServiceArea]:
        if not isinstance(location, dict):
            return None
        pincode = str(location.get("pinCode") or location.get("pincode") or "").strip()
        substation = str(location.get("serviceArea") or location.get("substation_name") or "").strip()
        queryset = ServiceArea.objects.all()
        if pincode:
            queryset = queryset.filter(pincode=pincode)
        if substation:
            queryset = queryset.filter(substation_name__iexact=substation)
        return queryset.first()

    def route_grievance(self, grievance: Grievance, location: Optional[Dict[str, Any]] = None) -> Department:
        target_category = grievance.verified_category or grievance.predicted_category or grievance.provided_category
        dept_code = CATEGORY_DEPARTMENT_MAPPING.get(target_category, "POWER_SUPPLY")
        
        dept, _ = Department.objects.get_or_create(
            code=dept_code,
            defaults={"name": dept_code.replace('_', ' ').title(), "description": f"{dept_code} Department"}
        )
        grievance.assigned_department = dept
        updates = ['assigned_department']
        if location:
            service_area = self.resolve_service_area(location)
            if service_area:
                grievance.service_area = service_area
                updates.append('service_area')
        grievance.save(update_fields=updates)
        return dept

    def recommend_officer(self, grievance: Grievance) -> Optional[User]:
        if not grievance.assigned_department:
            self.route_grievance(grievance)

        recommendations = recommend_officers_for_grievance(grievance)
        eligible = [
            item for item in recommendations
            if item["availability_status"] == OfficerProfile.Status.AVAILABLE
            and item["active_workload"] < item["max_workload"]
        ]
        if not eligible:
            return None

        department_head_id = grievance.assigned_department.head_officer_id if grievance.assigned_department else None
        eligible.sort(
            key=lambda item: (
                item["officer_id"] != department_head_id,
                item["active_workload"] / max(1, item["max_workload"]),
                -item["recommendation_score"],
            )
        )
        return User.objects.get(id=eligible[0]["officer_id"])

    def assign_officer(self, grievance: Grievance, officer: User, assigned_by: Optional[User] = None, method: str = "AUTO_RECOMMENDED") -> GrievanceAssignment:
        grievance.assigned_officer = officer
        grievance.status = Grievance.Status.ASSIGNED
        grievance.save(update_fields=['assigned_officer', 'status'])
        
        assignment = GrievanceAssignment.objects.create(
            grievance=grievance,
            assigned_officer=officer,
            assigned_by=assigned_by,
            assignment_method=method
        )
        
        GrievanceStatusHistory.objects.create(
            grievance=grievance,
            from_status=Grievance.Status.PENDING_ASSIGNMENT,
            to_status=Grievance.Status.ASSIGNED,
            changed_by=assigned_by,
            remarks=f"Assigned to {officer.username} via {method}"
        )
        return assignment

_routing_service = RoutingService()

def get_routing_service() -> RoutingService:
    return _routing_service
