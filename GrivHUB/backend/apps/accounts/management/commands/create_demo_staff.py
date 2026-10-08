"""
Management command to provision demo MSEDCL staff and admin accounts for testing and demonstration.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from backend.apps.accounts.models import OfficerProfile, ConsumerProfile

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds demo MSEDCL Officer, Admin, and Consumer accounts for development and demonstration."

    def handle(self, *args, **options):
        self.stdout.write("Provisioning demo MSEDCL Staff, Admin & Consumer accounts...")

        # 0. Demo Consumer
        consumer_email = "consumer.demo@gmail.com"
        consumer_user, _ = User.objects.get_or_create(
            email=consumer_email,
            defaults={
                "username": "consumer_demo",
                "first_name": "Ramesh",
                "last_name": "Kulkarni",
                "role": User.Role.CONSUMER,
                "is_verified": True,
                "is_active": True,
                "phone_number": "9822112233",
            }
        )
        consumer_user.set_password("consumer123")
        consumer_user.role = User.Role.CONSUMER
        consumer_user.is_verified = True
        consumer_user.is_active = True
        consumer_user.save()

        ConsumerProfile.objects.get_or_create(
            user=consumer_user,
            defaults={
                "consumer_number": "270019284102",
                "billing_address": "Plot 14, Prabhat Road, Lane 4, Pune 411004",
            }
        )
        self.stdout.write(self.style.SUCCESS(f"[OK] Demo Consumer ready: {consumer_email} (Password: consumer123)"))

        # 1. Demo Admin
        admin_email = "admin@msedcl-grievance.in"
        admin_user, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "username": "admin_demo",
                "first_name": "Chief",
                "last_name": "Administrator",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_verified": True,
                "is_active": True,
                "phone_number": "9822000001",
            }
        )
        admin_user.set_password("admin123")
        admin_user.role = User.Role.ADMIN
        admin_user.is_verified = True
        admin_user.is_active = True
        admin_user.save()
        self.stdout.write(self.style.SUCCESS(f"[OK] Demo Admin ready: {admin_email} (Password: admin123)"))

        # 2. Demo Approved Officer
        officer_email = "pune.officer@msedcl-grievance.in"
        officer_user, created = User.objects.get_or_create(
            email=officer_email,
            defaults={
                "username": "pune_officer",
                "first_name": "Rahul",
                "last_name": "Patil",
                "role": User.Role.OFFICER,
                "is_verified": True,
                "is_active": True,
                "phone_number": "9822000002",
            }
        )
        officer_user.set_password("officer123")
        officer_user.role = User.Role.OFFICER
        officer_user.is_verified = True
        officer_user.is_active = True
        officer_user.save()

        officer_profile, _ = OfficerProfile.objects.get_or_create(
            user=officer_user,
            defaults={
                "employee_id": "DEMO-OFFICER-001",
                "designation": "Assistant Engineer (AE)",
                "department": OfficerProfile.DepartmentChoices.POWER_SUPPLY,
                "region": "Pune Zone",
                "circle": "Pune Urban",
                "division": "Shivajinagar",
                "subdivision": "Model Colony",
                "section": "FC Road Branch",
                "office_name": "MSEDCL Model Colony Division Office",
                "official_email": officer_email,
                "official_mobile": "9822000002",
                "verification_status": OfficerProfile.VerificationStatus.VERIFIED,
                "approval_status": OfficerProfile.ApprovalStatus.APPROVED,
                "approved_by": admin_user,
                "approved_at": timezone.now(),
            }
        )
        officer_profile.approval_status = OfficerProfile.ApprovalStatus.APPROVED
        officer_profile.verification_status = OfficerProfile.VerificationStatus.VERIFIED
        officer_profile.employee_id = "DEMO-OFFICER-001"
        officer_profile.save()
        self.stdout.write(self.style.SUCCESS(f"[OK] Demo Approved Officer ready: {officer_email} / DEMO-OFFICER-001 (Password: officer123)"))

        # 3. Demo Pending Approval Officer
        pending_email = "pending.officer@msedcl-grievance.in"
        pending_user, created = User.objects.get_or_create(
            email=pending_email,
            defaults={
                "username": "pending_officer",
                "first_name": "Amit",
                "last_name": "Deshmukh",
                "role": User.Role.OFFICER,
                "is_verified": True,
                "is_active": True,
                "phone_number": "9822000003",
            }
        )
        pending_user.set_password("officer123")
        pending_user.role = User.Role.OFFICER
        pending_user.is_verified = True
        pending_user.save()

        pending_profile, _ = OfficerProfile.objects.get_or_create(
            user=pending_user,
            defaults={
                "employee_id": "DEMO-PENDING-002",
                "designation": "Junior Engineer (JE)",
                "department": OfficerProfile.DepartmentChoices.METERING,
                "region": "Pune Zone",
                "circle": "Pune Rural",
                "division": "Haveli",
                "subdivision": "Hadapsar",
                "section": "Magarpatta Section",
                "office_name": "MSEDCL Hadapsar Section Office",
                "official_email": pending_email,
                "official_mobile": "9822000003",
                "verification_status": OfficerProfile.VerificationStatus.VERIFIED,
                "approval_status": OfficerProfile.ApprovalStatus.PENDING_APPROVAL,
            }
        )
        pending_profile.approval_status = OfficerProfile.ApprovalStatus.PENDING_APPROVAL
        pending_profile.verification_status = OfficerProfile.VerificationStatus.VERIFIED
        pending_profile.save()
        self.stdout.write(self.style.SUCCESS(f"[OK] Demo Pending Officer ready for Admin review: {pending_email} / DEMO-PENDING-002"))

        self.stdout.write(self.style.SUCCESS("All demo staff & admin accounts provisioned successfully."))
