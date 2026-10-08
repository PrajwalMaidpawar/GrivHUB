from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from backend.apps.accounts.models import ConsumerProfile, OfficerProfile
from backend.apps.departments.models import Department, ServiceArea

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds initial demonstration accounts (Admin, Officers, Consumer) into database."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting user seeding..."))

        # 1. Ensure Service Area exists
        service_area, _ = ServiceArea.objects.get_or_create(
            substation_name="Shivajinagar Substation",
            pincode="411005",
            defaults={
                "circle_name": "Pune Urban Circle",
                "division_name": "Shivajinagar Division",
                "district": "Pune",
                "state": "Maharashtra"
            }
        )

        # 2. Ensure Departments exist
        dept_power, _ = Department.objects.get_or_create(
            code="POWER_SUPPLY",
            defaults={"name": "Power Supply & Operations", "description": "Outages, feeder trips, line maintenance"}
        )
        dept_meter, _ = Department.objects.get_or_create(
            code="METERING",
            defaults={"name": "Metering & Technical Service", "description": "Meter testing, replacement, error codes"}
        )

        # 3. Create Admin User
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@msedcl-grievance.in",
                "first_name": "System",
                "last_name": "Administrator",
                "phone_number": "+919800011122",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_verified": True
            }
        )
        admin_user.is_verified = True
        admin_user.set_password("admin123")
        admin_user.save()
        self.stdout.write(self.style.SUCCESS("Provisioned Admin: admin / admin123 (Verified: True)"))

        # 4. Create Field Officer 1 (Power Supply)
        officer1, created = User.objects.get_or_create(
            username="officer_pune",
            defaults={
                "email": "pune.officer@msedcl-grievance.in",
                "first_name": "Sanjay",
                "last_name": "Deshmukh",
                "phone_number": "+919422019823",
                "role": User.Role.OFFICER,
                "is_verified": True
            }
        )
        officer1.is_verified = True
        officer1.set_password("officer123")
        officer1.save()
        prof1, _ = OfficerProfile.objects.get_or_create(
            user=officer1,
            defaults={
                "employee_id": "MSED-ENG-4091",
                "designation": "Junior Engineer (Power Supply)",
                "availability_status": OfficerProfile.Status.AVAILABLE,
                "max_active_workload": 10
            }
        )
        dept_power.head_officer = officer1
        dept_power.save()
        self.stdout.write(self.style.SUCCESS("Provisioned Officer: officer_pune / officer123 (Verified: True)"))

        # 5. Create Field Officer 2 (Metering)
        officer2, created = User.objects.get_or_create(
            username="officer_metering",
            defaults={
                "email": "metering.officer@msedcl-grievance.in",
                "first_name": "Priya",
                "last_name": "Kulkarni",
                "phone_number": "+919890123456",
                "role": User.Role.OFFICER,
                "is_verified": True
            }
        )
        officer2.is_verified = True
        officer2.set_password("officer123")
        officer2.save()
        prof2, _ = OfficerProfile.objects.get_or_create(
            user=officer2,
            defaults={
                "employee_id": "MSED-ENG-8823",
                "designation": "Senior Technician (Metering)",
                "availability_status": OfficerProfile.Status.AVAILABLE,
                "max_active_workload": 8
            }
        )
        dept_meter.head_officer = officer2
        dept_meter.save()
        self.stdout.write(self.style.SUCCESS("Provisioned Officer: officer_metering / officer123 (Verified: True)"))

        # 6. Create Consumer User
        consumer, created = User.objects.get_or_create(
            username="consumer_demo",
            defaults={
                "email": "consumer.demo@gmail.com",
                "first_name": "Rajesh",
                "last_name": "Patil",
                "phone_number": "+919881098765",
                "role": User.Role.CONSUMER,
                "is_verified": True
            }
        )
        consumer.is_verified = True
        consumer.set_password("consumer123")
        consumer.save()
        prof3, _ = ConsumerProfile.objects.get_or_create(
            user=consumer,
            defaults={
                "consumer_number": "270019284102",
                "meter_number": "MTR-994812",
                "billing_address": "Flat 402, Shivajinagar Main Road, Pune, Maharashtra 411005"
            }
        )
        self.stdout.write(self.style.SUCCESS("Provisioned Consumer: consumer_demo / consumer123 (Verified: True)"))

        self.stdout.write(self.style.SUCCESS("User seeding complete!"))
