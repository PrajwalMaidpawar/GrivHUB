import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from backend.grievances.models import Grievance

User = get_user_model()

@pytest.mark.django_db
def test_submit_grievance_and_ml_classification(client):
    user = User.objects.create_user(username="consumer_test", password="password123", role=User.Role.CONSUMER)
    client.login(username="consumer_test", password="password123")

    payload = {
        "title": "No electricity in entire colony since evening",
        "description": "Feeder tripped near Shivajinagar substation after heavy rain. Over 50 houses affected with zero power supply.",
        "location_address": "Shivajinagar Colony, Lane 4, Pune 411005"
    }
    response = client.post("/api/grievances/", data=payload, content_type="application/json")
    assert response.status_code == status.HTTP_201_CREATED
    assert "grievance_id" in response.data
    assert "complaint_number" in response.data
    assert response.data["predicted_category"] is not None


@pytest.mark.django_db
def test_grievance_detail_and_status_update(client):
    user = User.objects.create_user(username="consumer_test", password="password123", role=User.Role.CONSUMER)
    client.force_login(user)
    grievance = Grievance.objects.create(
        complaint_number="MSED-TEST-99",
        consumer=user,
        title="Meter display error code",
        description="Smart meter displaying error code ERR-05",
        status=Grievance.Status.SUBMITTED
    )

    response = client.get(f"/api/grievances/{grievance.id}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["complaint_number"] == "MSED-TEST-99"

    admin = User.objects.create_user(username="admin_test", password="password123", role=User.Role.ADMIN)
    client.force_login(admin)
    patch_resp = client.patch(f"/api/grievances/{grievance.id}/", data={"status": "IN_PROGRESS"}, content_type="application/json")
    assert patch_resp.status_code == status.HTTP_200_OK
    grievance.refresh_from_db()
    assert grievance.status == Grievance.Status.IN_PROGRESS
