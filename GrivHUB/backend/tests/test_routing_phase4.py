import pytest

from backend.apps.accounts.models import OfficerProfile
from backend.apps.departments.models import Department, ServiceArea
from backend.grievances.models import Grievance
from backend.grievances.services.routing_service import get_routing_service
from django.contrib.auth import get_user_model


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("category", "department_code"),
    [
        (Grievance.Category.POWER_OUTAGE, "POWER_SUPPLY"),
        (Grievance.Category.METER_ISSUES, "METERING"),
        (Grievance.Category.BILLING_PAYMENT, "BILLING"),
        (Grievance.Category.TRANSFORMER_FAULT, "MAINTENANCE"),
        (Grievance.Category.HAZARD_WIRE_POLE, "EMERGENCY_SAFETY"),
    ],
)
def test_msedcl_category_routes_to_department_and_available_officer(category, department_code):
    user_model = get_user_model()
    consumer = user_model.objects.create_user(
        username=f"consumer_{department_code.lower()}",
        role=user_model.Role.CONSUMER,
    )
    officer = user_model.objects.create_user(
        username=f"officer_{department_code.lower()}",
        first_name="Demo",
        last_name="Engineer",
        role=user_model.Role.OFFICER,
        is_verified=True,
    )
    profile = OfficerProfile.objects.create(
        user=officer,
        employee_id=f"EMP-{department_code}",
        availability_status=OfficerProfile.Status.AVAILABLE,
        approval_status=OfficerProfile.ApprovalStatus.APPROVED,
        max_active_workload=3,
    )
    department = Department.objects.create(
        code=department_code,
        name=f"{department_code} Department",
        head_officer=officer,
    )
    service_area = ServiceArea.objects.create(
        circle_name="Pune Urban Circle",
        division_name="Shivajinagar Division",
        substation_name="Shivajinagar 33kV Substation",
        pincode="411005",
    )
    grievance = Grievance.objects.create(
        complaint_number=f"MSED-{department_code}",
        consumer=consumer,
        title="Demo electricity complaint",
        description="Demo complaint for routing verification",
        predicted_category=category,
        status=Grievance.Status.PENDING_ASSIGNMENT,
    )

    router = get_routing_service()
    routed_department = router.route_grievance(
        grievance,
        {"serviceArea": service_area.substation_name, "pinCode": service_area.pincode},
    )
    selected_officer = router.recommend_officer(grievance)
    router.assign_officer(grievance, selected_officer)
    grievance.refresh_from_db()

    assert routed_department.code == department_code
    assert grievance.assigned_department_id == department.id
    assert grievance.service_area_id == service_area.id
    assert selected_officer.id == officer.id
    assert grievance.assigned_officer_id == officer.id
    assert grievance.status == Grievance.Status.ASSIGNED
