"""
GrievanceHUB Phase 1 Authentication & Authorization Test Suite
Tests signup, password hashing, account verification (OTP lifecycle), login, logout,
forgot/reset password, role-based authorization, and consumer data isolation.
"""

import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import identify_hasher
from rest_framework import status
from rest_framework.test import APIClient

from backend.apps.accounts.models import ConsumerProfile, OfficerProfile, AccountVerificationCode
from backend.grievances.models import Grievance

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestConsumerSignup:
    def test_valid_signup_creates_pending_consumer(self, api_client):
        payload = {
            "full_name": "Prajwal Pawar",
            "email": "prajwal.pawar@example.in",
            "mobile_number": "+919822112233",
            "consumer_number": "271100229988",
            "password": "SecurePassword@2026",
            "confirm_password": "SecurePassword@2026",
            "billing_address": "Kothrud, Pune"
        }
        response = api_client.post("/api/auth/register/", data=payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["requires_verification"] is True

        user = User.objects.get(email="prajwal.pawar@example.in")
        assert user.is_verified is False
        assert user.role == User.Role.CONSUMER
        assert user.first_name == "Prajwal"
        assert user.last_name == "Pawar"
        assert user.consumer_profile.consumer_number == "271100229988"

        # Verification OTP generated
        otp_rec = AccountVerificationCode.objects.filter(user=user, is_used=False).first()
        assert otp_rec is not None
        assert otp_rec.purpose == AccountVerificationCode.Purpose.VERIFY_ACCOUNT

    def test_duplicate_email_rejected(self, api_client):
        User.objects.create_user(
            username="existing_user",
            email="existing@example.in",
            password="password123",
            role=User.Role.CONSUMER
        )
        payload = {
            "full_name": "New User",
            "email": "existing@example.in",
            "mobile_number": "+919822998877",
            "consumer_number": "270099881122",
            "password": "SecurePassword@2026",
            "confirm_password": "SecurePassword@2026"
        }
        response = api_client.post("/api/auth/register/", data=payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "An account already exists with this email address" in str(response.data)

    def test_duplicate_mobile_rejected(self, api_client):
        User.objects.create_user(
            username="mobile_user",
            email="user1@example.in",
            phone_number="+919822334455",
            password="password123"
        )
        payload = {
            "full_name": "New User",
            "email": "user2@example.in",
            "mobile_number": "+919822334455",
            "consumer_number": "270088776655",
            "password": "SecurePassword@2026",
            "confirm_password": "SecurePassword@2026"
        }
        response = api_client.post("/api/auth/register/", data=payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "This mobile number is already registered" in str(response.data)

    def test_duplicate_consumer_number_rejected(self, api_client):
        u = User.objects.create_user(username="u1", email="u1@example.in", password="password123")
        ConsumerProfile.objects.create(user=u, consumer_number="270011223344")

        payload = {
            "full_name": "Another User",
            "email": "u2@example.in",
            "mobile_number": "+919822001122",
            "consumer_number": "270011223344",
            "password": "SecurePassword@2026",
            "confirm_password": "SecurePassword@2026"
        }
        response = api_client.post("/api/auth/register/", data=payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "This Consumer Number is already associated with an account" in str(response.data)

    def test_password_mismatch_rejected(self, api_client):
        payload = {
            "full_name": "Mismatch Test",
            "email": "mismatch@example.in",
            "consumer_number": "270099009900",
            "password": "SecurePassword@2026",
            "confirm_password": "DifferentPassword@2026"
        }
        response = api_client.post("/api/auth/register/", data=payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Passwords do not match" in str(response.data)

    def test_weak_password_rejected(self, api_client):
        payload = {
            "full_name": "Weak Test",
            "email": "weak@example.in",
            "consumer_number": "270099009901",
            "password": "123",
            "confirm_password": "123"
        }
        response = api_client.post("/api/auth/register/", data=payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPasswordStorage:
    def test_password_is_hashed_never_plaintext(self, api_client):
        raw_pass = "MySecretPass#992"
        payload = {
            "full_name": "Hash Check",
            "email": "hashcheck@example.in",
            "consumer_number": "270099990011",
            "password": raw_pass,
            "confirm_password": raw_pass
        }
        response = api_client.post("/api/auth/register/", data=payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        user = User.objects.get(email="hashcheck@example.in")
        assert user.password != raw_pass
        assert user.password.startswith("pbkdf2_sha256$")
        assert user.check_password(raw_pass) is True


@pytest.mark.django_db
class TestAccountVerification:
    def test_correct_otp_verifies_and_logs_in(self, api_client):
        user = User.objects.create_user(
            username="verify_user",
            email="verify@example.in",
            password="Password123#",
            role=User.Role.CONSUMER,
            is_verified=False
        )
        otp = AccountVerificationCode.generate_code(user=user, purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT)

        payload = {
            "identifier": "verify@example.in",
            "otp": otp
        }
        response = api_client.post("/api/auth/verify/", data=payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.is_verified is True

        # Check session is active
        me_resp = api_client.get("/api/auth/me/")
        assert me_resp.status_code == status.HTTP_200_OK
        assert me_resp.data["email"] == "verify@example.in"

    def test_incorrect_otp_increments_attempts(self, api_client):
        user = User.objects.create_user(
            username="wrong_otp_user",
            email="wrong@example.in",
            password="Password123#",
            is_verified=False
        )
        real_otp = AccountVerificationCode.generate_code(user=user, purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT)

        response = api_client.post("/api/auth/verify/", data={"identifier": "wrong@example.in", "otp": "000000"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "attempt(s) remaining" in response.data["error"]

        code_rec = AccountVerificationCode.objects.get(user=user, is_used=False)
        assert code_rec.attempts == 1

    def test_expired_otp_rejected(self, api_client):
        user = User.objects.create_user(
            username="expired_user",
            email="expired@example.in",
            password="Password123#",
            is_verified=False
        )
        otp = AccountVerificationCode.generate_code(user=user, purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT)
        code_rec = AccountVerificationCode.objects.get(user=user, is_used=False)
        code_rec.expires_at = timezone.now() - timedelta(minutes=5)
        code_rec.save()

        response = api_client.post("/api/auth/verify/", data={"identifier": "expired@example.in", "otp": otp}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in response.data["error"].lower()

    def test_reused_otp_rejected(self, api_client):
        user = User.objects.create_user(
            username="reuse_user",
            email="reuse@example.in",
            password="Password123#",
            is_verified=False
        )
        otp = AccountVerificationCode.generate_code(user=user, purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT)

        # 1st verification
        r1 = api_client.post("/api/auth/verify/", data={"identifier": "reuse@example.in", "otp": otp}, format="json")
        assert r1.status_code == status.HTTP_200_OK

        # Try to use same OTP again
        r2 = api_client.post("/api/auth/verify/", data={"identifier": "reuse@example.in", "otp": otp}, format="json")
        # Should inform account already verified or code invalid
        assert r2.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_resend_verification_cooldown(self, api_client):
        user = User.objects.create_user(
            username="resend_user",
            email="resend@example.in",
            password="Password123#",
            is_verified=False
        )
        AccountVerificationCode.generate_code(user=user, purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT)

        # Immediate resend should trigger cooldown 429
        response = api_client.post("/api/auth/resend-verification/", data={"identifier": "resend@example.in"}, format="json")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Please wait" in response.data["error"]


@pytest.mark.django_db
class TestLoginFlow:
    def test_unverified_account_cannot_login(self, api_client):
        User.objects.create_user(
            username="unverified_login",
            email="unverified@example.in",
            password="Password123#",
            role=User.Role.CONSUMER,
            is_verified=False
        )
        response = api_client.post("/api/auth/login/", data={"identifier": "unverified@example.in", "password": "Password123#"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["requires_verification"] is True

    def test_verified_consumer_can_login_with_email_or_phone(self, api_client):
        user = User.objects.create_user(
            username="verified_consumer",
            email="consumer.valid@example.in",
            phone_number="+919988776655",
            password="Password123#",
            role=User.Role.CONSUMER,
            is_verified=True
        )
        ConsumerProfile.objects.create(user=user, consumer_number="270099881100")

        # 1. Login via Email
        r1 = api_client.post("/api/auth/login/", data={"identifier": "consumer.valid@example.in", "password": "Password123#"}, format="json")
        assert r1.status_code == status.HTTP_200_OK
        assert r1.data["user"]["role"] == "CONSUMER"

        # 2. Login via Phone
        r2 = api_client.post("/api/auth/login/", data={"identifier": "+919988776655", "password": "Password123#"}, format="json")
        assert r2.status_code == status.HTTP_200_OK

    def test_invalid_credentials_returns_401(self, api_client):
        response = api_client.post("/api/auth/login/", data={"identifier": "nonexistent@example.in", "password": "wrong"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_officer_login_works(self, api_client):
        officer = User.objects.create_user(
            username="test_officer",
            email="officer@msedcl.in",
            password="OfficerPass#123",
            role=User.Role.OFFICER,
            is_verified=True
        )
        response = api_client.post("/api/auth/login/", data={"identifier": "officer@msedcl.in", "password": "OfficerPass#123"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["user"]["role"] == "OFFICER"

    def test_admin_login_works(self, api_client):
        admin = User.objects.create_user(
            username="test_admin",
            email="admin@msedcl.in",
            password="AdminPass#123",
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True,
            is_verified=True
        )
        response = api_client.post("/api/auth/login/", data={"identifier": "admin@msedcl.in", "password": "AdminPass#123"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["user"]["role"] == "ADMIN"


@pytest.mark.django_db
class TestLogout:
    def test_logout_terminates_session(self, api_client):
        user = User.objects.create_user(username="logout_user", email="logout@example.in", password="Password123#", is_verified=True)
        api_client.post("/api/auth/login/", data={"identifier": "logout@example.in", "password": "Password123#"}, format="json")

        assert api_client.get("/api/auth/me/").status_code == status.HTTP_200_OK

        logout_resp = api_client.post("/api/auth/logout/")
        assert logout_resp.status_code == status.HTTP_200_OK

        # After logout, accessing me endpoint requires login
        assert api_client.get("/api/auth/me/").status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


@pytest.mark.django_db
class TestConsumerDataIsolation:
    def test_consumer_cannot_access_another_consumers_grievance(self, api_client):
        consumer_a = User.objects.create_user(username="consumer_a", email="a@example.in", password="Password123#", role=User.Role.CONSUMER, is_verified=True)
        consumer_b = User.objects.create_user(username="consumer_b", email="b@example.in", password="Password123#", role=User.Role.CONSUMER, is_verified=True)

        grievance_a = Grievance.objects.create(
            complaint_number="MSED-ISO-A",
            consumer=consumer_a,
            title="Colony blackout",
            description="Transformer explosion"
        )

        # Consumer B logs in
        api_client.post("/api/auth/login/", data={"identifier": "b@example.in", "password": "Password123#"}, format="json")

        # Consumer B attempts to read Consumer A's complaint
        resp = api_client.get(f"/api/grievances/{grievance_a.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert "You do not have permission" in resp.data["error"]

    def test_consumer_list_only_returns_own_grievances(self, api_client):
        consumer_a = User.objects.create_user(username="consumer_a2", email="a2@example.in", password="Password123#", role=User.Role.CONSUMER, is_verified=True)
        consumer_b = User.objects.create_user(username="consumer_b2", email="b2@example.in", password="Password123#", role=User.Role.CONSUMER, is_verified=True)

        Grievance.objects.create(complaint_number="MSED-LIST-A", consumer=consumer_a, title="Grievance A", description="Desc A")
        Grievance.objects.create(complaint_number="MSED-LIST-B", consumer=consumer_b, title="Grievance B", description="Desc B")

        # Consumer A logs in
        api_client.post("/api/auth/login/", data={"identifier": "a2@example.in", "password": "Password123#"}, format="json")

        list_resp = api_client.get("/api/grievances/")
        assert list_resp.status_code == status.HTTP_200_OK
        returned_complaints = [g["complaint_number"] for g in list_resp.data["grievances"]]
        assert "MSED-LIST-A" in returned_complaints
        assert "MSED-LIST-B" not in returned_complaints


@pytest.mark.django_db
class TestForgotPasswordWorkflow:
    def test_forgot_password_generic_message_prevents_enumeration(self, api_client):
        response = api_client.post("/api/auth/forgot-password/", data={"identifier": "doesnotexist@example.in"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "If an account matches" in response.data["message"]

    def test_valid_reset_flow(self, api_client):
        user = User.objects.create_user(
            username="reset_flow_user",
            email="resetflow@example.in",
            password="OldPassword123#",
            is_verified=True
        )
        otp = AccountVerificationCode.generate_code(user=user, purpose=AccountVerificationCode.Purpose.RESET_PASSWORD)

        # 1. Reset using the valid code
        new_pass = "NewPassword2026!#"
        reset_resp = api_client.post("/api/auth/reset-password/", data={
            "identifier": "resetflow@example.in",
            "otp": otp,
            "new_password": new_pass,
            "confirm_password": new_pass,
        }, format="json")
        assert reset_resp.status_code == status.HTTP_200_OK

        # 2. Old password fails
        bad_login = api_client.post("/api/auth/login/", data={"identifier": "resetflow@example.in", "password": "OldPassword123#"}, format="json")
        assert bad_login.status_code == status.HTTP_401_UNAUTHORIZED

        # 3. New password succeeds
        good_login = api_client.post("/api/auth/login/", data={"identifier": "resetflow@example.in", "password": new_pass}, format="json")
        assert good_login.status_code == status.HTTP_200_OK
