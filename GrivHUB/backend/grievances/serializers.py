"""
GrievanceHUB Serializers & Input Validation
Validates REST API request payloads for:
- Grievance submission
- ML classification
- Officer category corrections
- Intelligent routing and manual assignments
- Reassignments and role authorization
"""

import re
from typing import Dict, Any, List, Optional, Tuple

ALLOWED_TARGET_CATEGORIES = [
    "Drainage and Sewage",
    "General Civic Services",
    "Parks and Environment",
    "Roads and Infrastructure",
    "Sanitation and Waste Management",
    "Street Lighting and Electrical Infrastructure",
    "Transportation and Traffic Infrastructure",
    "Water Supply"
]

ALLOWED_STATUSES = [
    "SUBMITTED",
    "PENDING_REVIEW",
    "PENDING_ASSIGNMENT",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "REJECTED"
]

class ValidationError(Exception):
    """Raised when an API request payload fails validation."""
    def __init__(self, errors: Dict[str, Any]):
        self.errors = errors
        super().__init__(str(errors))

class PermissionDeniedError(Exception):
    """Raised when a user attempts an unauthorized action according to RBAC."""
    def __init__(self, message: str = "Permission denied for this action."):
        self.message = message
        super().__init__(message)


class GrievanceSubmissionSerializer:
    """Validates POST /api/grievances/ payload."""
    
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        
        # 1. Title Validation
        title = data.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            errors["title"] = "Title is required and must not be blank."
        elif len(title.strip()) < 3:
            errors["title"] = "Title must be at least 3 characters long."
        elif len(title.strip()) > 300:
            errors["title"] = "Title cannot exceed 300 characters."

        # 2. Description Validation
        description = data.get("description")
        if not description or not isinstance(description, str) or not description.strip():
            errors["description"] = "Description is required and must not be blank."
        elif len(description.strip()) < 5:
            errors["description"] = "Description must be at least 5 characters long."

        # 3. Location (Optional dict)
        location = data.get("location", {})
        if not isinstance(location, dict):
            errors["location"] = "Location must be a dictionary object."

        # 4. Attachments (Optional list)
        attachments = data.get("attachments", [])
        if not isinstance(attachments, list):
            errors["attachments"] = "Attachments must be a list of file objects."
        else:
            try:
                attachments = AttachmentValidationSerializer.validate_list(attachments)
            except ValidationError as ve:
                errors.update(ve.errors)

        if errors:
            raise ValidationError(errors)

        return {
            "title": title.strip(),
            "description": description.strip(),
            "citizen_id": str(data.get("citizen_id", "CITIZEN-ANON")).strip(),
            "citizen_name": str(data.get("citizen_name", "Anonymous Citizen")).strip(),
            "citizen_phone": str(data.get("citizen_phone", "")).strip(),
            "location": location,
            "attachments": attachments,
            "priority": str(data.get("priority", "MEDIUM")).upper()
        }


class GrievanceClassificationSerializer:
    """Validates POST /api/grievances/classify/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        text = data.get("text")
        title = data.get("title", "")
        
        if not text and not title:
            errors["text"] = "Either 'text' or 'title' must be provided for classification."
        elif text and not isinstance(text, str):
            errors["text"] = "'text' must be a string."
            
        if errors:
            raise ValidationError(errors)

        return {
            "text": str(text or "").strip(),
            "title": str(title or "").strip(),
            "custom_threshold": float(data["threshold"]) if "threshold" in data and data["threshold"] is not None else None
        }


class OfficerCorrectionSerializer:
    """Validates POST /api/grievances/<id>/correct-category/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        corrected_category = data.get("corrected_category")
        
        if not corrected_category or not isinstance(corrected_category, str):
            errors["corrected_category"] = "Corrected category is required."
        elif corrected_category not in ALLOWED_TARGET_CATEGORIES:
            errors["corrected_category"] = f"Invalid category. Must be one of: {', '.join(ALLOWED_TARGET_CATEGORIES)}"

        reason = data.get("reason", "")
        reviewer_id = data.get("reviewer_id", "OFFICER-001")
        reviewer_role = data.get("reviewer_role", "MUNICIPAL_TRIAGE_OFFICER")

        if errors:
            raise ValidationError(errors)

        return {
            "corrected_category": corrected_category,
            "reason": str(reason).strip(),
            "reviewer_id": str(reviewer_id).strip(),
            "reviewer_role": str(reviewer_role).strip(),
            "trigger_reroute": bool(data.get("trigger_reroute", True))
        }


class ManualAssignmentSerializer:
    """Validates POST /api/grievances/<id>/assign/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        department_id = data.get("department_id")
        if not department_id or not isinstance(department_id, str) or not department_id.strip():
            errors["department_id"] = "department_id is required."

        officer_id = data.get("officer_id")
        if officer_id is not None and not isinstance(officer_id, str):
            errors["officer_id"] = "officer_id must be a string identifier or null."

        if errors:
            raise ValidationError(errors)

        return {
            "department_id": str(department_id).strip(),
            "officer_id": str(officer_id).strip() if officer_id else None,
            "reason": str(data.get("reason", "ADMIN_OVERRIDE")).strip(),
            "notes": str(data.get("notes", "")).strip()
        }


class ReassignmentSerializer:
    """Validates POST /api/grievances/<id>/reassign/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        reason = data.get("reason")
        if not reason or not isinstance(reason, str) or not reason.strip():
            errors["reason"] = "Reason for reassignment is required."

        new_officer_id = data.get("new_officer_id")
        new_department_id = data.get("new_department_id")

        if errors:
            raise ValidationError(errors)

        return {
            "reason": str(reason).strip(),
            "new_officer_id": str(new_officer_id).strip() if new_officer_id else None,
            "new_department_id": str(new_department_id).strip() if new_department_id else None,
            "notes": str(data.get("notes", "")).strip()
        }


class RBACValidator:
    """
    Step 16: Role-Based Access Control Validator.
    Validates user identity and role from headers / auth context:
    - CITIZEN: Can submit grievances, view their own grievances, check status.
    - OFFICER: Can view assigned grievances, update resolution status, request reassignment, correct category.
    - ADMIN: Full control over departments, officers, assignments, reassignments, overrides, audits.
    """

    @staticmethod
    def extract_user_context(headers: Optional[Dict[str, Any]] = None, body: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
        """Extracts user identification and role from request headers or body context."""
        headers = headers or {}
        body = body or {}
        
        # Normalize header keys to lowercase
        norm_headers = {str(k).lower(): str(v) for k, v in headers.items()}
        
        user_id = norm_headers.get("x-user-id") or norm_headers.get("user-id") or body.get("reviewer_id") or "USR-GUEST"
        role = (norm_headers.get("x-user-role") or norm_headers.get("user-role") or body.get("reviewer_role") or "CITIZEN").upper()
        officer_id = norm_headers.get("x-officer-id") or norm_headers.get("officer-id") or body.get("reviewer_id") or None
        department_id = norm_headers.get("x-department-id") or norm_headers.get("department-id") or None

        # Detect Officer / Admin roles from identifiers or role strings
        if "ADMIN" in str(role) or user_id in ("USR-ADMIN-001", "ADMIN-001", "SYSTEM_ADMIN") or "admin" in str(user_id).lower():
            role = "ADMIN"
        elif "OFFICER" in str(role) or "ENGINEER" in str(role) or "INSPECTOR" in str(role) or (officer_id and "OFF" in str(officer_id).upper()):
            role = "OFFICER"

        return {
            "user_id": user_id,
            "role": role if role in ("CITIZEN", "OFFICER", "ADMIN") else "CITIZEN",
            "officer_id": officer_id or (user_id if "OFF" in str(user_id) else None),
            "department_id": department_id
        }

    @staticmethod
    def require_admin(user_context: Dict[str, str]):
        if user_context.get("role") != "ADMIN":
            raise PermissionDeniedError("Admin role required for this operation.")

    @staticmethod
    def require_officer_or_admin(user_context: Dict[str, str]):
        if user_context.get("role") not in ("OFFICER", "ADMIN"):
            raise PermissionDeniedError("Officer or Admin role required for this operation.")


# =============================================================================
# PHASE 13 LIFECYCLE & ACTIVITY SERIALIZERS
# =============================================================================

class AttachmentValidationSerializer:
    """Validates attachment documents (images, PDFs, documents up to 10MB) and prevents executable/script uploads."""
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx", ".txt"}
    DANGEROUS_EXTENSIONS = {".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".py", ".html", ".htm", ".vbs", ".dll", ".bin", ".scr", ".jar", ".svg"}
    ALLOWED_MIME_PREFIXES = ("image/", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument", "text/plain")
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

    @classmethod
    def validate_attachment(cls, item: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(item, dict):
            raise ValidationError({"attachment": "Attachment item must be a dictionary object."})

        filename = str(item.get("filename") or item.get("name") or "attachment").strip()
        url = str(item.get("url") or item.get("data") or "").strip()
        size_bytes = item.get("size") or item.get("file_size") or 0
        file_type = str(item.get("file_type") or item.get("mime_type") or "application/octet-stream").strip().lower()

        # Sanitize filename - strip path traversal characters
        clean_filename = re.sub(r'[\/\\:]', '_', filename)

        # Check for dangerous or forbidden extensions
        parts = clean_filename.lower().split(".")
        if len(parts) > 1:
            ext = "." + parts[-1]
            if ext in cls.DANGEROUS_EXTENSIONS:
                raise ValidationError({"attachment_security": f"File type '{ext}' is prohibited due to municipal security policy."})
            if ext not in cls.ALLOWED_EXTENSIONS:
                raise ValidationError({"attachment_extension": f"File extension '{ext}' is not permitted. Allowed: {', '.join(sorted(cls.ALLOWED_EXTENSIONS))}"})

        # Validate MIME type if explicit
        if file_type and file_type != "application/octet-stream":
            if not any(file_type.startswith(prefix) for prefix in cls.ALLOWED_MIME_PREFIXES):
                raise ValidationError({"attachment_mime": f"MIME type '{file_type}' is not supported for grievance attachments."})

        # Validate size
        if isinstance(size_bytes, (int, float)) and size_bytes > cls.MAX_FILE_SIZE_BYTES:
            raise ValidationError({"attachment_size": f"File '{clean_filename}' exceeds maximum allowed size of 10MB."})

        return {
            "filename": clean_filename,
            "url": url,
            "file_type": file_type,
            "size": int(size_bytes) if isinstance(size_bytes, (int, float)) else 0
        }

    @classmethod
    def validate_list(cls, items: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        if not items:
            return []
        if not isinstance(items, list):
            raise ValidationError({"attachments": "Attachments must be a list."})
        return [cls.validate_attachment(it) for it in items]


class OfficerStartWorkSerializer:
    """Validates POST /api/grievances/<id>/start/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        notes = data.get("notes", "Officer started investigation and field work.")
        return {
            "notes": str(notes).strip()
        }


class OfficerProgressUpdateSerializer:
    """Validates POST /api/grievances/<id>/progress/ payload."""

    ALLOWED_STAGES = [
        "INVESTIGATION_STARTED",
        "SITE_INSPECTION_SCHEDULED",
        "SITE_INSPECTION_COMPLETED",
        "WORK_INITIATED",
        "WAITING_FOR_RESOURCES",
        "WORK_COMPLETED",
        "RESOLUTION_SUBMITTED"
    ]

    @classmethod
    def validate(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        stage = data.get("progress_stage") or data.get("stage") or "WORK_INITIATED"
        if stage not in cls.ALLOWED_STAGES:
            errors["progress_stage"] = f"Invalid progress stage. Allowed stages: {cls.ALLOWED_STAGES}"

        note = data.get("progress_note") or data.get("note")
        if not note or not isinstance(note, str) or not note.strip():
            errors["progress_note"] = "Progress note is required."

        attachments = AttachmentValidationSerializer.validate_list(data.get("attachments"))

        if errors:
            raise ValidationError(errors)

        return {
            "progress_stage": stage,
            "progress_note": str(note).strip(),
            "attachments": attachments
        }


class ResolutionSubmissionSerializer:
    """Validates POST /api/grievances/<id>/resolve/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        summary = data.get("resolution_summary") or data.get("summary")
        if not summary or not isinstance(summary, str) or len(summary.strip()) < 5:
            errors["resolution_summary"] = "Resolution summary is required (min 5 characters)."

        details = data.get("resolution_details") or data.get("details", "")
        images = AttachmentValidationSerializer.validate_list(data.get("resolution_images") or data.get("images"))
        documents = AttachmentValidationSerializer.validate_list(data.get("resolution_documents") or data.get("documents"))

        if errors:
            raise ValidationError(errors)

        return {
            "resolution_summary": str(summary).strip(),
            "resolution_details": str(details).strip(),
            "resolution_images": images,
            "resolution_documents": documents
        }


class CitizenConfirmResolutionSerializer:
    """Validates POST /api/grievances/<id>/confirm-resolution/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        feedback_rating = data.get("feedback_rating", 5)
        try:
            feedback_rating = int(feedback_rating)
            if feedback_rating < 1 or feedback_rating > 5:
                feedback_rating = 5
        except (ValueError, TypeError):
            feedback_rating = 5

        comments = data.get("comments") or data.get("feedback_comments") or "Resolution accepted by citizen."
        return {
            "feedback_rating": feedback_rating,
            "feedback_comments": str(comments).strip()
        }


class CitizenReopenSerializer:
    """Validates POST /api/grievances/<id>/reopen/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        reason = data.get("reopen_reason") or data.get("reason")
        if not reason or not isinstance(reason, str) or len(reason.strip()) < 5:
            errors["reopen_reason"] = "A clear reason for reopening is required (min 5 characters)."

        if errors:
            raise ValidationError(errors)

        return {
            "reopen_reason": str(reason).strip(),
            "notes": str(data.get("notes", "")).strip()
        }


class GrievanceRejectionSerializer:
    """Validates POST /api/grievances/<id>/reject/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        reason = data.get("rejection_reason") or data.get("reason")
        if not reason or not isinstance(reason, str) or len(reason.strip()) < 5:
            errors["rejection_reason"] = "Documented rejection reason is required (min 5 characters)."

        if errors:
            raise ValidationError(errors)

        return {
            "rejection_reason": str(reason).strip()
        }


class GrievanceCloseSerializer:
    """Validates POST /api/grievances/<id>/close/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        reason = data.get("reason", "Administrative closure")
        return {
            "reason": str(reason).strip()
        }


class CommentCreationSerializer:
    """Validates POST /api/grievances/<id>/comments/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        message = data.get("message")
        if not message or not isinstance(message, str) or not message.strip():
            errors["message"] = "Comment message cannot be empty."

        visibility = str(data.get("visibility", "PUBLIC_TO_PARTICIPANTS")).upper()
        if visibility not in ["PUBLIC_TO_PARTICIPANTS", "INTERNAL"]:
            visibility = "PUBLIC_TO_PARTICIPANTS"

        attachments = AttachmentValidationSerializer.validate_list(data.get("attachments"))

        if errors:
            raise ValidationError(errors)

        return {
            "message": str(message).strip(),
            "visibility": visibility,
            "attachments": attachments
        }


# =============================================================================
# PHASE 17 ADMIN MANAGEMENT SERIALIZERS
# =============================================================================

class AdminUserCreationSerializer:
    """Validates POST /api/admin/users/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        name = data.get("name")
        if not name or not isinstance(name, str) or len(name.strip()) < 2:
            errors["name"] = "Full name is required (min 2 characters)."

        email = data.get("email")
        if not email or not isinstance(email, str) or "@" not in email:
            errors["email"] = "A valid email address is required."

        role = str(data.get("role", "CITIZEN")).upper()
        if role not in ["CITIZEN", "OFFICER", "ADMIN"]:
            errors["role"] = "Role must be one of CITIZEN, OFFICER, ADMIN."

        if errors:
            raise ValidationError(errors)

        return {
            "name": str(name).strip(),
            "email": str(email).strip().lower(),
            "phone": str(data.get("phone", "")).strip(),
            "role": role,
            "department_id": str(data.get("department_id", "")).strip() if role in ["OFFICER", "ADMIN"] else None,
            "officer_id": str(data.get("officer_id", "")).strip() if role == "OFFICER" else None,
            "active": bool(data.get("active", True))
        }


class AdminUserUpdateSerializer:
    """Validates PATCH /api/admin/users/<id>/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        updates = {}
        if "name" in data and isinstance(data["name"], str):
            updates["name"] = data["name"].strip()
        if "email" in data and isinstance(data["email"], str) and "@" in data["email"]:
            updates["email"] = data["email"].strip().lower()
        if "phone" in data:
            updates["phone"] = str(data["phone"]).strip()
        if "active" in data:
            updates["active"] = bool(data["active"])
        if "role" in data and str(data["role"]).upper() in ["CITIZEN", "OFFICER", "ADMIN"]:
            updates["role"] = str(data["role"]).upper()
        if "department_id" in data:
            updates["department_id"] = str(data["department_id"]).strip()
        return updates


class AdminOfficerCreationSerializer:
    """Validates POST /api/officers/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        name = data.get("name")
        if not name or not isinstance(name, str) or len(name.strip()) < 2:
            errors["name"] = "Officer name is required."

        email = data.get("email")
        if not email or not isinstance(email, str) or "@" not in email:
            errors["email"] = "Valid officer email is required."

        department_id = data.get("department_id")
        if not department_id or not isinstance(department_id, str):
            errors["department_id"] = "Department assignment is required."

        designation = data.get("designation")
        if not designation or not isinstance(designation, str):
            errors["designation"] = "Official designation is required."

        max_workload = data.get("maximum_workload", 10)
        try:
            max_workload = int(max_workload)
            if max_workload < 1 or max_workload > 100:
                errors["maximum_workload"] = "Maximum workload must be between 1 and 100."
        except (ValueError, TypeError):
            errors["maximum_workload"] = "Maximum workload must be a valid number."

        jurisdictions = data.get("assigned_jurisdictions", [{"zone": "*", "ward": "*"}])
        if not isinstance(jurisdictions, list):
            jurisdictions = [{"zone": "*", "ward": "*"}]

        if errors:
            raise ValidationError(errors)

        return {
            "name": str(name).strip(),
            "email": str(email).strip().lower(),
            "phone": str(data.get("phone", "")).strip(),
            "department_id": str(department_id).strip(),
            "designation": str(designation).strip(),
            "maximum_workload": max_workload,
            "assigned_jurisdictions": jurisdictions,
            "active": bool(data.get("active", True)),
            "availability_status": str(data.get("availability_status", "AVAILABLE")).upper()
        }


class AdminOfficerUpdateSerializer:
    """Validates PATCH /api/officers/<id>/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        updates = {}
        if "name" in data and isinstance(data["name"], str):
            updates["name"] = data["name"].strip()
        if "email" in data and isinstance(data["email"], str) and "@" in data["email"]:
            updates["email"] = data["email"].strip().lower()
        if "phone" in data:
            updates["phone"] = str(data["phone"]).strip()
        if "designation" in data and isinstance(data["designation"], str):
            updates["designation"] = data["designation"].strip()
        if "department_id" in data and isinstance(data["department_id"], str):
            updates["department_id"] = data["department_id"].strip()
        if "active" in data:
            updates["active"] = bool(data["active"])
        if "availability_status" in data:
            status = str(data["availability_status"]).upper()
            if status in ["AVAILABLE", "ON_LEAVE", "FIELD_DUTY", "UNAVAILABLE"]:
                updates["availability_status"] = status
        if "maximum_workload" in data:
            try:
                mw = int(data["maximum_workload"])
                if 1 <= mw <= 100:
                    updates["maximum_workload"] = mw
            except (ValueError, TypeError):
                pass
        if "assigned_jurisdictions" in data and isinstance(data["assigned_jurisdictions"], list):
            updates["assigned_jurisdictions"] = data["assigned_jurisdictions"]
        return updates


class AdminDepartmentCreationSerializer:
    """Validates POST /api/departments/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        name = data.get("name")
        if not name or not isinstance(name, str) or len(name.strip()) < 3:
            errors["name"] = "Department name is required (min 3 characters)."

        description = data.get("description", "")
        contact_email = data.get("contact_email", "")
        contact_phone = data.get("contact_phone", "")
        supported_categories = data.get("supported_categories", [])
        if not isinstance(supported_categories, list):
            supported_categories = []

        if errors:
            raise ValidationError(errors)

        return {
            "department_id": str(data.get("department_id", "")).strip() or None,
            "name": str(name).strip(),
            "description": str(description).strip(),
            "supported_categories": [str(c).strip() for c in supported_categories if c],
            "contact_email": str(contact_email).strip().lower(),
            "contact_phone": str(contact_phone).strip(),
            "active": bool(data.get("active", True))
        }


class AdminDepartmentUpdateSerializer:
    """Validates PATCH /api/departments/<id>/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        updates = {}
        if "name" in data and isinstance(data["name"], str):
            updates["name"] = data["name"].strip()
        if "description" in data and isinstance(data["description"], str):
            updates["description"] = data["description"].strip()
        if "contact_email" in data:
            updates["contact_email"] = str(data["contact_email"]).strip().lower()
        if "contact_phone" in data:
            updates["contact_phone"] = str(data["contact_phone"]).strip()
        if "active" in data:
            updates["active"] = bool(data["active"])
        if "supported_categories" in data and isinstance(data["supported_categories"], list):
            updates["supported_categories"] = [str(c).strip() for c in data["supported_categories"] if c]
        return updates


class AdminSystemSettingsSerializer:
    """Validates POST / PATCH /api/admin/settings/ payload."""

    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        updates = {}
        if "default_max_officer_workload" in data:
            try:
                updates["default_max_officer_workload"] = max(1, min(50, int(data["default_max_officer_workload"])))
            except Exception:
                pass
        if "auto_closure_hours" in data:
            try:
                updates["auto_closure_hours"] = max(12, min(720, int(data["auto_closure_hours"])))
            except Exception:
                pass
        if "min_ml_confidence_threshold" in data:
            try:
                updates["min_ml_confidence_threshold"] = max(0.1, min(0.95, float(data["min_ml_confidence_threshold"])))
            except Exception:
                pass
        if "max_attachment_size_mb" in data:
            try:
                updates["max_attachment_size_mb"] = max(1, min(50, int(data["max_attachment_size_mb"])))
            except Exception:
                pass
        if "strict_jurisdiction_routing" in data:
            updates["strict_jurisdiction_routing"] = bool(data["strict_jurisdiction_routing"])
        if "auto_closure_enabled" in data:
            updates["auto_closure_enabled"] = bool(data["auto_closure_enabled"])
        if "citizen_reopen_window_days" in data:
            try:
                updates["citizen_reopen_window_days"] = max(1, min(30, int(data["citizen_reopen_window_days"])))
            except Exception:
                pass
        return updates


