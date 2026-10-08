"""
GrievanceHUB Authentication Views
Handles Consumer signup, OTP verification, login with email/mobile,
secure logout, forgot/reset password with anti-enumeration, and session validation.
"""

import re
import logging
from django.utils import timezone
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from backend.apps.accounts.models import OfficerProfile, AccountVerificationCode, AdminInvitation
from backend.apps.audit.models import AuditLog
from backend.apps.accounts.permissions import IsAdminUserRole, IsApprovedOfficer, IsConsumer, IsOfficer
from backend.apps.accounts.serializers import (
    UserSerializer,
    RegisterConsumerSerializer,
    VerifyAccountSerializer,
    ResendVerificationSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    LoginSerializer,
    RegisterOfficerSerializer,
    StaffVerifySerializer,
    StaffResendVerificationSerializer,
    AdminStaffDetailSerializer,
    AdminStaffActionSerializer,
    AdminInvitationSerializer,
    CreateAdminInvitationSerializer,
    AcceptAdminInvitationSerializer,
)
from backend.apps.accounts.services import VerificationDeliveryService
from backend.apps.accounts.captcha import CaptchaService
from backend.apps.accounts.throttling import (
    AuthLoginThrottle,
    AuthSignupThrottle,
    AuthVerifyThrottle,
    AuthResendThrottle,
    AuthPasswordResetThrottle,
)

logger = logging.getLogger("grievancehub.accounts")
User = get_user_model()


def _find_user_by_identifier(identifier: str):
    """
    Finds a user by email, mobile number, username, or staff Employee ID.
    """
    ident = str(identifier).strip()
    if not ident:
        return None
    # 1. Exact email match (case-insensitive)
    user = User.objects.filter(email__iexact=ident).first()
    if user:
        return user
    # 2. Exact username match (case-insensitive)
    user = User.objects.filter(username__iexact=ident).first()
    if user:
        return user
    # 3. Staff Employee ID match (case-insensitive)
    officer_profile = OfficerProfile.objects.filter(employee_id__iexact=ident).select_related('user').first()
    if officer_profile and officer_profile.user:
        return officer_profile.user
    # 4. Clean phone number match
    import re
    cleaned = re.sub(r'[^0-9+]', '', ident)
    if cleaned:
        user = User.objects.filter(phone_number=cleaned).first()
        if user:
            return user
    return None


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthSignupThrottle])
def register_consumer_view(request):
    """
    Public consumer signup endpoint.
    Creates pending account with is_verified=False and issues verification code.
    """
    # 1. CAPTCHA verification
    captcha_token = request.data.get("captcha_token")
    client_ip = request.META.get('REMOTE_ADDR')
    captcha_valid, captcha_error = CaptchaService.verify(captcha_token, remote_ip=client_ip)
    if not captcha_valid:
        return Response({"error": captcha_error}, status=status.HTTP_400_BAD_REQUEST)

    # 2. Validate input and create pending consumer
    serializer = RegisterConsumerSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            "message": "Registration successful. A 6-digit verification code has been dispatched.",
            "email": user.email,
            "requires_verification": True,
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthVerifyThrottle])
def verify_account_view(request):
    """
    Verifies user account with 6-digit OTP code.
    Activates account, marks is_verified=True, and initiates authenticated session.
    """
    serializer = VerifyAccountSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    identifier = serializer.validated_data['identifier']
    raw_otp = serializer.validated_data['otp'].strip()

    user = _find_user_by_identifier(identifier)
    if not user:
        return Response({"error": "No account found matching the provided details."}, status=status.HTTP_404_NOT_FOUND)

    if user.is_verified:
        return Response({
            "message": "Account is already verified. You can proceed to log in.",
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)

    # Find the latest active verification code
    code_record = AccountVerificationCode.objects.filter(
        user=user,
        purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT,
        is_used=False
    ).first()

    if not code_record:
        return Response(
            {"error": "No active verification code found. Please request a new code."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if code_record.is_expired():
        code_record.is_used = True
        code_record.save(update_fields=['is_used'])
        return Response(
            {"error": "Verification code has expired. Please request a new one."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if code_record.attempts >= code_record.max_attempts:
        code_record.is_used = True
        code_record.save(update_fields=['is_used'])
        return Response(
            {"error": "Maximum verification attempts exceeded. Please request a new code."},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    if not code_record.check_code(raw_otp):
        code_record.attempts += 1
        code_record.save(update_fields=['attempts'])
        remaining = max(0, code_record.max_attempts - code_record.attempts)
        return Response(
            {"error": f"Invalid verification code. {remaining} attempt(s) remaining."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Valid OTP
    code_record.is_used = True
    code_record.save(update_fields=['is_used'])

    user.is_verified = True
    user.is_active = True
    user.save(update_fields=['is_verified', 'is_active'])

    # Establish session
    login(request, user)

    return Response({
        "message": "Account verified successfully. Welcome to GrievanceHUB!",
        "user": UserSerializer(user).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthResendThrottle])
def resend_verification_view(request):
    """
    Resends account verification code with rate-limit and cooldown enforcement.
    """
    serializer = ResendVerificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    identifier = serializer.validated_data['identifier']
    user = _find_user_by_identifier(identifier)

    # Prevent enumeration: generic success response if user does not exist
    if not user:
        return Response({
            "message": "If an unverified account exists with those details, a new code has been sent."
        }, status=status.HTTP_200_OK)

    if user.is_verified:
        return Response({
            "message": "Account is already verified. You can log in directly."
        }, status=status.HTTP_200_OK)

    # Cooldown check: 60 seconds between code generations
    recent_code = AccountVerificationCode.objects.filter(
        user=user,
        purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT
    ).first()

    if recent_code:
        elapsed = (timezone.now() - recent_code.created_at).total_seconds()
        if elapsed < 60:
            remaining = int(60 - elapsed)
            return Response(
                {"error": f"Please wait {remaining} seconds before requesting another code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

    otp = AccountVerificationCode.generate_code(
        user=user,
        purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT,
        expiry_minutes=10
    )
    VerificationDeliveryService.send_account_verification_otp(user, otp)

    return Response({
        "message": "A fresh verification code has been dispatched."
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthLoginThrottle])
def login_view(request):
    """
    Universal login endpoint. Supports Email, Mobile Number, or Username.
    Validates password hash, account status, and verification state.
    """
    # 1. CAPTCHA verification
    captcha_token = request.data.get("captcha_token")
    client_ip = request.META.get('REMOTE_ADDR')
    captcha_valid, captcha_error = CaptchaService.verify(captcha_token, remote_ip=client_ip)
    if not captcha_valid:
        return Response({"error": captcha_error}, status=status.HTTP_400_BAD_REQUEST)

    identifier = request.data.get('identifier') or request.data.get('username')
    password = request.data.get('password')

    if not identifier or not password:
        return Response(
            {"error": "Email/mobile/username and password are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find candidate user
    user = _find_user_by_identifier(identifier)
    if not user or not user.check_password(password):
        if user:
            AuditLog.objects.create(
                actor=user,
                action_type="LOGIN_FAILED",
                resource_type="USER",
                resource_id=str(user.id),
                ip_address=client_ip,
                details={"reason": "Invalid credentials", "identifier": identifier}
            )
        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    # Verification state check for Consumers
    if not user.is_verified and user.role == User.Role.CONSUMER and not user.is_superuser:
        return Response({
            "error": "Your account has not been verified yet.",
            "requires_verification": True,
            "email": user.email,
            "identifier": user.email or user.username
        }, status=status.HTTP_403_FORBIDDEN)

    # Staff status check (Officers must be verified AND approved by admin)
    if user.role == User.Role.OFFICER and not user.is_superuser:
        profile = getattr(user, 'officer_profile', None)
        if not user.is_verified:
            return Response({
                "error": "Your staff account contact has not been verified yet.",
                "requires_verification": True,
                "email": user.email,
                "identifier": user.email or user.username
            }, status=status.HTTP_403_FORBIDDEN)

        if profile:
            if profile.approval_status == OfficerProfile.ApprovalStatus.PENDING_APPROVAL:
                return Response({
                    "error": "Your staff account is verified but is awaiting administrator approval. Please contact the system administrator.",
                    "approval_status": "PENDING_APPROVAL",
                    "requires_approval": True,
                    "employee_id": profile.employee_id
                }, status=status.HTTP_403_FORBIDDEN)
            elif profile.approval_status == OfficerProfile.ApprovalStatus.REJECTED:
                return Response({
                    "error": "Your staff registration request was not approved. Please contact the system administrator.",
                    "approval_status": "REJECTED"
                }, status=status.HTTP_403_FORBIDDEN)
            elif profile.approval_status == OfficerProfile.ApprovalStatus.SUSPENDED or not user.is_active:
                return Response({
                    "error": "Your staff account is currently suspended. Please contact the administrator.",
                    "approval_status": "SUSPENDED"
                }, status=status.HTTP_403_FORBIDDEN)

    # General Account status check
    if not user.is_active:
        return Response(
            {"error": "This account has been deactivated. Please contact support."},
            status=status.HTTP_403_FORBIDDEN
        )

    # Perform Django session login
    login(request, user)

    # Audit log successful login for privileged staff and administrators
    if user.role in [User.Role.OFFICER, User.Role.ADMIN]:
        AuditLog.objects.create(
            actor=user,
            action_type="LOGIN_SUCCESS",
            resource_type="USER",
            resource_id=str(user.id),
            ip_address=client_ip,
            details={"role": user.role}
        )

    return Response({
        "message": "Login successful.",
        "user": UserSerializer(user).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthPasswordResetThrottle])
def forgot_password_view(request):
    """
    Initiates password reset workflow.
    Uses generic messaging to prevent user enumeration.
    """
    serializer = ForgotPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    identifier = serializer.validated_data['identifier']
    user = _find_user_by_identifier(identifier)

    if user and user.is_active:
        otp = AccountVerificationCode.generate_code(
            user=user,
            purpose=AccountVerificationCode.Purpose.RESET_PASSWORD,
            expiry_minutes=10
        )
        VerificationDeliveryService.send_password_reset_otp(user, otp)

    # Generic response prevents account enumeration
    return Response({
        "message": "If an account matches the provided information, a password reset code will be sent."
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthPasswordResetThrottle])
def reset_password_view(request):
    """
    Verifies reset OTP code and updates user password with Django hash.
    """
    serializer = ResetPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    identifier = serializer.validated_data['identifier']
    raw_otp = serializer.validated_data['otp'].strip()
    new_password = serializer.validated_data['new_password']

    user = _find_user_by_identifier(identifier)
    if not user:
        return Response(
            {"error": "No account found matching the provided details."},
            status=status.HTTP_404_NOT_FOUND
        )

    code_record = AccountVerificationCode.objects.filter(
        user=user,
        purpose=AccountVerificationCode.Purpose.RESET_PASSWORD,
        is_used=False
    ).first()

    if not code_record or code_record.is_expired():
        if code_record:
            code_record.is_used = True
            code_record.save(update_fields=['is_used'])
        return Response(
            {"error": "Reset code has expired or is invalid. Please request a new one."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if code_record.attempts >= code_record.max_attempts:
        code_record.is_used = True
        code_record.save(update_fields=['is_used'])
        return Response(
            {"error": "Maximum attempts exceeded. Please request a new reset code."},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    if not code_record.check_code(raw_otp):
        code_record.attempts += 1
        code_record.save(update_fields=['attempts'])
        remaining = max(0, code_record.max_attempts - code_record.attempts)
        return Response(
            {"error": f"Invalid reset code. {remaining} attempt(s) remaining."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Server-side password strength validation
    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as e:
        return Response({"error": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    # Update password using Django password hashing
    user.set_password(new_password)
    # If the user was pending verification, password reset also verifies identity
    user.is_verified = True
    user.save()

    code_record.is_used = True
    code_record.save(update_fields=['is_used'])

    return Response({
        "message": "Password reset successfully. You can now log in with your new password."
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Terminates current user session and clears authentication cookies.
    """
    logout(request)
    return Response({"message": "Logout successful."})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Returns current authenticated user session data and role.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# ============================================================================
# MSEDCL STAFF / OFFICER ONBOARDING WORKFLOW
# ============================================================================

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthSignupThrottle])
def register_staff_view(request):
    """
    Dedicated MSEDCL staff onboarding endpoint.
    Registers an officer with PENDING_APPROVAL status.
    Dispatches identity verification OTP to official contact.
    """
    # 1. CAPTCHA verification
    captcha_token = request.data.get("captcha_token")
    client_ip = request.META.get('REMOTE_ADDR')
    captcha_valid, captcha_error = CaptchaService.verify(captcha_token, remote_ip=client_ip)
    if not captcha_valid:
        return Response({"error": captcha_error}, status=status.HTTP_400_BAD_REQUEST)

    serializer = RegisterOfficerSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    profile = user.officer_profile

    # Audit log staff registration
    AuditLog.objects.create(
        actor=user,
        action_type="STAFF_REGISTERED",
        resource_type="STAFF_ACCOUNT",
        resource_id=str(user.id),
        ip_address=client_ip,
        details={
            "employee_id": profile.employee_id,
            "department": profile.department,
            "designation": profile.designation,
            "region": profile.region,
            "circle": profile.circle,
        }
    )

    return Response({
        "message": "Staff registration submitted successfully. Please enter the verification code sent to your official contact.",
        "requires_verification": True,
        "requires_approval": True,
        "employee_id": profile.employee_id,
        "email": user.email,
        "approval_status": profile.approval_status,
        "user": UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthVerifyThrottle])
def verify_staff_view(request):
    """
    Verifies staff contact ownership using OTP.
    Transitions verification_status to VERIFIED while keeping approval_status at PENDING_APPROVAL.
    Staff accounts are NOT logged in or granted access until approved by an Administrator.
    """
    serializer = StaffVerifySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    identifier = serializer.validated_data['identifier']
    raw_otp = serializer.validated_data['otp'].strip()

    user = _find_user_by_identifier(identifier)
    if not user:
        return Response({"error": "No staff account found matching the provided details."}, status=status.HTTP_404_NOT_FOUND)

    profile = getattr(user, 'officer_profile', None)
    if not profile:
        return Response({"error": "This account is not registered as a staff profile."}, status=status.HTTP_400_BAD_REQUEST)

    if profile.verification_status == OfficerProfile.VerificationStatus.VERIFIED:
        return Response({
            "message": "Contact is already verified. Account is awaiting administrative approval.",
            "requires_approval": True,
            "approval_status": profile.approval_status,
            "employee_id": profile.employee_id,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)

    code_record = AccountVerificationCode.objects.filter(
        user=user,
        purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT,
        is_used=False
    ).first()

    if not code_record:
        return Response(
            {"error": "No active verification code found. Please request a new code."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if code_record.is_expired():
        code_record.is_used = True
        code_record.save(update_fields=['is_used'])
        return Response(
            {"error": "Verification code has expired. Please request a new code."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if code_record.attempts >= code_record.max_attempts:
        code_record.is_used = True
        code_record.save(update_fields=['is_used'])
        return Response(
            {"error": "Maximum verification attempts exceeded. Please request a new code."},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    if not code_record.check_code(raw_otp):
        code_record.attempts += 1
        code_record.save(update_fields=['attempts'])
        remaining = max(0, code_record.max_attempts - code_record.attempts)
        return Response(
            {"error": f"Invalid verification code. {remaining} attempt(s) remaining."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Valid OTP: mark verified
    code_record.is_used = True
    code_record.save(update_fields=['is_used'])

    user.is_verified = True
    user.save(update_fields=['is_verified'])

    profile.verification_status = OfficerProfile.VerificationStatus.VERIFIED
    profile.save(update_fields=['verification_status'])

    AuditLog.objects.create(
        actor=user,
        action_type="STAFF_OTP_VERIFIED",
        resource_type="STAFF_ACCOUNT",
        resource_id=str(user.id),
        details={"employee_id": profile.employee_id}
    )

    return Response({
        "message": "Contact verified successfully. Your staff account is now pending administrator approval.",
        "requires_approval": True,
        "approval_status": profile.approval_status,
        "employee_id": profile.employee_id,
        "user": UserSerializer(user).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthResendThrottle])
def resend_staff_verification_view(request):
    """
    Resends staff account OTP with cooldown protection.
    """
    serializer = StaffResendVerificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    identifier = serializer.validated_data['identifier']
    user = _find_user_by_identifier(identifier)

    if not user:
        return Response({
            "message": "If an unverified staff account exists with those details, a new code has been sent."
        }, status=status.HTTP_200_OK)

    profile = getattr(user, 'officer_profile', None)
    if profile and profile.verification_status == OfficerProfile.VerificationStatus.VERIFIED:
        return Response({
            "message": "Contact is already verified. Your account is awaiting administrative approval."
        }, status=status.HTTP_200_OK)

    recent_code = AccountVerificationCode.objects.filter(
        user=user,
        purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT
    ).first()

    if recent_code:
        elapsed = (timezone.now() - recent_code.created_at).total_seconds()
        if elapsed < 60:
            remaining = int(60 - elapsed)
            return Response(
                {"error": f"Please wait {remaining} seconds before requesting another code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

    otp = AccountVerificationCode.generate_code(
        user=user,
        purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT,
        expiry_minutes=10
    )
    VerificationDeliveryService.send_account_verification_otp(user, otp)

    return Response({
        "message": "A fresh verification code has been dispatched to your official contact."
    }, status=status.HTTP_200_OK)


# ============================================================================
# ADMINISTRATOR STAFF MANAGEMENT WORKFLOW
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAdminUserRole])
def admin_list_staff_view(request):
    """
    Lists staff accounts with filtering by approval status, department, and search query.
    Restricted strictly to authorized Administrators.
    """
    queryset = OfficerProfile.objects.select_related('user', 'approved_by').order_by('-created_at')

    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(approval_status__iexact=status_filter.strip())

    dept_filter = request.query_params.get('department')
    if dept_filter:
        queryset = queryset.filter(department__iexact=dept_filter.strip())

    circle_filter = request.query_params.get('circle')
    if circle_filter:
        queryset = queryset.filter(circle__icontains=circle_filter.strip())

    search_query = request.query_params.get('search')
    if search_query:
        sq = search_query.strip()
        queryset = queryset.filter(
            Q(employee_id__icontains=sq) |
            Q(user__first_name__icontains=sq) |
            Q(user__last_name__icontains=sq) |
            Q(user__email__icontains=sq) |
            Q(official_email__icontains=sq) |
            Q(office_name__icontains=sq)
        )

    serializer = AdminStaffDetailSerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdminUserRole])
def admin_staff_detail_view(request, staff_id):
    """
    Fetches full staff profile detail by OfficerProfile ID or User ID.
    """
    profile = (
        OfficerProfile.objects.select_related('user', 'approved_by')
        .filter(Q(id=staff_id) | Q(user_id=staff_id))
        .first()
    )
    if not profile:
        return Response({"error": "Staff profile not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = AdminStaffDetailSerializer(profile)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdminUserRole])
def admin_staff_approve_view(request, staff_id):
    """
    Approves a pending staff account.
    Activates account, sets role to OFFICER, marks status APPROVED, and creates audit log.
    """
    profile = (
        OfficerProfile.objects.select_related('user')
        .filter(Q(id=staff_id) | Q(user_id=staff_id))
        .first()
    )
    if not profile:
        return Response({"error": "Staff profile not found."}, status=status.HTTP_404_NOT_FOUND)

    # Self-approval restriction
    if request.user.id == profile.user_id:
        return Response({"error": "Officers cannot approve their own account."}, status=status.HTTP_403_FORBIDDEN)

    profile.approval_status = OfficerProfile.ApprovalStatus.APPROVED
    profile.verification_status = OfficerProfile.VerificationStatus.VERIFIED
    profile.approved_by = request.user
    profile.approved_at = timezone.now()
    profile.rejection_reason = ""
    profile.save()

    profile.user.is_active = True
    profile.user.is_verified = True
    profile.user.role = User.Role.OFFICER
    profile.user.save(update_fields=['is_active', 'is_verified', 'role'])

    AuditLog.objects.create(
        actor=request.user,
        action_type="STAFF_APPROVED",
        resource_type="STAFF_ACCOUNT",
        resource_id=str(profile.user_id),
        details={
            "employee_id": profile.employee_id,
            "approved_by": request.user.username,
            "department": profile.department,
        }
    )

    return Response({
        "message": f"Staff account {profile.employee_id} approved successfully.",
        "profile": AdminStaffDetailSerializer(profile).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdminUserRole])
def admin_staff_reject_view(request, staff_id):
    """
    Rejects a pending staff account.
    Marks status REJECTED, deactivates user, and logs audit reason.
    """
    profile = (
        OfficerProfile.objects.select_related('user')
        .filter(Q(id=staff_id) | Q(user_id=staff_id))
        .first()
    )
    if not profile:
        return Response({"error": "Staff profile not found."}, status=status.HTTP_404_NOT_FOUND)

    reason = request.data.get('reason', '').strip() or "Application did not meet administrative verification criteria."

    profile.approval_status = OfficerProfile.ApprovalStatus.REJECTED
    profile.rejection_reason = reason
    profile.save(update_fields=['approval_status', 'rejection_reason'])

    profile.user.is_active = False
    profile.user.save(update_fields=['is_active'])

    AuditLog.objects.create(
        actor=request.user,
        action_type="STAFF_REJECTED",
        resource_type="STAFF_ACCOUNT",
        resource_id=str(profile.user_id),
        details={
            "employee_id": profile.employee_id,
            "rejected_by": request.user.username,
            "reason": reason,
        }
    )

    return Response({
        "message": f"Staff account {profile.employee_id} has been rejected.",
        "profile": AdminStaffDetailSerializer(profile).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdminUserRole])
def admin_staff_suspend_view(request, staff_id):
    """
    Suspends an active staff account.
    Deactivates user, sets status SUSPENDED, and records reason.
    """
    profile = (
        OfficerProfile.objects.select_related('user')
        .filter(Q(id=staff_id) | Q(user_id=staff_id))
        .first()
    )
    if not profile:
        return Response({"error": "Staff profile not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user.id == profile.user_id:
        return Response({"error": "Administrators cannot suspend themselves."}, status=status.HTTP_403_FORBIDDEN)

    reason = request.data.get('reason', '').strip() or "Administrative suspension."

    profile.approval_status = OfficerProfile.ApprovalStatus.SUSPENDED
    profile.rejection_reason = reason
    profile.save(update_fields=['approval_status', 'rejection_reason'])

    profile.user.is_active = False
    profile.user.save(update_fields=['is_active'])

    AuditLog.objects.create(
        actor=request.user,
        action_type="STAFF_SUSPENDED",
        resource_type="STAFF_ACCOUNT",
        resource_id=str(profile.user_id),
        details={
            "employee_id": profile.employee_id,
            "suspended_by": request.user.username,
            "reason": reason,
        }
    )

    return Response({
        "message": f"Staff account {profile.employee_id} has been suspended.",
        "profile": AdminStaffDetailSerializer(profile).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdminUserRole])
def admin_staff_reactivate_view(request, staff_id):
    """
    Reactivates a suspended staff account.
    Sets status APPROVED and activates user.
    """
    profile = (
        OfficerProfile.objects.select_related('user')
        .filter(Q(id=staff_id) | Q(user_id=staff_id))
        .first()
    )
    if not profile:
        return Response({"error": "Staff profile not found."}, status=status.HTTP_404_NOT_FOUND)

    profile.approval_status = OfficerProfile.ApprovalStatus.APPROVED
    profile.save(update_fields=['approval_status'])

    profile.user.is_active = True
    profile.user.save(update_fields=['is_active'])

    AuditLog.objects.create(
        actor=request.user,
        action_type="STAFF_REACTIVATED",
        resource_type="STAFF_ACCOUNT",
        resource_id=str(profile.user_id),
        details={
            "employee_id": profile.employee_id,
            "reactivated_by": request.user.username,
        }
    )

    return Response({
        "message": f"Staff account {profile.employee_id} reactivated successfully.",
        "profile": AdminStaffDetailSerializer(profile).data
    }, status=status.HTTP_200_OK)


# ============================================================================
# ADMINISTRATOR INVITATION & CREATION WORKFLOW
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAdminUserRole])
def admin_create_invitation_view(request):
    """
    Invites a new Administrator. Restricted strictly to authorized Admins.
    Generates single-use cryptographically secure invitation token.
    """
    serializer = CreateAdminInvitationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    designation = serializer.validated_data.get('designation') or "System Administrator"
    department = serializer.validated_data.get('department') or "ADMINISTRATION"

    invitation, raw_token = AdminInvitation.create_invitation(
        email=email,
        invited_by=request.user,
        designation=designation,
        department=department,
        expiry_hours=48
    )

    AuditLog.objects.create(
        actor=request.user,
        action_type="ADMIN_INVITED",
        resource_type="ADMIN_INVITATION",
        resource_id=str(invitation.id),
        details={
            "email": email,
            "designation": designation,
            "invited_by": request.user.username,
        }
    )

    # In development/demo mode, return the token for quick UI testing
    return Response({
        "message": f"Administrator invitation generated for {email}.",
        "invitation": AdminInvitationSerializer(invitation).data,
        "invitation_token": raw_token
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminUserRole])
def admin_list_invitations_view(request):
    """
    Lists recent Admin invitations.
    """
    invitations = AdminInvitation.objects.select_related('invited_by').all()[:50]
    serializer = AdminInvitationSerializer(invitations, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def accept_admin_invitation_view(request, token):
    """
    Activates an Administrator account via valid single-use invitation token.
    Publicly accessible activation page with token validation.
    """
    raw_token = str(token).strip()
    token_hash = AdminInvitation.hash_token(raw_token)

    invitation = AdminInvitation.objects.filter(token_hash=token_hash, is_accepted=False).first()
    if not invitation:
        return Response(
            {"error": "Invitation token is invalid, expired, or has already been used."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if invitation.is_expired():
        return Response(
            {"error": "This invitation token has expired. Please request a new invitation."},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = AcceptAdminInvitationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = invitation.email
    # Check if duplicate admin user exists
    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"error": "An account with this email address already exists."},
            status=status.HTTP_400_BAD_REQUEST
        )

    full_name = serializer.validated_data['full_name'].strip()
    mobile = serializer.validated_data['phone_number']
    password = serializer.validated_data['password']

    parts = full_name.split(' ', 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ''

    base_username = email.split('@')[0].lower()
    base_username = re.sub(r'[^a-z0-9_]', '', base_username) or "admin"
    candidate = base_username
    idx = 1
    while User.objects.filter(username=candidate).exists():
        candidate = f"{base_username}_{idx}"
        idx += 1

    user = User(
        username=candidate,
        email=email,
        first_name=first_name,
        last_name=last_name,
        phone_number=mobile,
        role=User.Role.ADMIN,
        is_verified=True,
        is_active=True
    )
    user.set_password(password)
    user.save()

    invitation.is_accepted = True
    invitation.accepted_at = timezone.now()
    invitation.save(update_fields=['is_accepted', 'accepted_at'])

    AuditLog.objects.create(
        actor=user,
        action_type="ADMIN_CREATED",
        resource_type="USER",
        resource_id=str(user.id),
        details={
            "email": email,
            "invited_by": invitation.invited_by.username if invitation.invited_by else "SYSTEM"
        }
    )

    return Response({
        "message": "Administrator account created successfully. You can now log in to the Admin Dashboard.",
        "user": UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)
