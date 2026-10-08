from django.db import models
from django.conf import settings
from backend.grievances.models import Grievance

class GrievanceAssignment(models.Model):
    class Method(models.TextChoices):
        AUTO_RECOMMENDED = "AUTO_RECOMMENDED", "Rule-Based Smart Recommendation"
        MANUAL_ADMIN = "MANUAL_ADMIN", "Manual Administrator Assignment"

    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name="assignments")
    assigned_officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assignment_records")
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_records_created")
    assignment_method = models.CharField(max_length=30, choices=Method.choices, default=Method.AUTO_RECOMMENDED)
    recommendation_score = models.FloatField(default=1.0, help_text="Workload & location matching score")
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.grievance.complaint_number} assigned to {self.assigned_officer.username}"
