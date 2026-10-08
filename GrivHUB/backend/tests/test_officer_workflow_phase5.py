import pytest
from rest_framework.test import APIRequestFactory, force_authenticate

from backend.apps.accounts.models import OfficerProfile, User
from backend.grievances.models import Grievance, GrievanceStatusHistory
from backend.grievances.views import (
    officer_progress_update_view,
    officer_start_work_view,
    officer_submit_resolution_view,
    submit_grievance_view,
)
from backend.apps.audit.models import AuditLog


@pytest.mark.django_db
def test_submitted_complaint_completes_officer_workflow():
    consumer = User.objects.create_user(
        username="phase5_consumer",
        role=User.Role.CONSUMER,
        first_name="Rajesh",
        last_name="Patil",
    )
    officer = User.objects.create_user(
        username="phase5_officer",
        role=User.Role.OFFICER,
        first_name="Sanjay",
        last_name="Deshmukh",
    )
    OfficerProfile.objects.create(
        user=officer,
        employee_id="PHASE5-001",
        availability_status=OfficerProfile.Status.AVAILABLE,
        max_active_workload=10,
    )

    factory = APIRequestFactory()
    submit_request = factory.post(
        "/api/grievances",
        {
            "title": "Power outage in Shivajinagar",
            "description": "No electricity supply since two hours.",
            "consumer_number": "270019284102",
            "location": {
                "region": "Pune Region",
                "division": "Shivajinagar Division",
                "serviceArea": "Shivajinagar 33kV Substation",
                "pinCode": "411005",
            },
        },
        format="json",
    )
    force_authenticate(submit_request, user=consumer)
    submitted = submit_grievance_view(submit_request)
    assert submitted.status_code == 201
    grievance = Grievance.objects.get(complaint_number=submitted.data["complaint_number"])
    grievance.assigned_officer = officer
    grievance.status = Grievance.Status.ASSIGNED
    grievance.save(update_fields=["assigned_officer", "status", "updated_at"])

    start_request = factory.post("/start", {"notes": "Crew dispatched for field inspection."}, format="json")
    force_authenticate(start_request, user=officer)
    started = officer_start_work_view(start_request, grievance.id)
    assert started.status_code == 200
    assert started.data["status"] == Grievance.Status.IN_PROGRESS

    progress_request = factory.post(
        "/progress",
        {
            "progress_stage": "SITE_INSPECTION_COMPLETED",
            "progress_note": "Fault located at the local feeder.",
            "attachments": [{"filename": "inspection.jpg", "url": "https://example.test/inspection.jpg"}],
        },
        format="json",
    )
    force_authenticate(progress_request, user=officer)
    progressed = officer_progress_update_view(progress_request, grievance.id)
    assert progressed.status_code == 200
    assert len(progressed.data["grievance"]["progress_updates"]) == 2

    resolve_request = factory.post(
        "/resolve",
        {
            "resolution_summary": "Feeder fault repaired and supply restored.",
            "resolution_details": "Replaced the damaged feeder fuse and verified voltage.",
            "resolution_images": [{"filename": "repair.jpg", "url": "https://example.test/repair.jpg"}],
        },
        format="json",
    )
    force_authenticate(resolve_request, user=officer)
    resolved = officer_submit_resolution_view(resolve_request, grievance.id)
    assert resolved.status_code == 200

    grievance.refresh_from_db()
    assert grievance.status == Grievance.Status.RESOLVED
    assert grievance.resolution_summary.startswith("Feeder fault")
    assert grievance.resolution_evidence
    assert GrievanceStatusHistory.objects.filter(
        grievance=grievance,
        to_status__in=[Grievance.Status.IN_PROGRESS, Grievance.Status.RESOLVED],
    ).count() == 3
    assert AuditLog.objects.filter(resource_id=str(grievance.id), action_type__startswith="OFFICER_").count() == 3
