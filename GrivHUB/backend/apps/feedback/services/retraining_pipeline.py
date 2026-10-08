import os
import json
import logging
from typing import Dict, Any
from backend.apps.feedback.models import MLCorrection
from backend.grievances.models import Grievance

logger = logging.getLogger("grievancehub.feedback")

FEEDBACK_DATASET_PATH = "ml/datasets/feedback/officer_corrections.json"

def record_officer_correction(
    grievance: Grievance,
    corrected_category: str,
    officer_user,
    reason: str
) -> MLCorrection:
    """
    Records human officer category correction for model auditability & offline retraining.
    """
    original = grievance.predicted_category or grievance.provided_category or "Unclassified"

    correction = MLCorrection.objects.create(
        grievance=grievance,
        original_prediction=original,
        corrected_category=corrected_category,
        corrected_by=officer_user,
        correction_reason=reason,
        is_eligible_for_retraining=True
    )

    grievance.verified_category = corrected_category
    grievance.save(update_fields=['verified_category'])

    # Append record to feedback dataset file for offline retraining candidate pipeline
    try:
        os.makedirs(os.path.dirname(FEEDBACK_DATASET_PATH), exist_ok=True)
        records = []
        if os.path.exists(FEEDBACK_DATASET_PATH):
            with open(FEEDBACK_DATASET_PATH, 'r', encoding='utf-8') as f:
                try:
                    records = json.load(f)
                except Exception:
                    records = []

        records.append({
            "grievance_id": str(grievance.id),
            "complaint_number": grievance.complaint_number,
            "text": f"{grievance.title} {grievance.description}",
            "original_prediction": original,
            "corrected_category": corrected_category,
            "corrected_by": officer_user.username,
            "reason": reason,
            "timestamp": correction.created_at.isoformat()
        })

        with open(FEEDBACK_DATASET_PATH, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2)

        logger.info(f"Recorded Human ML Correction on {grievance.complaint_number}: '{original}' -> '{corrected_category}'")
    except Exception as e:
        logger.warning(f"Failed to append to feedback dataset file: {str(e)}")

    return correction
