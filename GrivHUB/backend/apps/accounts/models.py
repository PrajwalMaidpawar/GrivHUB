from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        CONSUMER = "CONSUMER", "Electricity Consumer"
        OFFICER = "OFFICER", "Field Officer / Technical Staff"
        ADMIN = "ADMIN", "System Administrator"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CONSUMER,
        help_text="Primary system access role"
    )
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_verified = models.BooleanField(
        default=False,
        help_text="Designates whether the user's identity/email/mobile has been verified."
    )

    def is_consumer(self):
        return self.role == self.Role.CONSUMER

    def is_officer(self):
        return self.role == self.Role.OFFICER

    def is_admin_user(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['phone_number'],
                condition=models.Q(phone_number__isnull=False) & ~models.Q(phone_number=''),
                name='unique_user_phone_number'
            ),
            models.UniqueConstraint(
                fields=['email'],
                condition=models.Q(email__isnull=False) & ~models.Q(email=''),
                name='unique_user_email'
            ),
        ]


class ConsumerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="consumer_profile")
    consumer_number = models.CharField(max_length=50, unique=True, help_text="12-digit Electricity Consumer ID")
    meter_number = models.CharField(max_length=50, blank=True, null=True)
    billing_address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Consumer {self.consumer_number} ({self.user.get_full_name() or self.user.username})"


class OfficerProfile(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available for Assignment"
        ON_FIELD = "ON_FIELD", "On Field / Active Duty"
        OFF_DUTY = "OFF_DUTY", "Off Duty / Leave"

    class VerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Verification"
        VERIFIED = "VERIFIED", "Contact Verified"
        REJECTED = "REJECTED", "Rejected"
        SUSPENDED = "SUSPENDED", "Suspended"

    class ApprovalStatus(models.TextChoices):
        PENDING_APPROVAL = "PENDING_APPROVAL", "Pending Administrative Approval"
        APPROVED = "APPROVED", "Approved & Active"
        REJECTED = "REJECTED", "Rejected"
        SUSPENDED = "SUSPENDED", "Suspended"

    class DepartmentChoices(models.TextChoices):
        POWER_SUPPLY = "POWER_SUPPLY", "Power Supply & Outages"
        METERING = "METERING", "Metering & Apparatus"
        BILLING = "BILLING", "Billing & Revenue"
        MAINTENANCE = "MAINTENANCE", "Infrastructure Maintenance"
        EMERGENCY_SAFETY = "EMERGENCY_SAFETY", "Emergency & Safety"
        COMMERCIAL = "COMMERCIAL", "Commercial Services"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="officer_profile")
    employee_id = models.CharField(max_length=50, unique=True, help_text="Unique MSEDCL Staff Identification Number")
    designation = models.CharField(max_length=100, default="Junior Engineer")
    department = models.CharField(
        max_length=50,
        choices=DepartmentChoices.choices,
        default=DepartmentChoices.POWER_SUPPLY
    )
    region = models.CharField(max_length=100, blank=True, default="", help_text="MSEDCL Region (e.g. Pune, Mumbai, Nagpur)")
    circle = models.CharField(max_length=100, blank=True, default="", help_text="MSEDCL Circle")
    division = models.CharField(max_length=100, blank=True, default="", help_text="MSEDCL Division")
    subdivision = models.CharField(max_length=100, blank=True, default="", help_text="MSEDCL Sub-Division")
    section = models.CharField(max_length=100, blank=True, default="", help_text="MSEDCL Section / Branch")
    office_name = models.CharField(max_length=150, blank=True, default="")
    official_email = models.EmailField(blank=True, null=True)
    official_mobile = models.CharField(max_length=20, blank=True, null=True)

    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING_APPROVAL
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_officers"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default="")

    availability_status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE
    )
    max_active_workload = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['official_email'],
                condition=models.Q(official_email__isnull=False) & ~models.Q(official_email=''),
                name='unique_staff_official_email'
            ),
            models.UniqueConstraint(
                fields=['official_mobile'],
                condition=models.Q(official_mobile__isnull=False) & ~models.Q(official_mobile=''),
                name='unique_staff_official_mobile'
            ),
        ]

    def __str__(self):
        return f"Staff {self.employee_id} - {self.designation} ({self.user.get_full_name() or self.user.username})"

    def is_fully_approved(self) -> bool:
        return (
            self.approval_status == self.ApprovalStatus.APPROVED and
            self.verification_status == self.VerificationStatus.VERIFIED and
            self.user.is_active
        )


class AccountVerificationCode(models.Model):
    class Purpose(models.TextChoices):
        VERIFY_ACCOUNT = "VERIFY_ACCOUNT", "Account Verification"
        RESET_PASSWORD = "RESET_PASSWORD", "Password Reset"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="verification_codes")
    code_hash = models.CharField(max_length=128, help_text="SHA-256 hash of the verification code")
    purpose = models.CharField(
        max_length=30,
        choices=Purpose.choices,
        default=Purpose.VERIFY_ACCOUNT
    )
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=5)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "purpose", "is_used"]),
        ]

    def __str__(self):
        return f"OTP({self.purpose}) for {self.user.username} (Used: {self.is_used})"

    @staticmethod
    def hash_code(raw_code: str) -> str:
        import hashlib
        return hashlib.sha256(raw_code.strip().encode("utf-8")).hexdigest()

    def check_code(self, raw_code: str) -> bool:
        import hmac
        computed = self.hash_code(raw_code)
        return hmac.compare_digest(self.code_hash, computed)

    def is_expired(self) -> bool:
        from django.utils import timezone
        return timezone.now() > self.expires_at

    @classmethod
    def generate_code(cls, user, purpose=Purpose.VERIFY_ACCOUNT, expiry_minutes=10) -> str:
        import secrets
        from datetime import timedelta
        from django.utils import timezone

        # Invalidate any existing unused codes for this purpose
        cls.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)

        # Generate a 6-digit numeric OTP
        raw_code = str(secrets.randbelow(900000) + 100000)
        code_hash = cls.hash_code(raw_code)

        expires_at = timezone.now() + timedelta(minutes=expiry_minutes)
        cls.objects.create(
            user=user,
            code_hash=code_hash,
            purpose=purpose,
            expires_at=expires_at,
            max_attempts=5,
            is_used=False
        )
        return raw_code


class AdminInvitation(models.Model):
    email = models.EmailField(db_index=True)
    token_hash = models.CharField(max_length=128, db_index=True, help_text="SHA-256 hash of single-use invitation token")
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_admin_invitations"
    )
    designation = models.CharField(max_length=100, default="System Administrator")
    department = models.CharField(max_length=50, default="ADMINISTRATION")
    expires_at = models.DateTimeField()
    is_accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["token_hash", "is_accepted"]),
        ]

    def __str__(self):
        status_str = "Accepted" if self.is_accepted else ("Expired" if self.is_expired() else "Pending")
        return f"Admin Invitation for {self.email} [{status_str}]"

    @staticmethod
    def hash_token(raw_token: str) -> str:
        import hashlib
        return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()

    def check_token(self, raw_token: str) -> bool:
        import hmac
        computed = self.hash_token(raw_token)
        return hmac.compare_digest(self.token_hash, computed)

    def is_expired(self) -> bool:
        from django.utils import timezone
        return timezone.now() > self.expires_at

    @classmethod
    def create_invitation(cls, email: str, invited_by, designation: str = "System Administrator", department: str = "ADMINISTRATION", expiry_hours: int = 48):
        import secrets
        from datetime import timedelta
        from django.utils import timezone

        # Invalidate any pending invitation for this email
        cls.objects.filter(email__iexact=email.strip().lower(), is_accepted=False).delete()

        raw_token = secrets.token_urlsafe(32)
        token_hash = cls.hash_token(raw_token)
        expires_at = timezone.now() + timedelta(hours=expiry_hours)

        invitation = cls.objects.create(
            email=email.strip().lower(),
            token_hash=token_hash,
            invited_by=invited_by,
            designation=designation or "System Administrator",
            department=department or "ADMINISTRATION",
            expires_at=expires_at,
            is_accepted=False
        )
        return invitation, raw_token
