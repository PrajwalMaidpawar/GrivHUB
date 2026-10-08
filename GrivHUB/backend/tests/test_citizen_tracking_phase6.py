import pytest
from rest_framework.test import APIRequestFactory, force_authenticate

from backend.apps.accounts.models import User
from backend.apps.audit.models import AuditLog
from backend.grievances.models import Grievance, GrievanceStatusHistory
from backend.grievances.views import (
    citizen_confirm_resolution_view,
    citizen_reopen_view,
    grievance_comments_view,
    grievance_timeline_view,
    get_grievance_detail_view,
)


@pytest.mark.django_db
def test_citizen_can_track_confirm_and_reopen_resolved_complaint():
    citizen = User.objects.create_user(
        username="phase6_consumer",
        role=User.Role.CONSUMER,
        first_name="Asha",
        last_name="Kulkarni",
    )
    officer = User.objects.create_user(
        username="phase6_officer",
        role=User.Role.OFFICER,
    )
    grievance = Grievance.objects.create(
        complaint_number="MSED-PHASE6",
        consumer=citizen,
        title="Meter display blank",
        description="The meter display is not working.",
        consumer_number="270019284102",
        predicted_category=Grievance.Category.METER_ISSUES,
        priority=Grievance.Priority.HIGH,
        status=Grievance.Status.RESOLVED,
        assigned_officer=officer,
        resolution_summary="Meter display module replaced.",
        resolution_details="Tested display and confirmed consumption readings.",
        resolution_evidence=[{"filename": "meter-repair.jpg", "url": "https://example.test/meter-repair.jpg"}],
    )

    factory = APIRequestFactory()
    detail_request = factory.get("/detail")
    force_authenticate(detail_request, user=citizen)
    detail = get_grievance_detail_view(detail_request, grievance.id)
    assert detail.status_code == 200
    assert detail.data["resolution_summary"] == "Meter display module replaced."
    assert detail.data["resolution_evidence"]
    assert "sla" in detail.data

    timeline_request = factory.get("/timeline")
    force_authenticate(timeline_request, user=citizen)
    assert grievance_timeline_view(timeline_request, grievance.id).status_code == 200

    confirm_request = factory.post(
        "/confirm",
        {"citizen_rating": 5, "feedback_comments": "Supply and meter readings are normal now."},
        format="json",
    )
    force_authenticate(confirm_request, user=citizen)
    confirmed = citizen_confirm_resolution_view(confirm_request, grievance.id)
    assert confirmed.status_code == 200
    grievance.refresh_from_db()
    assert grievance.status == Grievance.Status.CLOSED
    assert grievance.citizen_rating == 5

    reopen_request = factory.post(
        "/reopen",
        {"reopen_reason": "The meter display has stopped working again after repair."},
        format="json",
    )
    force_authenticate(reopen_request, user=citizen)
    reopened = citizen_reopen_view(reopen_request, grievance.id)
    assert reopened.status_code == 200
    grievance.refresh_from_db()
    assert grievance.status == Grievance.Status.REOPENED
    assert GrievanceStatusHistory.objects.filter(grievance=grievance).count() == 2
    assert AuditLog.objects.filter(resource_id=str(grievance.id)).count() == 2

    comments_request = factory.get("/comments")
    force_authenticate(comments_request, user=citizen)
    comments = grievance_comments_view(comments_request, grievance.id)
    assert comments.status_code == 200
    assert len(comments.data["comments"]) == 2
