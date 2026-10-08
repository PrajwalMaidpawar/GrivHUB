"""
GrievanceHUB Staff Authentication & Administrator Onboarding Test Suite
Covers 30 Specific Test Scenarios required by MSEDCL Security Specification:
- Officer Onboarding (1 - 12)
- Administrator Management & Invitations (13 - 22)
- System Security, RBAC & Protection Controls (23 - 30)
"""

import pytest
import re
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from backend.apps.accounts.models import OfficerProfile, AccountVerificationCode, AdminInvitation
from backend.apps.audit.models import AuditLog

User = get_user_model()


@pytest.fixture(autouse=True)
def clean_throttle_cache():
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def verified_admin(db):
    user = User.objects.create_user(
        username="admin_test_user",
        email="superadmin@msedcl.gov.in",
        first_name="Super",
        last_name="Admin",
        role=User.Role.ADMIN,
        is_verified=True,
        is_active=True,
        phone_number="9822112233"
    )
    user.set_password("AdminSecurePass@2026")
    user.save()
    return user


@pytest.fixture
def regular_consumer(db):
    user = User.objects.create_user(
        username="consumer_test_user",
        email="consumer.msedcl@test.com",
        first_name="Ravi",
        last_name="Shinde",
        role=User.Role.CONSUMER,
        is_verified=True,
        is_active=True,
        phone_number="9822998877"
    )
    user.set_password("ConsumerSecurePass@2026")
    user.save()
    return user


@pytest.fixture
def sample_officer(db):
    user = User.objects.create_user(
        username="sample_officer_user",
        email="officer.sample@msedcl.in",
        first_name="Vikram",
        last_name="Jadhav",
        role=User.Role.OFFICER,
        is_verified=True,
        is_active=True,
        phone_number="9822445566"
    )
    user.set_password("OfficerSecurePass@2026")
    user.save()
    profile = OfficerProfile.objects.create(
        user=user,
        employee_id="MSEDCL-EMP-9901",
        designation="Junior Engineer",
        department=OfficerProfile.DepartmentChoices.POWER_SUPPLY,
        region="Pune Zone",
        circle="Pune Urban",
        division="Shivajinagar",
        subdivision="Model Colony",
        section="FC Road",
        office_name="Model Colony Section Office",
        official_email="officer.sample@msedcl.in",
        official_mobile="9822445566",
        verification_status=OfficerProfile.VerificationStatus.VERIFIED,
        approval_status=OfficerProfile.ApprovalStatus.APPROVED
    )
    return user


@pytest.mark.django_db
class TestStaffAndAdminAuthenticationSuite:

    # -------------------------------------------------------------------------
    # OFFICER ONBOARDING TESTS (1 - 12)
    # -------------------------------------------------------------------------

    def test_01_officer_registration_succeeds(self, api_client):
        """1. Officer registration succeeds and creates account in PENDING_APPROVAL state."""
        payload = {
            "full_name": "Sanjay Sharma",
            "email": "sanjay.sharma@msedcl.in",
            "mobile_number": "9822100101",
            "employee_id": "MSEDCL-EMP-1001",
            "designation": "Assistant Engineer",
            "department": "POWER_SUPPLY",
            "region": "Pune Zone",
            "circle": "Pune Urban",
            "division": "Kothrud",
            "subdivision": "Paud Road",
            "section": "Kothrud Section",
            "password": "MsedclStaffPassword@2026",
            "confirm_password": "MsedclStaffPassword@2026",
            "terms_accepted": True
        }
        res = api_client.post('/api/auth/staff/register/', payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED, res.data
        assert res.data["requires_verification"] is True
        assert res.data["requires_approval"] is True
        assert res.data["approval_status"] == OfficerProfile.ApprovalStatus.PENDING_APPROVAL

        user = User.objects.get(email="sanjay.sharma@msedcl.in")
        assert user.role == User.Role.OFFICER
        assert user.is_verified is False
        assert user.officer_profile.employee_id == "MSEDCL-EMP-1001"
        assert user.officer_profile.approval_status == OfficerProfile.ApprovalStatus.PENDING_APPROVAL

    def test_02_duplicate_employee_id_rejected(self, api_client):
        """2. Duplicate employee ID rejected."""
        payload1 = {
            "full_name": "Officer One",
            "email": "officer.one@msedcl.in",
            "mobile_number": "9822100102",
            "employee_id": "EMP-DUP-001",
            "password": "StaffPassword@2026",
            "confirm_password": "StaffPassword@2026",
        }
        res1 = api_client.post('/api/auth/staff/register/', payload1, format='json')
        assert res1.status_code == status.HTTP_201_CREATED

        payload2 = {
            "full_name": "Officer Two",
            "email": "officer.two@msedcl.in",
            "mobile_number": "9822100103",
            "employee_id": "EMP-DUP-001",
            "password": "StaffPassword@2026",
            "confirm_password": "StaffPassword@2026",
        }
        res2 = api_client.post('/api/auth/staff/register/', payload2, format='json')
        assert res2.status_code == status.HTTP_400_BAD_REQUEST
        err_text = str(res2.data).lower()
        assert "employee id is already registered" in err_text or "already exists" in err_text

    def test_03_duplicate_official_email_rejected(self, api_client):
        """3. Duplicate official email rejected."""
        payload1 = {
            "full_name": "Officer Three",
            "email": "officer.shared@msedcl.in",
            "mobile_number": "9822100104",
            "employee_id": "EMP-EMAIL-001",
            "password": "StaffPassword@2026",
            "confirm_password": "StaffPassword@2026",
        }
        res1 = api_client.post('/api/auth/staff/register/', payload1, format='json')
        assert res1.status_code == status.HTTP_201_CREATED

        payload2 = {
            "full_name": "Officer Four",
            "email": "officer.shared@msedcl.in",
            "mobile_number": "9822100105",
            "employee_id": "EMP-EMAIL-002",
            "password": "StaffPassword@2026",
            "confirm_password": "StaffPassword@2026",
        }
        res2 = api_client.post('/api/auth/staff/register/', payload2, format='json')
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

    def test_04_invalid_password_rejected(self, api_client):
        """4. Invalid / weak password rejected."""
        payload = {
            "full_name": "Officer Weak",
            "email": "officer.weak@msedcl.in",
            "mobile_number": "9822100106",
            "employee_id": "EMP-WEAK-001",
            "password": "123",
            "confirm_password": "123",
        }
        res = api_client.post('/api/auth/staff/register/', payload, format='json')
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in res.data

    def test_05_invalid_captcha_rejected_when_enabled(self, api_client, monkeypatch):
        """5. Invalid CAPTCHA rejected when enabled."""
        from django.conf import settings
        monkeypatch.setattr(settings, "CAPTCHA_ENABLED", True)
        monkeypatch.setattr("backend.apps.accounts.captcha.CaptchaService.verify", lambda token, remote_ip=None: (False, "Invalid CAPTCHA solution."))

        payload = {
            "full_name": "Officer Captcha",
            "email": "officer.captcha@msedcl.in",
            "mobile_number": "9822100107",
            "employee_id": "EMP-CAPTCHA-01",
            "password": "StaffPassword@2026",
            "confirm_password": "StaffPassword@2026",
            "captcha_token": "fake-bad-token"
        }
        res = api_client.post('/api/auth/staff/register/', payload, format='json')
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "captcha" in str(res.data).lower()

    def test_06_otp_verification_works(self, api_client):
        """6. OTP verification works for staff contact."""
        payload = {
            "full_name": "Pooja Kulkarni",
            "email": "pooja.kulkarni@msedcl.in",
            "mobile_number": "9822100108",
            "employee_id": "EMP-OTP-001",
            "password": "StaffPassword@2026",
            "confirm_password": "StaffPassword@2026",
        }
        reg_res = api_client.post('/api/auth/staff/register/', payload, format='json')
        assert reg_res.status_code == status.HTTP_201_CREATED

        user = User.objects.get(email="pooja.kulkarni@msedcl.in")
        code_record = AccountVerificationCode.objects.filter(user=user, is_used=False).first()
        raw_code = "123456"
        code_record.code_hash = AccountVerificationCode.hash_code(raw_code)
        code_record.save()

        verify_res = api_client.post('/api/auth/staff/verify/', {
            "identifier": "pooja.kulkarni@msedcl.in",
            "otp": raw_code
        }, format='json')

        assert verify_res.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.is_verified is True
        assert user.officer_profile.verification_status == OfficerProfile.VerificationStatus.VERIFIED

    def test_07_officer_remains_pending_after_otp_verification(self, api_client):
        """7. Officer remains in PENDING_APPROVAL status after OTP verification."""
        user = User.objects.create_user(
            username="pending_tester",
            email="pending.tester@msedcl.in",
            role=User.Role.OFFICER,
            is_verified=False,
            is_active=True
        )
        profile = OfficerProfile.objects.create(
            user=user,
            employee_id="EMP-PEND-007",
            verification_status=OfficerProfile.VerificationStatus.PENDING,
            approval_status=OfficerProfile.ApprovalStatus.PENDING_APPROVAL
        )
        raw_otp = AccountVerificationCode.generate_code(user=user)

        res = api_client.post('/api/auth/staff/verify/', {
            "identifier": "pending.tester@msedcl.in",
            "otp": raw_otp
        }, format='json')

        assert res.status_code == status.HTTP_200_OK
        profile.refresh_from_db()
        assert profile.verification_status == OfficerProfile.VerificationStatus.VERIFIED
        assert profile.approval_status == OfficerProfile.ApprovalStatus.PENDING_APPROVAL

    def test_08_unapproved_officer_cannot_access_officer_apis(self, api_client):
        """8. Unapproved officer cannot access officer APIs."""
        user = User.objects.create_user(
            username="unapproved_officer",
            email="unapproved@msedcl.in",
            role=User.Role.OFFICER,
            is_verified=True,
            is_active=True
        )
        OfficerProfile.objects.create(
            user=user,
            employee_id="EMP-UNAPP-008",
            approval_status=OfficerProfile.ApprovalStatus.PENDING_APPROVAL
        )
        api_client.force_authenticate(user=user)
        # Attempt to access admin staff management or officer queue
        res = api_client.get('/api/admin/staff/')
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_09_admin_approval_activates_officer(self, api_client, verified_admin):
        """9. Admin approval activates officer."""
        user = User.objects.create_user(
            username="candidate_officer",
            email="candidate@msedcl.in",
            role=User.Role.OFFICER,
            is_verified=True,
            is_active=False
        )
        profile = OfficerProfile.objects.create(
            user=user,
            employee_id="EMP-APPROVE-009",
            approval_status=OfficerProfile.ApprovalStatus.PENDING_APPROVAL
        )

        api_client.force_authenticate(user=verified_admin)
        res = api_client.post(f'/api/admin/staff/{profile.id}/approve/')
        assert res.status_code == status.HTTP_200_OK
        profile.refresh_from_db()
        user.refresh_from_db()
        assert profile.approval_status == OfficerProfile.ApprovalStatus.APPROVED
        assert user.is_active is True
        assert profile.approved_by == verified_admin

    def test_10_approved_officer_can_login(self, api_client):
        """10. Approved officer can login using email or Employee ID."""
        user = User.objects.create_user(
            username="approved_login_user",
            email="approved.officer@msedcl.in",
            role=User.Role.OFFICER,
            is_verified=True,
            is_active=True
        )
        user.set_password("ApprovedOfficerPass@2026")
        user.save()
        OfficerProfile.objects.create(
            user=user,
            employee_id="EMP-LOGIN-010",
            approval_status=OfficerProfile.ApprovalStatus.APPROVED,
            verification_status=OfficerProfile.VerificationStatus.VERIFIED
        )

        # 1. Login with official email
        res1 = api_client.post('/api/auth/login/', {
            "identifier": "approved.officer@msedcl.in",
            "password": "ApprovedOfficerPass@2026"
        }, format='json')
        assert res1.status_code == status.HTTP_200_OK
        assert res1.data["user"]["role"] == "OFFICER"

        # 2. Login with Employee ID
        res2 = api_client.post('/api/auth/login/', {
            "identifier": "EMP-LOGIN-010",
            "password": "ApprovedOfficerPass@2026"
        }, format='json')
        assert res2.status_code == status.HTTP_200_OK

    def test_11_suspended_officer_cannot_login(self, api_client):
        """11. Suspended officer cannot login."""
        user = User.objects.create_user(
            username="suspended_officer",
            email="suspended@msedcl.in",
            role=User.Role.OFFICER,
            is_verified=True,
            is_active=False
        )
        user.set_password("SuspendedPass@2026")
        user.save()
        OfficerProfile.objects.create(
            user=user,
            employee_id="EMP-SUSP-011",
            approval_status=OfficerProfile.ApprovalStatus.SUSPENDED
        )

        res = api_client.post('/api/auth/login/', {
            "identifier": "suspended@msedcl.in",
            "password": "SuspendedPass@2026"
        }, format='json')
        assert res.status_code == status.HTTP_403_FORBIDDEN
        assert "suspended" in str(res.data).lower()

    def test_12_officer_cannot_create_admin(self, api_client, sample_officer):
        """12. Officer cannot create admin or invite admin."""
        api_client.force_authenticate(user=sample_officer)
        res = api_client.post('/api/admin/invitations/', {
            "email": "hacked.admin@msedcl.in"
        }, format='json')
        assert res.status_code == status.HTTP_403_FORBIDDEN

    # -------------------------------------------------------------------------
    # ADMINISTRATOR MANAGEMENT & PRIVILEGE TESTS (13 - 22)
    # -------------------------------------------------------------------------

    def test_13_consumer_cannot_create_admin(self, api_client, regular_consumer):
        """13. Consumer cannot create or invite admin."""
        api_client.force_authenticate(user=regular_consumer)
        res = api_client.post('/api/admin/invitations/', {
            "email": "rogue.admin@msedcl.in"
        }, format='json')
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_14_officer_cannot_create_admin_alt(self, api_client, sample_officer):
        """14. Officer cannot access staff management list."""
        api_client.force_authenticate(user=sample_officer)
        res = api_client.get('/api/admin/staff/')
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_15_unauthorized_user_cannot_approve_officer(self, api_client, regular_consumer, sample_officer):
        """15. Unauthorized user (consumer or fellow officer) cannot approve officer."""
        user = User.objects.create_user(username="cand_15", email="cand15@msedcl.in", role=User.Role.OFFICER)
        profile = OfficerProfile.objects.create(user=user, employee_id="EMP-15", approval_status=OfficerProfile.ApprovalStatus.PENDING_APPROVAL)

        # Consumer attempt
        api_client.force_authenticate(user=regular_consumer)
        res_consumer = api_client.post(f'/api/admin/staff/{profile.id}/approve/')
        assert res_consumer.status_code == status.HTTP_403_FORBIDDEN

        # Officer attempt
        api_client.force_authenticate(user=sample_officer)
        res_officer = api_client.post(f'/api/admin/staff/{profile.id}/approve/')
        assert res_officer.status_code == status.HTTP_403_FORBIDDEN

    def test_16_admin_can_approve_officer(self, api_client, verified_admin):
        """16. Admin can approve officer."""
        user = User.objects.create_user(username="cand_16", email="cand16@msedcl.in", role=User.Role.OFFICER)
        profile = OfficerProfile.objects.create(user=user, employee_id="EMP-16", approval_status=OfficerProfile.ApprovalStatus.PENDING_APPROVAL)

        api_client.force_authenticate(user=verified_admin)
        res = api_client.post(f'/api/admin/staff/{profile.id}/approve/')
        assert res.status_code == status.HTTP_200_OK
        profile.refresh_from_db()
        assert profile.approval_status == OfficerProfile.ApprovalStatus.APPROVED

    def test_17_admin_can_reject_officer(self, api_client, verified_admin):
        """17. Admin can reject officer."""
        user = User.objects.create_user(username="cand_17", email="cand17@msedcl.in", role=User.Role.OFFICER)
        profile = OfficerProfile.objects.create(user=user, employee_id="EMP-17", approval_status=OfficerProfile.ApprovalStatus.PENDING_APPROVAL)

        api_client.force_authenticate(user=verified_admin)
        res = api_client.post(f'/api/admin/staff/{profile.id}/reject/', {"reason": "Fake credentials"}, format='json')
        assert res.status_code == status.HTTP_200_OK
        profile.refresh_from_db()
        assert profile.approval_status == OfficerProfile.ApprovalStatus.REJECTED
        assert profile.user.is_active is False

    def test_18_admin_can_suspend_officer(self, api_client, verified_admin):
        """18. Admin can suspend officer."""
        user = User.objects.create_user(username="cand_18", email="cand18@msedcl.in", role=User.Role.OFFICER, is_active=True)
        profile = OfficerProfile.objects.create(user=user, employee_id="EMP-18", approval_status=OfficerProfile.ApprovalStatus.APPROVED)

        api_client.force_authenticate(user=verified_admin)
        res = api_client.post(f'/api/admin/staff/{profile.id}/suspend/', {"reason": "Audit inquiry"}, format='json')
        assert res.status_code == status.HTTP_200_OK
        profile.refresh_from_db()
        assert profile.approval_status == OfficerProfile.ApprovalStatus.SUSPENDED
        assert profile.user.is_active is False

    def test_19_admin_can_reactivate_officer(self, api_client, verified_admin):
        """19. Admin can reactivate officer."""
        user = User.objects.create_user(username="cand_19", email="cand19@msedcl.in", role=User.Role.OFFICER, is_active=False)
        profile = OfficerProfile.objects.create(user=user, employee_id="EMP-19", approval_status=OfficerProfile.ApprovalStatus.SUSPENDED)

        api_client.force_authenticate(user=verified_admin)
        res = api_client.post(f'/api/admin/staff/{profile.id}/reactivate/')
        assert res.status_code == status.HTTP_200_OK
        profile.refresh_from_db()
        assert profile.approval_status == OfficerProfile.ApprovalStatus.APPROVED
        assert profile.user.is_active is True

    def test_20_admin_creation_invitation_works(self, api_client, verified_admin):
        """20. Admin invitation and activation flow works end-to-end."""
        api_client.force_authenticate(user=verified_admin)
        res_invite = api_client.post('/api/admin/invitations/', {
            "email": "new.executive.admin@msedcl.in",
            "designation": "Superintending Engineer (Admin)",
            "department": "ADMINISTRATION"
        }, format='json')
        assert res_invite.status_code == status.HTTP_201_CREATED
        token = res_invite.data.get("invitation_token")
        assert token is not None

        # Invitee accepts invitation
        api_client.force_authenticate(user=None)
        res_accept = api_client.post(f'/api/admin/invitations/{token}/accept/', {
            "full_name": "Kailash Patil",
            "mobile_number": "9822881122",
            "password": "ExecutiveAdminPass@2026",
            "confirm_password": "ExecutiveAdminPass@2026"
        }, format='json')
        assert res_accept.status_code == status.HTTP_201_CREATED

        new_admin = User.objects.get(email="new.executive.admin@msedcl.in")
        assert new_admin.role == User.Role.ADMIN
        assert new_admin.is_verified is True
        assert new_admin.is_active is True

    def test_21_duplicate_admin_email_rejected(self, api_client, verified_admin):
        """21. Duplicate admin email rejected."""
        api_client.force_authenticate(user=verified_admin)
        res = api_client.post('/api/admin/invitations/', {
            "email": verified_admin.email
        }, format='json')
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_22_audit_log_generated_for_admin_actions(self, api_client, verified_admin):
        """22. Audit log generated for admin actions (approve, reject, invite)."""
        user = User.objects.create_user(username="audit_staff", email="audit@msedcl.in", role=User.Role.OFFICER)
        profile = OfficerProfile.objects.create(user=user, employee_id="EMP-AUDIT-22", approval_status=OfficerProfile.ApprovalStatus.PENDING_APPROVAL)

        api_client.force_authenticate(user=verified_admin)
        api_client.post(f'/api/admin/staff/{profile.id}/approve/')

        audit = AuditLog.objects.filter(action_type="STAFF_APPROVED", resource_id=str(user.id)).first()
        assert audit is not None
        assert audit.actor == verified_admin

    # -------------------------------------------------------------------------
    # SECURITY & PROTECTION CONTROLS (23 - 30)
    # -------------------------------------------------------------------------

    def test_23_role_tampering_rejected(self, api_client):
        """23. Role tampering rejected: Officer registration cannot grant ADMIN role."""
        payload = {
            "full_name": "Hacker Officer",
            "email": "hacker@msedcl.in",
            "mobile_number": "9822009911",
            "employee_id": "EMP-HACK-01",
            "role": "ADMIN",
            "is_superuser": True,
            "approval_status": "APPROVED",
            "password": "HackerPass@2026",
            "confirm_password": "HackerPass@2026",
        }
        res = api_client.post('/api/auth/staff/register/', payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED

        user = User.objects.get(email="hacker@msedcl.in")
        assert user.role == User.Role.OFFICER
        assert user.is_superuser is False
        assert user.officer_profile.approval_status == OfficerProfile.ApprovalStatus.PENDING_APPROVAL

    def test_24_idor_attempts_rejected(self, api_client, sample_officer):
        """24. IDOR attempts rejected: Officer cannot approve their own or other staff profile."""
        api_client.force_authenticate(user=sample_officer)
        res = api_client.post(f'/api/admin/staff/{sample_officer.officer_profile.id}/approve/')
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_25_rate_limiting_works(self, api_client):
        """25. Rate limiting rejects excessive invalid login attempts."""
        # 12 failed login attempts triggers throttle
        throttled = False
        for _ in range(15):
            res = api_client.post('/api/auth/login/', {
                "identifier": "nonexistent.user@msedcl.in",
                "password": "wrongpassword123"
            }, format='json')
            if res.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                throttled = True
                break
        assert throttled is True

    def test_26_password_never_returned_in_api_responses(self, api_client, verified_admin):
        """26. Password never returned in API responses."""
        api_client.force_authenticate(user=verified_admin)
        res = api_client.get('/api/admin/staff/')
        assert res.status_code == status.HTTP_200_OK
        content = str(res.content)
        assert "password" not in content or '"password":' not in content

    def test_27_otp_never_returned_in_production_api_responses(self, api_client):
        """27. Raw OTP never returned in registration or verification response body."""
        payload = {
            "full_name": "Secrecy Test",
            "email": "secrecy@msedcl.in",
            "mobile_number": "9822774411",
            "employee_id": "EMP-SECRET-01",
            "password": "StaffPassword@2026",
            "confirm_password": "StaffPassword@2026",
        }
        res = api_client.post('/api/auth/staff/register/', payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        assert "otp" not in res.data
        assert "raw_code" not in res.data
        assert "code_hash" not in str(res.data)

    def test_28_invitation_token_cannot_be_reused(self, api_client, verified_admin):
        """28. Invitation token cannot be reused."""
        api_client.force_authenticate(user=verified_admin)
        res_invite = api_client.post('/api/admin/invitations/', {
            "email": "singleuse@msedcl.in"
        }, format='json')
        token = res_invite.data.get("invitation_token")

        api_client.force_authenticate(user=None)
        payload = {
            "full_name": "Single Use Admin",
            "mobile_number": "9822331100",
            "password": "AdminPassSingle@2026",
            "confirm_password": "AdminPassSingle@2026"
        }
        res1 = api_client.post(f'/api/admin/invitations/{token}/accept/', payload, format='json')
        assert res1.status_code == status.HTTP_201_CREATED

        # Second attempt with same token must fail
        res2 = api_client.post(f'/api/admin/invitations/{token}/accept/', payload, format='json')
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

    def test_29_expired_invitation_rejected(self, api_client, verified_admin):
        """29. Expired invitation rejected."""
        invitation, raw_token = AdminInvitation.create_invitation(
            email="expired.admin@msedcl.in",
            invited_by=verified_admin,
            expiry_hours=-1  # Expired in past
        )

        res = api_client.post(f'/api/admin/invitations/{raw_token}/accept/', {
            "full_name": "Late Admin",
            "mobile_number": "9822331199",
            "password": "AdminPassSingle@2026",
            "confirm_password": "AdminPassSingle@2026"
        }, format='json')
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in str(res.data).lower()

    def test_30_unauthenticated_staff_management_requests_rejected(self, api_client):
        """30. Unauthenticated staff-management requests rejected with 401/403."""
        res_list = api_client.get('/api/admin/staff/')
        assert res_list.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

        res_invite = api_client.post('/api/admin/invitations/', {"email": "unauth@msedcl.in"})
        assert res_invite.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
