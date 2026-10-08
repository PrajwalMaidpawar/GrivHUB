"""
GrievanceHUB Part G Comprehensive Test Suite: 30 Tests
Authentication (1-18) + MSEDCL SLA Engine (19-30)
"""

import pytest
import uuid
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import identify_hasher
from rest_framework import status
from rest_framework.test import APIClient

from backend.apps.accounts.models import ConsumerProfile, OfficerProfile, AccountVerificationCode
from backend.apps.sla.models import SLAPolicy, SLAEscalation, SLAPauseLog
from backend.apps.sla.services.sla_engine import (
    ensure_default_sla_policies,
    find_matching_sla_policy,
    calculate_due_date,
    apply_sla_to_grievance,
    evaluate_single_grievance_sla,
    process_all_active_sla,
    pause_grievance_sla,
    resume_grievance_sla,
)
from backend.grievances.models import Grievance
from backend.apps.audit.models import AuditLog

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def setup_policies():
    ensure_default_sla_policies()
    return SLAPolicy.objects.filter(active=True)


# ============================================================================
# PART G: AUTHENTICATION TESTS (1 - 18)
# ============================================================================

@pytest.mark.django_db
class TestPartGAuthentication:

    def test_01_consumer_registration(self, api_client):
        """1. Consumer registration with 12-digit consumer number"""
        payload = {
            "full_name": "Ramesh Kulkarni",
            "email": "ramesh.k@example.com",
            "mobile_number": "9822001122",
            "consumer_number": "123456789012",
            "password": "MsedclPassword@2026",
            "confirm_password": "MsedclPassword@2026",
            "billing_address": "Shivajinagar, Pune"
        }
        res = api_client.post("/api/auth/register/", data=payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["requires_verification"] is True

        user = User.objects.get(email="ramesh.k@example.com")
        assert user.is_verified is False
        assert user.consumer_profile.consumer_number == "123456789012"
        # Password securely hashed
        assert identify_hasher(user.password) is not None
        assert not user.password.startswith("MsedclPassword")

    def test_02_duplicate_email(self, api_client):
        """2. Duplicate email rejected"""
        User.objects.create_user(
            username="existing_u1",
            email="dup.email@example.com",
            password="Password@123",
            role=User.Role.CONSUMER
        )
        payload = {
            "full_name": "Another User",
            "email": "dup.email@example.com",
            "mobile_number": "9822998877",
            "consumer_number": "999888777666",
            "password": "Password@12345",
            "confirm_password": "Password@12345"
        }
        res = api_client.post("/api/auth/register/", data=payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in res.data

    def test_03_duplicate_mobile(self, api_client):
        """3. Duplicate mobile rejected"""
        User.objects.create_user(
            username="existing_u2",
            email="u2@example.com",
            phone_number="9876543210",
            password="Password@123",
            role=User.Role.CONSUMER
        )
        payload = {
            "full_name": "Mobile Duplicate",
            "email": "new.email@example.com",
            "mobile_number": "9876543210",
            "consumer_number": "555444333222",
            "password": "Password@12345",
            "confirm_password": "Password@12345"
        }
        res = api_client.post("/api/auth/register/", data=payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_04_duplicate_consumer_number(self, api_client):
        """4. Duplicate 12-digit consumer number rejected"""
        u = User.objects.create_user(
            username="existing_u3",
            email="u3@example.com",
            password="Password@123",
            role=User.Role.CONSUMER
        )
        ConsumerProfile.objects.create(user=u, consumer_number="111222333444")

        payload = {
            "full_name": "Consumer Number Duplicate",
            "email": "fresh.email@example.com",
            "mobile_number": "9811223344",
            "consumer_number": "111222333444",
            "password": "Password@12345",
            "confirm_password": "Password@12345"
        }
        res = api_client.post("/api/auth/register/", data=payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "consumer_number" in res.data

    def test_05_weak_password(self, api_client):
        """5. Weak password rejected by validators"""
        payload = {
            "full_name": "Weak Pass User",
            "email": "weak@example.com",
            "mobile_number": "9833445566",
            "consumer_number": "777888999000",
            "password": "123",
            "confirm_password": "123"
        }
        res = api_client.post("/api/auth/register/", data=payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_06_password_mismatch(self, api_client):
        """6. Password confirmation mismatch rejected"""
        payload = {
            "full_name": "Mismatch User",
            "email": "mismatch@example.com",
            "mobile_number": "9844556677",
            "consumer_number": "444555666777",
            "password": "ValidPassword@2026",
            "confirm_password": "DifferentPassword@2026"
        }
        res = api_client.post("/api/auth/register/", data=payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_07_verification(self, api_client):
        """7. Account verification with valid OTP activates account"""
        user = User.objects.create_user(
            username="verify_user",
            email="verify@example.com",
            password="Password@12345",
            is_active=False,
            is_verified=False,
            role=User.Role.CONSUMER
        )
        raw_code = AccountVerificationCode.generate_code(user, purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT)
        res = api_client.post("/api/auth/verify/", data={"identifier": user.email, "code": raw_code}, format="json")
        assert res.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.is_verified is True
        assert user.is_active is True

    def test_08_expired_otp(self, api_client):
        """8. Expired OTP is rejected"""
        user = User.objects.create_user(
            username="expired_otp_u",
            email="expired@example.com",
            password="Password@12345",
            is_active=False,
            is_verified=False
        )
        AccountVerificationCode.objects.create(
            user=user,
            code_hash="112233",
            purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT,
            expires_at=timezone.now() - timedelta(minutes=1)
        )
        res = api_client.post("/api/auth/verify/", data={"identifier": user.email, "code": "112233"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_09_invalid_otp(self, api_client):
        """9. Invalid OTP code is rejected"""
        user = User.objects.create_user(
            username="invalid_otp_u",
            email="invalid_otp@example.com",
            password="Password@12345",
            is_active=False,
            is_verified=False
        )
        AccountVerificationCode.objects.create(
            user=user,
            code_hash="654321",
            purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT,
            expires_at=timezone.now() + timedelta(minutes=15)
        )
        res = api_client.post("/api/auth/verify/", data={"identifier": user.email, "code": "000000"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_10_otp_attempt_limit(self, api_client):
        """10. OTP attempt limit enforces lockout after max attempts"""
        user = User.objects.create_user(
            username="attempt_limit_u",
            email="attempt_limit@example.com",
            password="Password@12345",
            is_active=False,
            is_verified=False
        )
        AccountVerificationCode.objects.create(
            user=user,
            code_hash="123456",
            purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT,
            attempts=5,
            expires_at=timezone.now() + timedelta(minutes=15)
        )
        res = api_client.post("/api/auth/verify/", data={"identifier": user.email, "code": "123456"}, format="json")
        assert res.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_429_TOO_MANY_REQUESTS]

    def test_11_login(self, api_client):
        """11. Login with verified account returns safe user payload without secrets"""
        user = User.objects.create_user(
            username="login_u",
            email="login_u@example.com",
            password="SecretPassword@2026",
            is_active=True,
            is_verified=True,
            role=User.Role.CONSUMER
        )
        res = api_client.post("/api/auth/login/", data={"identifier": user.email, "password": "SecretPassword@2026"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        data = res.data
        user_info = data.get("user", {})
        assert user_info["email"] == "login_u@example.com"
        assert user_info["role"] == "CONSUMER"
        assert "password" not in user_info
        assert "password_hash" not in user_info

    def test_12_invalid_password(self, api_client):
        """12. Invalid password returns error"""
        user = User.objects.create_user(
            username="bad_pwd_u",
            email="bad_pwd@example.com",
            password="CorrectPassword@1",
            is_active=True,
            is_verified=True
        )
        res = api_client.post("/api/auth/login/", data={"identifier": user.email, "password": "WrongPassword"}, format="json")
        assert res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST]

    def test_13_unverified_login(self, api_client):
        """13. Unverified consumer login requires verification"""
        user = User.objects.create_user(
            username="unverified_login_u",
            email="unverified_login@example.com",
            password="SecretPassword@2026",
            is_active=False,
            is_verified=False,
            role=User.Role.CONSUMER
        )
        res = api_client.post("/api/auth/login/", data={"identifier": user.email, "password": "SecretPassword@2026"}, format="json")
        assert res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_14_logout(self, api_client):
        """14. Logout clears session / authentication"""
        user = User.objects.create_user(
            username="logout_u",
            email="logout_u@example.com",
            password="Password@123",
            is_active=True,
            is_verified=True
        )
        api_client.force_authenticate(user=user)
        res = api_client.post("/api/auth/logout/")
        assert res.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]

    def test_15_protected_consumer_route(self, api_client):
        """15. Protected grievance endpoints require authentication"""
        api_client.logout()
        res = api_client.get("/api/grievances/")
        assert res.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_16_officer_route_protection(self, api_client):
        """16. Officer-only endpoints reject consumers"""
        consumer = User.objects.create_user(
            username="cons_for_officer_route",
            email="cons_officer@example.com",
            password="Password@123",
            role=User.Role.CONSUMER,
            is_active=True,
            is_verified=True
        )
        api_client.force_authenticate(user=consumer)
        # Attempt to pause SLA
        fake_id = uuid.uuid4()
        res = api_client.post(f"/api/sla/grievances/{fake_id}/pause/", data={"reason": "WAITING_FOR_CONSUMER"}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_17_admin_route_protection(self, api_client):
        """17. Admin-only SLA policy modification rejected for non-admins"""
        officer = User.objects.create_user(
            username="off_for_admin_route",
            email="off_admin@example.com",
            password="Password@123",
            role=User.Role.OFFICER,
            is_active=True,
            is_verified=True
        )
        api_client.force_authenticate(user=officer)
        res = api_client.post("/api/sla/policies/", data={"name": "Illegal Policy", "target_minutes": 60}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_18_consumer_cannot_access_another_consumer_grievance(self, api_client):
        """18. Consumer A cannot access Consumer B's grievance"""
        c1 = User.objects.create_user(
            username="consumer_a",
            email="ca@example.com",
            password="Password@123",
            role=User.Role.CONSUMER,
            is_active=True,
            is_verified=True
        )
        c2 = User.objects.create_user(
            username="consumer_b",
            email="cb@example.com",
            password="Password@123",
            role=User.Role.CONSUMER,
            is_active=True,
            is_verified=True
        )
        g_c1 = Grievance.objects.create(
            complaint_number="GH-2026-TEST-001",
            title="Consumer A Fault",
            description="Private grievance of consumer A",
            consumer=c1,
            status=Grievance.Status.SUBMITTED
        )
        # Authenticate as Consumer B
        api_client.force_authenticate(user=c2)
        res = api_client.get(f"/api/grievances/{g_c1.id}/")
        assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]


# ============================================================================
# PART G: MSEDCL SLA ENGINE TESTS (19 - 30)
# ============================================================================

@pytest.mark.django_db
class TestPartGMSDCLSLAEngine:

    def test_19_correct_sla_policy_selected(self, setup_policies):
        """19. Priority + Category policy matching selects correct policy"""
        pol_critical = find_matching_sla_policy(Grievance.Priority.CRITICAL, Grievance.Category.HAZARD_WIRE_POLE)
        assert pol_critical.target_minutes == 120
        assert pol_critical.priority == Grievance.Priority.CRITICAL

        pol_high = find_matching_sla_policy(Grievance.Priority.HIGH, Grievance.Category.POWER_OUTAGE)
        assert pol_high.target_minutes == 480
        assert pol_high.priority == Grievance.Priority.HIGH

    def test_20_due_date_generated(self, setup_policies):
        """20. Grievance creation calculates SLA due date correctly"""
        consumer = User.objects.create_user(
            username="sla_due_u",
            email="sla_due@example.com",
            password="Password@123",
            role=User.Role.CONSUMER
        )
        g = Grievance.objects.create(
            complaint_number="GH-2026-TEST-002",
            title="Outage Complaint",
            description="Power cut since 2 hours",
            consumer=consumer,
            priority=Grievance.Priority.HIGH,
            predicted_category=Grievance.Category.POWER_OUTAGE,
            status=Grievance.Status.ASSIGNED
        )
        applied = apply_sla_to_grievance(g)
        assert applied.due_at is not None
        assert applied.sla_status == Grievance.SLAStatus.ACTIVE
        expected_due = g.created_at + timedelta(minutes=applied.sla_policy.target_minutes)
        diff_sec = abs((applied.due_at - expected_due).total_seconds())
        assert diff_sec < 5

    def test_21_warning_state_generated(self, setup_policies):
        """21. SLA status transitions to WARNING when remaining time <= warning_minutes"""
        consumer = User.objects.create_user(
            username="sla_warn_u",
            email="sla_warn@example.com",
            password="Password@123"
        )
        g = Grievance.objects.create(
            complaint_number="GH-2026-TEST-003",
            title="Near Due Complaint",
            description="Transformer noise",
            consumer=consumer,
            priority=Grievance.Priority.HIGH,
            status=Grievance.Status.IN_PROGRESS
        )
        apply_sla_to_grievance(g)
        g.due_at = timezone.now() + timedelta(minutes=30)
        g.save()

        res = evaluate_single_grievance_sla(g)
        assert res["warning_triggered"] is True
        g.refresh_from_db()
        assert g.sla_status == Grievance.SLAStatus.WARNING

    def test_22_breach_state_generated(self, setup_policies):
        """22. SLA status transitions to BREACHED when past due deadline"""
        consumer = User.objects.create_user(
            username="sla_breach_u",
            email="sla_breach@example.com",
            password="Password@123"
        )
        g = Grievance.objects.create(
            complaint_number="GH-2026-TEST-004",
            title="Overdue Complaint",
            description="Transformer blown",
            consumer=consumer,
            priority=Grievance.Priority.HIGH,
            status=Grievance.Status.IN_PROGRESS
        )
        apply_sla_to_grievance(g)
        g.due_at = timezone.now() - timedelta(hours=1)
        g.save()

        res = evaluate_single_grievance_sla(g)
        assert res["breach_triggered"] is True
        g.refresh_from_db()
        assert g.sla_status == Grievance.SLAStatus.BREACHED
        assert g.breached_at is not None

    def test_23_level_1_escalation(self, setup_policies):
        """23. First breach triggers Level 1 escalation to Junior Engineer"""
        consumer = User.objects.create_user(
            username="sla_esc1_u",
            email="sla_esc1@example.com",
            password="Password@123"
        )
        g = Grievance.objects.create(
            complaint_number="GH-2026-TEST-005",
            title="Escalation L1 Complaint",
            description="Outage unresolved",
            consumer=consumer,
            priority=Grievance.Priority.HIGH,
            status=Grievance.Status.IN_PROGRESS
        )
        apply_sla_to_grievance(g)
        g.due_at = timezone.now() - timedelta(minutes=30)
        g.save()

        res = evaluate_single_grievance_sla(g)
        assert "LEVEL_1" in res["escalations_created"]
        esc_rec = SLAEscalation.objects.filter(grievance=g, escalation_level="LEVEL_1").first()
        assert esc_rec is not None
        assert "Junior Engineer" in esc_rec.escalated_to_designation

    def test_24_level_2_escalation(self, setup_policies):
        """24. Continued breach past escalation threshold triggers Level 2 escalation to Assistant Engineer"""
        consumer = User.objects.create_user(
            username="sla_esc2_u",
            email="sla_esc2@example.com",
            password="Password@123"
        )
        g = Grievance.objects.create(
            complaint_number="GH-2026-TEST-006",
            title="Escalation L2 Complaint",
            description="Outage severe delay",
            consumer=consumer,
            priority=Grievance.Priority.HIGH,
            status=Grievance.Status.IN_PROGRESS,
            escalation_level=Grievance.EscalationLevel.LEVEL_1
        )
        apply_sla_to_grievance(g)
        g.due_at = timezone.now() - timedelta(hours=3)
        g.save()

        # Existing Level 1 record
        SLAEscalation.objects.create(
            grievance=g,
            escalation_level=SLAEscalation.Level.LEVEL_1,
            escalated_to_designation="Junior Engineer / Section Officer",
            reason="Initial breach"
        )

        res = evaluate_single_grievance_sla(g)
        assert "LEVEL_2" in res["escalations_created"]
        esc2_rec = SLAEscalation.objects.filter(grievance=g, escalation_level="LEVEL_2").first()
        assert esc2_rec is not None
        assert "Assistant Engineer" in esc2_rec.escalated_to_designation

    def test_25_duplicate_escalation_prevented(self, setup_policies):
        """25. Idempotency: Multiple evaluation runs never create duplicate escalation records"""
        consumer = User.objects.create_user(
            username="sla_idemp_u",
            email="sla_idemp@example.com",
            password="Password@123"
        )
        g = Grievance.objects.create(
            complaint_number="GH-2026-TEST-007",
            title="Idempotency Test Complaint",
            description="Outage duplicate prevention",
            consumer=consumer,
            priority=Grievance.Priority.HIGH,
            status=Grievance.Status.IN_PROGRESS
        )
        apply_sla_to_grievance(g)
        g.due_at = timezone.now() - timedelta(minutes=45)
        g.save()

        # Run 1
        res1 = evaluate_single_grievance_sla(g)
        assert "LEVEL_1" in res1["escalations_created"]
        count1 = SLAEscalation.objects.filter(grievance=g).count()
        assert count1 == 1

        # Run 2 immediately
        res2 = evaluate_single_grievance_sla(g)
        assert len(res2["escalations_created"]) == 0
        count2 = SLAEscalation.objects.filter(grievance=g).count()
        assert count2 == 1  # Absolutely no duplicate created

    def test_26_sla_resolution_closes_sla(self, setup_policies, api_client):
        """26. Grievance resolution sets status RESOLVED and marks SLA as RESOLVED"""
        officer = User.objects.create_user(
            username="sla_resolver_off",
            email="resolver@msedcl.in",
            password="Password@123",
            role=User.Role.OFFICER,
            is_active=True,
            is_verified=True
        )
        consumer = User.objects.create_user(
            username="sla_res_cons",
            email="res_cons@example.com",
            password="Password@123",
            role=User.Role.CONSUMER
        )
        g = Grievance.objects.create(
            complaint_number="GH-2026-TEST-008",
            title="Resolvable Complaint",
            description="Need fuse replacement",
            consumer=consumer,
            assigned_officer=officer,
            priority=Grievance.Priority.HIGH,
            status=Grievance.Status.IN_PROGRESS
        )
        apply_sla_to_grievance(g)

        api_client.force_authenticate(user=officer)
        res = api_client.post(f"/api/grievances/{g.id}/resolve/", data={
            "resolution_summary": "Replaced blown 100A drop-out fuse at distribution transformer."
        }, format="json")
        assert res.status_code == status.HTTP_200_OK

        g.refresh_from_db()
        assert g.status == Grievance.Status.RESOLVED
        assert g.sla_status == Grievance.SLAStatus.RESOLVED
        assert g.resolved_at is not None

    def test_27_sla_notification_generated(self, setup_policies):
        """27. SLA escalation automatically creates an escalation event"""
        officer = User.objects.create_user(
            username="sla_notif_off",
            email="notif_off@msedcl.in",
            password="Password@123",
            role=User.Role.OFFICER
        )
        consumer = User.objects.create_user(
            username="sla_notif_u",
            email="notif_u@example.com",
            password="Password@123"
        )
        g = Grievance.objects.create(
            complaint_number="GH-2026-TEST-009",
            title="Notification Complaint",
            description="Breach notification test",
            consumer=consumer,
            assigned_officer=officer,
            priority=Grievance.Priority.HIGH,
            status=Grievance.Status.IN_PROGRESS
        )
        apply_sla_to_grievance(g)
        g.due_at = timezone.now() - timedelta(minutes=10)
        g.save()

        res = evaluate_single_grievance_sla(g)
        assert res["breach_triggered"] is True
        assert len(res["escalations_created"]) > 0

    def test_28_sla_audit_event_generated(self, setup_policies):
        """28. SLA state change creates an immutable audit log record"""
        consumer = User.objects.create_user(
            username="sla_audit_u",
            email="audit_u@example.com",
            password="Password@123"
        )
        g = Grievance.objects.create(
            complaint_number="GH-2026-TEST-010",
            title="Audit Complaint",
            description="Audit test complaint",
            consumer=consumer,
            priority=Grievance.Priority.HIGH,
            status=Grievance.Status.IN_PROGRESS
        )
        apply_sla_to_grievance(g)
        g.due_at = timezone.now() - timedelta(minutes=15)
        g.save()

        evaluate_single_grievance_sla(g)

        audit_entry = AuditLog.objects.filter(resource_id=str(g.id), action_type__startswith="SLA_").first()
        assert audit_entry is not None
        assert audit_entry.action_type in ["SLA_BREACHED", "SLA_ESCALATED", "SLA_STARTED"]

    def test_29_dashboard_metrics_calculated_from_database(self, setup_policies, api_client):
        """29. SLA overview KPIs are calculated via live ORM aggregation from the database"""
        admin = User.objects.create_user(
            username="sla_admin_metric",
            email="admin_metric@msedcl.in",
            password="Password@123",
            role=User.Role.ADMIN,
            is_active=True,
            is_verified=True
        )
        consumer = User.objects.create_user(
            username="sla_metric_u",
            email="metric_u@example.com",
            password="Password@123"
        )
        # Create active complaints
        Grievance.objects.create(
            complaint_number="GH-2026-TEST-011",
            title="Metric Compliant",
            description="Active compliant",
            consumer=consumer,
            priority=Grievance.Priority.LOW,
            status=Grievance.Status.IN_PROGRESS,
            sla_status=Grievance.SLAStatus.ACTIVE
        )
        Grievance.objects.create(
            complaint_number="GH-2026-TEST-012",
            title="Metric Breached",
            description="Active breached",
            consumer=consumer,
            priority=Grievance.Priority.CRITICAL,
            status=Grievance.Status.IN_PROGRESS,
            sla_status=Grievance.SLAStatus.BREACHED,
            escalation_level=Grievance.EscalationLevel.LEVEL_1
        )

        api_client.force_authenticate(user=admin)
        res = api_client.get("/api/sla/overview/")
        assert res.status_code == status.HTTP_200_OK
        data = res.data
        summary = data.get("summary", {})
        assert "total_active_complaints" in summary
        assert summary["total_active_complaints"] >= 2
        assert summary["sla_breached"] >= 1
        assert "compliance_rate" in summary
        assert "sla_by_department" in data

    def test_30_critical_safety_complaint_receives_correct_sla_policy(self, setup_policies):
        """30. Critical safety hazard receives expedited emergency safety SLA policy"""
        policy = find_matching_sla_policy(Grievance.Priority.CRITICAL, Grievance.Category.HAZARD_WIRE_POLE)
        assert policy is not None
        assert policy.priority == Grievance.Priority.CRITICAL
        # MSEDCL standard critical safety window is 120 minutes (2 hours)
        assert policy.target_minutes == 120
        assert policy.warning_minutes == 30
