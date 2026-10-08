from django.db import models
from django.conf import settings
from backend.grievances.models import Grievance

class ConsumerFeedback(models.Model):
    grievance = models.OneToOneField(Grievance, on_delete=models.CASCADE, related_name="feedback")
    consumer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.IntegerField(help_text="Star rating from 1 to 5")
    satisfaction_score = models.CharField(max_length=20, default="SATISFIED")
    feedback_comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Rating {self.rating}/5 for {self.grievance.complaint_number}"


class MLCorrection(models.Model):
    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name="ml_corrections")
    original_prediction = models.CharField(max_length=100)
    corrected_category = models.CharField(max_length=100)
    corrected_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    correction_reason = models.TextField()
    is_eligible_for_retraining = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Correction on {self.grievance.complaint_number}: {self.original_prediction} -> {self.corrected_category}"
