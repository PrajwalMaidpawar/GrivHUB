from django.db import models
from backend.apps.departments.models import ServiceArea
from backend.grievances.models import Grievance

class Incident(models.Model):
    class Status(models.TextChoices):
        POTENTIAL_INCIDENT = "POTENTIAL_INCIDENT", "Potential Area Outage Cluster"
        CONFIRMED_OUTAGE = "CONFIRMED_OUTAGE", "Confirmed Feeder/Area Outage"
        RESTORATION_IN_PROGRESS = "RESTORATION_IN_PROGRESS", "Line Restoration Crew Active"
        RESOLVED = "RESOLVED", "Outage Cleared"

    incident_code = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    service_area = models.ForeignKey(ServiceArea, on_delete=models.CASCADE, related_name="incidents")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.POTENTIAL_INCIDENT)
    affected_substation = models.CharField(max_length=150, blank=True, null=True)
    linked_complaints_count = models.IntegerField(default=1)
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.incident_code} - {self.title} ({self.linked_complaints_count} complaints)"


class IncidentGrievance(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name="linked_grievances")
    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name="incident_links")
    linked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('incident', 'grievance')

    def __str__(self):
        return f"Incident {self.incident.incident_code} <-> {self.grievance.complaint_number}"
