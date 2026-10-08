"""
GrievanceHUB Accounts Serializers & Validators
Enforces server-side password validation, uniqueness constraints,
OTP lifecycle input handling, and secure profile mapping.
"""

import re
from rest_framework import serializers
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from backend.apps.accounts.models import ConsumerProfile, OfficerProfile, AccountVerificationCode, AdminInvitation
from backend.apps.accounts.services import VerificationDeliveryService

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    consumer_number = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    designation = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    approval_status = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    region = serializers.SerializerMethodField()
    circle = serializers.SerializerMethodField()
    division = serializers.SerializerMethodField()
    subdivision = serializers.SerializerMethodField()
    section = serializers.SerializerMethodField()
    office_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'phone_number',
            'role',
            'is_verified',
            'is_active',
            'date_joined',
            'consumer_number',
            'employee_id',
            'designation',
            'approval_status',
            'verification_status',
            'department',
            'region',
            'circle',
            'division',
            'subdivision',
            'section',
            'office_name',
        ]
        read_only_fields = ['id', 'role', 'is_verified', 'is_active', 'date_joined']

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username

    def get_consumer_number(self, obj):
        if hasattr(obj, 'consumer_profile') and obj.consumer_profile:
            return obj.consumer_profile.consumer_number
        return None

    def get_employee_id(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.employee_id
        return None

    def get_designation(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.designation
        return None

    def get_approval_status(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.approval_status
        return 'APPROVED' if obj.role in [User.Role.CONSUMER, User.Role.ADMIN] else None

    def get_verification_status(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.verification_status
        return 'VERIFIED' if obj.is_verified else 'PENDING'

    def get_department(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.department
        return None

    def get_region(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.region
        return None

    def get_circle(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.circle
        return None

    def get_division(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.division
        return None

    def get_subdivision(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.subdivision
        return None

    def get_section(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.section
        return None

    def get_office_name(self, obj):
        if hasattr(obj, 'officer_profile') and obj.officer_profile:
            return obj.officer_profile.office_name
        return None


class RegisterConsumerSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    mobile_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    consumer_number = serializers.CharField(max_length=50, required=True)
    billing_address = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account already exists with this email address.")
        return normalized

    def validate_consumer_number(self, value):
        val = str(value).strip()
        if not val:
            raise serializers.ValidationError("Consumer Number is required.")
        if not re.match(r'^\d{12}$', val):
            raise serializers.ValidationError(
                "Consumer Number must be exactly 12 numeric digits (no letters or spaces). "
                "Official MSEDCL consumer-number verification requires an authorized MSEDCL integration."
            )
        if ConsumerProfile.objects.filter(consumer_number=val).exists():
            raise serializers.ValidationError("This Consumer Number is already associated with an account.")
        return val

    def validate(self, data):
        # Full name check
        full_name = (data.get('full_name') or '').strip()
        first_name = (data.get('first_name') or '').strip()
        if not full_name and not first_name:
            raise serializers.ValidationError({"full_name": "Full Name is required."})

        # Resolve and validate 10-digit mobile number if provided
        mobile = (data.get('mobile_number') or data.get('phone_number') or '').strip()
        if mobile:
            cleaned_mobile = re.sub(r'[^0-9]', '', mobile)
            if cleaned_mobile.startswith('91') and len(cleaned_mobile) == 12:
                cleaned_mobile = cleaned_mobile[2:]
            if not re.match(r'^\d{10}$', cleaned_mobile):
                raise serializers.ValidationError({"mobile_number": "Mobile number must be a valid 10-digit Indian phone number."})

            if User.objects.filter(phone_number__in=[cleaned_mobile, f"+91{cleaned_mobile}", f"91{cleaned_mobile}"]).exists():
                raise serializers.ValidationError({"mobile_number": "This mobile number is already registered."})
            data['phone_number'] = cleaned_mobile

        # Confirm password if provided
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        if confirm_password is not None and password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # Server-side Django password validation
        dummy_user = User(
            username=data.get('username') or data.get('email'),
            email=data.get('email'),
            first_name=first_name or full_name,
            last_name=data.get('last_name') or ''
        )
        try:
            validate_password(password, user=dummy_user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        return data

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        consumer_number = validated_data['consumer_number']
        billing_address = validated_data.get('billing_address', '')
        phone = validated_data.get('phone_number', '')

        # Resolve names
        full_name = validated_data.get('full_name', '').strip()
        first_name = validated_data.get('first_name', '').strip()
        last_name = validated_data.get('last_name', '').strip()
        if full_name and not (first_name or last_name):
            parts = full_name.split(' ', 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ''

        # Auto-generate unique username if not provided
        username = validated_data.get('username', '').strip()
        if not username:
            base_username = email.split('@')[0].lower()
            base_username = re.sub(r'[^a-z0-9_]', '', base_username) or "consumer"
            candidate = base_username
            idx = 1
            while User.objects.filter(username=candidate).exists():
                candidate = f"{base_username}_{idx}"
                idx += 1
            username = candidate

        # Create user with role CONSUMER and is_verified=False
        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone,
            role=User.Role.CONSUMER,
            is_verified=False,
            is_active=True
        )
        # Use Django password hashing mechanism
        user.set_password(password)
        user.save()

        # Create consumer profile
        ConsumerProfile.objects.create(
            user=user,
            consumer_number=consumer_number,
            billing_address=billing_address
        )

        # Generate initial verification OTP and dispatch
        otp = AccountVerificationCode.generate_code(
            user=user,
            purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT,
            expiry_minutes=10
        )
        VerificationDeliveryService.send_account_verification_otp(user, otp)

        return user


class VerifyAccountSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Email or Username")
    otp = serializers.CharField(required=False, min_length=4, max_length=10)
    code = serializers.CharField(required=False, min_length=4, max_length=10)

    def validate(self, data):
        raw_code = (data.get('otp') or data.get('code') or '').strip()
        if not raw_code:
            raise serializers.ValidationError({"otp": "Verification code (OTP) is required."})
        data['otp'] = raw_code
        return data


class ResendVerificationSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Email or Username")


class ForgotPasswordSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Email, Mobile Number or Username")


class ResetPasswordSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Email or Username")
    otp = serializers.CharField(required=True, min_length=4, max_length=10)
    new_password = serializers.CharField(required=True, min_length=6)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Email, Mobile, or Username")
    password = serializers.CharField(required=True, write_only=True)
    captcha_token = serializers.CharField(required=False, allow_blank=True)


class RegisterOfficerSerializer(serializers.Serializer):
    """
    Validates MSEDCL Staff / Officer Onboarding.
    Enforces Employee ID uniqueness, authorized email domains, password strength,
    and initializes staff account with PENDING_APPROVAL status.
    """
    full_name = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    mobile_number = serializers.CharField(max_length=20, required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, required=True)

    employee_id = serializers.CharField(max_length=50, required=True)
    designation = serializers.CharField(max_length=100, required=False, default="Junior Engineer")
    department = serializers.CharField(max_length=50, required=False, default="POWER_SUPPLY")
    region = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    circle = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    division = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    subdivision = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    section = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    office_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    terms_accepted = serializers.BooleanField(required=False, default=True)
    captcha_token = serializers.CharField(required=False, allow_blank=True)

    def validate_employee_id(self, value):
        val = str(value).strip().upper()
        if not val:
            raise serializers.ValidationError("Employee ID is required.")
        if len(val) < 3 or len(val) > 30:
            raise serializers.ValidationError("Employee ID must be between 3 and 30 characters.")
        if not re.match(r'^[A-Z0-9_\-]+$', val):
            raise serializers.ValidationError("Employee ID may only contain uppercase letters, numbers, hyphens, and underscores.")
        if OfficerProfile.objects.filter(employee_id__iexact=val).exists():
            raise serializers.ValidationError("This Employee ID is already registered.")
        return val

    def validate_email(self, value):
        val = str(value).strip().lower()
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("An account already exists with this email address.")
        if OfficerProfile.objects.filter(official_email__iexact=val).exists():
            raise serializers.ValidationError("This official email is already registered to a staff profile.")

        # Check configurable allowed domains
        allowed_domains = getattr(settings, 'STAFF_ALLOWED_EMAIL_DOMAINS', [])
        if allowed_domains:
            domain = val.split('@')[-1].lower() if '@' in val else ''
            if domain not in allowed_domains:
                allowed_str = ", ".join(allowed_domains)
                raise serializers.ValidationError(
                    f"Official email domain '{domain}' is not authorized. Authorized staff domains: {allowed_str}."
                )
        return val

    def validate_mobile_number(self, value):
        val = str(value).strip()
        cleaned = re.sub(r'[^0-9]', '', val)
        if cleaned.startswith('91') and len(cleaned) == 12:
            cleaned = cleaned[2:]
        if not re.match(r'^\d{10}$', cleaned):
            raise serializers.ValidationError("Mobile number must be a valid 10-digit Indian phone number.")
        if User.objects.filter(phone_number=cleaned).exists():
            raise serializers.ValidationError("This mobile number is already registered.")
        if OfficerProfile.objects.filter(official_mobile=cleaned).exists():
            raise serializers.ValidationError("This official mobile number is already registered.")
        return cleaned

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # Server-side Django password validation
        full_name = data.get('full_name', '').strip()
        email = data.get('email', '').strip()
        dummy_user = User(
            username=email.split('@')[0],
            email=email,
            first_name=full_name
        )
        try:
            validate_password(data['password'], user=dummy_user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        return data

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        full_name = validated_data['full_name'].strip()
        mobile_number = validated_data['mobile_number']
        employee_id = validated_data['employee_id']

        parts = full_name.split(' ', 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ''

        # Auto-generate unique username
        base_username = email.split('@')[0].lower()
        base_username = re.sub(r'[^a-z0-9_]', '', base_username) or "staff"
        candidate = base_username
        idx = 1
        while User.objects.filter(username=candidate).exists():
            candidate = f"{base_username}_{idx}"
            idx += 1
        username = candidate

        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone_number=mobile_number,
            role=User.Role.OFFICER,
            is_verified=False,
            is_active=True
        )
        user.set_password(password)
        user.save()

        OfficerProfile.objects.create(
            user=user,
            employee_id=employee_id,
            designation=validated_data.get('designation') or "Junior Engineer",
            department=validated_data.get('department') or OfficerProfile.DepartmentChoices.POWER_SUPPLY,
            region=validated_data.get('region', ''),
            circle=validated_data.get('circle', ''),
            division=validated_data.get('division', ''),
            subdivision=validated_data.get('subdivision', ''),
            section=validated_data.get('section', ''),
            office_name=validated_data.get('office_name', ''),
            official_email=email,
            official_mobile=mobile_number,
            verification_status=OfficerProfile.VerificationStatus.PENDING,
            approval_status=OfficerProfile.ApprovalStatus.PENDING_APPROVAL
        )

        otp = AccountVerificationCode.generate_code(
            user=user,
            purpose=AccountVerificationCode.Purpose.VERIFY_ACCOUNT,
            expiry_minutes=10
        )
        VerificationDeliveryService.send_account_verification_otp(user, otp)

        return user


class StaffVerifySerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Official Email, Employee ID, or Username")
    otp = serializers.CharField(required=True, min_length=4, max_length=10)


class StaffResendVerificationSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Official Email, Employee ID, or Username")


class AdminStaffDetailSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    is_verified = serializers.BooleanField(source='user.is_verified', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OfficerProfile
        fields = [
            'id',
            'user_id',
            'username',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'official_email',
            'phone_number',
            'official_mobile',
            'employee_id',
            'designation',
            'department',
            'region',
            'circle',
            'division',
            'subdivision',
            'section',
            'office_name',
            'verification_status',
            'approval_status',
            'approved_by',
            'approved_by_name',
            'approved_at',
            'rejection_reason',
            'availability_status',
            'max_active_workload',
            'is_active',
            'is_verified',
            'created_at',
            'updated_at',
            'date_joined',
        ]

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.username

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            name = f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip()
            return name if name else obj.approved_by.username
        return None


class AdminStaffActionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class AdminInvitationSerializer(serializers.ModelSerializer):
    invited_by_name = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = AdminInvitation
        fields = [
            'id',
            'email',
            'designation',
            'department',
            'expires_at',
            'is_accepted',
            'accepted_at',
            'created_at',
            'invited_by',
            'invited_by_name',
            'is_expired',
        ]
        read_only_fields = ['id', 'expires_at', 'is_accepted', 'accepted_at', 'created_at', 'invited_by']

    def get_invited_by_name(self, obj):
        if obj.invited_by:
            return obj.invited_by.get_full_name() or obj.invited_by.username
        return "System"

    def get_is_expired(self, obj):
        return obj.is_expired()


class CreateAdminInvitationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    designation = serializers.CharField(max_length=100, required=False, default="System Administrator")
    department = serializers.CharField(max_length=50, required=False, default="ADMINISTRATION")

    def validate_email(self, value):
        val = str(value).strip().lower()
        if User.objects.filter(email__iexact=val, role=User.Role.ADMIN).exists():
            raise serializers.ValidationError("An active Administrator account already exists with this email address.")
        return val


class AcceptAdminInvitationSerializer(serializers.Serializer):
    token = serializers.CharField(required=False, allow_blank=True)
    full_name = serializers.CharField(max_length=150, required=True)
    mobile_number = serializers.CharField(max_length=20, required=True)
    password = serializers.CharField(required=True, min_length=6, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        cleaned_mobile = re.sub(r'[^0-9]', '', data['mobile_number'])
        if cleaned_mobile.startswith('91') and len(cleaned_mobile) == 12:
            cleaned_mobile = cleaned_mobile[2:]
        if not re.match(r'^\d{10}$', cleaned_mobile):
            raise serializers.ValidationError({"mobile_number": "Mobile number must be a valid 10-digit Indian phone number."})
        data['phone_number'] = cleaned_mobile

        dummy_user = User(
            username="admin_candidate",
            first_name=data.get('full_name') or ''
        )
        try:
            validate_password(data['password'], user=dummy_user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        return data
