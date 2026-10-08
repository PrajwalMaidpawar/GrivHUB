# GrievanceHUB ML API Integration Documentation

## Overview

The GrievanceHUB Backend provides REST API endpoints for civic complaint submission with automated local ML classification, on-demand text triage, officer category corrections, and ML service telemetry.

All ML inference is executed locally using the trained **Multinomial Logistic Regression + TF-IDF Model (`v1.0.0`)** without any external cloud AI APIs or synthetic responses.

---

## Base URL
```
http://localhost:8000/api
```

---

## 1. Classify Grievance Text (On-Demand Triage)

Performs instant local ML classification on arbitrary complaint text without creating a database record.

- **Method:** `POST`
- **URL:** `/api/grievances/classify/`
- **Authentication:** Public / Citizen / Officer Session
- **Headers:** `Content-Type: application/json`

### Request Body
```json
{
  "text": "Water pipeline broken on 5th cross road, heavy drinking water leak and low pressure in houses.",
  "title": "Severe Water Pipeline Burst",
  "threshold": 0.75
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `text` | string | Optional* | Detailed description of the civic problem (*either `text` or `title` required). |
| `title` | string | Optional* | Short headline summary of the issue. |
| `threshold` | float | Optional | Custom confidence threshold (defaults to system `0.75`). |

### Response (200 OK)
```json
{
  "status_code": 200,
  "success": true,
  "message": "Grievance text successfully classified by local ML model.",
  "data": {
    "predicted_category": "Water Supply",
    "confidence": 0.9407,
    "classification_status": "AUTO_CLASSIFIED",
    "probabilities": {
      "Drainage and Sewage": 0.0031,
      "General Civic Services": 0.0012,
      "Parks and Environment": 0.0008,
      "Roads and Infrastructure": 0.0302,
      "Sanitation and Waste Management": 0.0090,
      "Street Lighting and Electrical Infrastructure": 0.0021,
      "Transportation and Traffic Infrastructure": 0.0129,
      "Water Supply": 0.9407
    },
    "model_version": "1.0.0",
    "model_name": "GrievanceHUB Core Municipal Classifier",
    "threshold_used": 0.75,
    "features_extracted": 7
  }
}
```

---

## 2. Submit Grievance (Citizen Flow with Local AI)

Submits a new civic complaint. The backend automatically runs local ML preprocessing, calculates prediction confidence, assigns triage status (`AUTO_CLASSIFIED` vs `REVIEW_REQUIRED`), stores the document in MongoDB, and returns the persisted record.

- **Method:** `POST`
- **URL:** `/api/grievances/`
- **Headers:** `Content-Type: application/json`

### Request Body
```json
{
  "title": "Fallen tree blocking public road and broken electrical wires",
  "description": "Heavy rain caused a large banyan tree branch to collapse on 12th main road, Indiranagar. The wires are sparking and blocking traffic.",
  "citizen_id": "CITIZEN-KA-98214",
  "citizen_name": "Ananya Sharma",
  "citizen_phone": "+91-9876543210",
  "location": {
    "address": "12th Main Road, HAL 2nd Stage, Indiranagar",
    "ward": "Ward 112 (Domlur)",
    "zone": "East Zone",
    "city": "Bengaluru",
    "pincode": "560008",
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "priority": "HIGH",
  "attachments": [
    {
      "url": "https://storage.grievancehub.in/uploads/tree_fallen_12th_main.jpg",
      "filename": "tree_fallen_12th_main.jpg",
      "file_type": "image/jpeg"
    }
  ]
}
```

### Response (201 Created)
```json
{
  "status_code": 201,
  "success": true,
  "message": "Grievance created successfully. Category automatically assigned to 'Parks and Environment'.",
  "data": {
    "grievance": {
      "grievance_id": "GRV-202608-E4C89A",
      "citizen_id": "CITIZEN-KA-98214",
      "citizen_name": "Ananya Sharma",
      "citizen_phone": "+91-9876543210",
      "title": "Fallen tree blocking public road and broken electrical wires",
      "description": "Heavy rain caused a large banyan tree branch to collapse on 12th main road, Indiranagar. The wires are sparking and blocking traffic.",
      "location": {
        "address": "12th Main Road, HAL 2nd Stage, Indiranagar",
        "ward": "Ward 112 (Domlur)",
        "zone": "East Zone",
        "city": "Bengaluru",
        "pincode": "560008",
        "latitude": 12.9716,
        "longitude": 77.5946
      },
      "attachments": [
        {
          "url": "https://storage.grievancehub.in/uploads/tree_fallen_12th_main.jpg",
          "filename": "tree_fallen_12th_main.jpg",
          "file_type": "image/jpeg"
        }
      ],
      "predicted_category": "Parks and Environment",
      "classification_confidence": 0.8124,
      "classification_status": "AUTO_CLASSIFIED",
      "model_version": "1.0.0",
      "officer_final_category": null,
      "classification_corrected": false,
      "status": "SUBMITTED",
      "priority": "HIGH",
      "created_at": "2026-08-21T19:30:00Z",
      "updated_at": "2026-08-21T19:30:00Z"
    },
    "ml_inference": {
      "predicted_category": "Parks and Environment",
      "confidence": 0.8124,
      "classification_status": "AUTO_CLASSIFIED",
      "model_version": "1.0.0",
      "probabilities": { ... }
    }
  }
}
```

---

## 3. List Grievances

Retrieves stored grievances with filtering and pagination.

- **Method:** `GET`
- **URL:** `/api/grievances/?category=Water%20Supply&status=SUBMITTED&limit=20&offset=0`

### Query Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `category` | string | Filter by predicted or officer final category. |
| `status` | string | Filter by operational status (`SUBMITTED`, `IN_REVIEW`, `ASSIGNED`, `RESOLVED`, `CLOSED`). |
| `classification_status` | string | Filter by ML status (`AUTO_CLASSIFIED`, `REVIEW_REQUIRED`, `MANUALLY_CORRECTED`). |
| `citizen_id` | string | Filter by submitting citizen identifier. |
| `limit` | integer | Number of records to return (default: 100). |
| `offset` | integer | Pagination offset (default: 0). |

---

## 4. Officer Category Correction & Retraining Feedback (Step 10)

Allows authorized municipal triage officers or department engineers to correct the AI-assigned category.

- **Method:** `POST` or `PATCH`
- **URL:** `/api/grievances/<grievance_id>/correct-category/`
- **Headers:** `Content-Type: application/json`

### Request Body
```json
{
  "corrected_category": "Roads and Infrastructure",
  "reason": "Primary civil issue is roadway asphalt subsidence rather than storm drain collapse.",
  "reviewer_id": "OFFICER-BBMP-ENG-45",
  "reviewer_role": "EXECUTIVE_CIVIL_ENGINEER"
}
```

### Response (200 OK)
```json
{
  "status_code": 200,
  "success": true,
  "message": "Category successfully updated to 'Roads and Infrastructure' and feedback logged.",
  "data": {
    "grievance": {
      "grievance_id": "GRV-202608-E4C89A",
      "predicted_category": "Parks and Environment",
      "officer_final_category": "Roads and Infrastructure",
      "classification_corrected": true,
      "classification_status": "MANUALLY_CORRECTED",
      "updated_at": "2026-08-21T19:31:00Z"
    },
    "feedback": {
      "feedback_id": "FDB-202608-9A12BC",
      "grievance_id": "GRV-202608-E4C89A",
      "original_prediction": "Parks and Environment",
      "corrected_category": "Roads and Infrastructure",
      "is_mismatch": true,
      "correction_reason": "Primary civil issue is roadway asphalt subsidence rather than storm drain collapse.",
      "reviewer_id": "OFFICER-BBMP-ENG-45",
      "reviewer_role": "EXECUTIVE_CIVIL_ENGINEER",
      "model_version": "1.0.0",
      "correction_timestamp": "2026-08-21T19:31:00Z"
    }
  }
}
```

*Note: The feedback record is automatically appended to both the MongoDB feedback store and `ml/datasets/feedback/officer_corrections.json` for future scheduled retraining cycles.*

---

## 5. ML Service Health & Telemetry

Returns model version, loaded vocabulary size, active categories, and threshold configurations.

- **Method:** `GET`
- **URL:** `/api/ml/health/`

### Response (200 OK)
```json
{
  "status_code": 200,
  "success": true,
  "message": "ML Service is operational.",
  "data": {
    "status": "HEALTHY",
    "is_loaded": true,
    "model_name": "GrievanceHUB Core Municipal Classifier",
    "model_version": "1.0.0",
    "algorithm": "Multinomial Logistic Regression (L2 Balanced)",
    "vocabulary_features": 8270,
    "target_categories_count": 8,
    "target_categories": [
      "Drainage and Sewage",
      "General Civic Services",
      "Parks and Environment",
      "Roads and Infrastructure",
      "Sanitation and Waste Management",
      "Street Lighting and Electrical Infrastructure",
      "Transportation and Traffic Infrastructure",
      "Water Supply"
    ],
    "confidence_threshold": 0.75,
    "artifacts_dir": "/app/applet/backend/ml_artifacts",
    "training_dataset_version": "1.0.0",
    "test_accuracy": 0.9957
  }
}
```
