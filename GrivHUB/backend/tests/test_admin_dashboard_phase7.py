import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIRequestFactory

from backend.apps.accounts.models import User
from backend.apps.departments.models import Department
from backend.grievances.models import Grievance
from backend.analytics.views import analytics_overview_view


@pytest.mark.django_db
def test_admin_dashboard_uses_database_analytics():
    consumer = User.objects.create_user(username="phase7_consumer", role=User.Role.CONSUMER)
    department = Department.objects.create(code="POWER_SUPPLY", name="Power Supply Department")
    Grievance.objects.create(
        complaint_number="MSED-P7-1",
        consumer=consumer,
        title="Open outage",
        description="No supply",
        predicted_category=Grievance.Category.POWER_OUTAGE,
        priority=Grievance.Priority.CRITICAL,
        status=Grievance.Status.IN_PROGRESS,
        assigned_department=department,
        due_at=timezone.now() - timedelta(hours=1),
    )
    Grievance.objects.create(
        complaint_number="MSED-P7-2",
        consumer=consumer,
        title="Resolved meter",
        description="Meter repaired",
        predicted_category=Grievance.Category.METER_ISSUES,
        priority=Grievance.Priority.MEDIUM,
        status=Grievance.Status.RESOLVED,
        assigned_department=department,
    )

    response = analytics_overview_view(APIRequestFactory().get("/api/analytics/overview"))

    assert response.status_code == 200
    assert response.data["summary"] == {
        "total_grievances": 2,
        "pending": 0,
        "in_progress": 1,
        "resolved": 1,
        "critical": 1,
        "sla_breaches": 1,
    }
    assert response.data["by_category"][Grievance.Category.POWER_OUTAGE] == 1
    department_stats = next(iter(response.data["by_department"].values()))
    assert department_stats["code"] == "POWER_SUPPLY"
    assert department_stats["active"] == 1
    assert department_stats["resolved"] == 1
    assert response.data["monthly_trends"]
