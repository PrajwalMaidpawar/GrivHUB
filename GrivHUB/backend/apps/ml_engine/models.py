from django.db import models
from backend.grievances.models import Grievance

class MLPredictionLog(models.Model):
    grievance = models.ForeignKey(Grievance, on_delete=models.SET_NULL, null=True, blank=True, related_name="ml_logs")
    model_version = models.CharField(max_length=50, default="1.0.0")
    input_text = models.TextField()
    predicted_category = models.CharField(max_length=100)
    confidence_score = models.FloatField(default=0.0)
    prediction_timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Prediction '{self.predicted_category}' ({self.confidence_score:.2f}) at {self.prediction_timestamp}"
