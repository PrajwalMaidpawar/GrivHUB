from django.db import models
from django.conf import settings

class Department(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    head_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_departments"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class ServiceArea(models.Model):
    circle_name = models.CharField(max_length=100)
    division_name = models.CharField(max_length=100)
    substation_name = models.CharField(max_length=150)
    pincode = models.CharField(max_length=10, db_index=True)
    district = models.CharField(max_length=100, default="Pune")
    state = models.CharField(max_length=100, default="Maharashtra")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['circle_name', 'division_name']),
            models.Index(fields=['pincode']),
        ]

    def __str__(self):
        return f"{self.substation_name} ({self.pincode}) - {self.circle_name}"


class ElectricalAsset(models.Model):
    class AssetType(models.TextChoices):
        TRANSFORMER = "TRANSFORMER", "Distribution Transformer"
        FEEDER = "FEEDER", "11kV / 33kV Feeder Line"
        POLE = "POLE", "Electrical Pole"
        SUBSTATION = "SUBSTATION", "Substation Unit"
        METER = "METER", "Consumer Smart/Static Meter"

    class Status(models.TextChoices):
        OPERATIONAL = "OPERATIONAL", "Operational"
        FAULTY = "FAULTY", "Faulty / Damaged"
        MAINTENANCE = "MAINTENANCE", "Under Maintenance"

    asset_code = models.CharField(max_length=100, unique=True)
    asset_type = models.CharField(max_length=30, choices=AssetType.choices)
    service_area = models.ForeignKey(ServiceArea, on_delete=models.CASCADE, related_name="assets")
    location_address = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPERATIONAL)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_asset_type_display()} - {self.asset_code}"
