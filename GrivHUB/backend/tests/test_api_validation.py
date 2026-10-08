"""
GrievanceHUB API Input Validation & Security Test Suite
Tests input boundaries, payload validation, file attachment security,
and error handling resilience.
"""

import os
import sys
import unittest
import json
import shutil
import tempfile

sys.path.insert(0, os.path.abspath("."))

from backend.grievances.serializers import (
    GrievanceSubmissionSerializer,
    GrievanceClassificationSerializer,
    OfficerCorrectionSerializer,
    AttachmentValidationSerializer,
    AdminUserCreationSerializer,
    AdminDepartmentCreationSerializer,
    ResolutionSubmissionSerializer,
    CitizenConfirmResolutionSerializer,
    CitizenReopenSerializer,
    ValidationError
)


class TestAPIValidationAndSecurity(unittest.TestCase):
    """Unit tests for input validation, schema enforcement, and security sanitization."""

    def test_01_submission_empty_title_rejected(self):
        """Verifies grievance submission with blank title is rejected."""
        payload = {
            "title": "   ",
            "description": "Valid complaint description with sufficient length."
        }
        with self.assertRaises(ValidationError) as ctx:
            GrievanceSubmissionSerializer.validate(payload)
        self.assertIn("title", ctx.exception.errors)

    def test_02_submission_short_title_rejected(self):
        """Verifies grievance submission with title < 3 characters is rejected."""
        payload = {
            "title": "No",
            "description": "Valid complaint description with sufficient length."
        }
        with self.assertRaises(ValidationError) as ctx:
            GrievanceSubmissionSerializer.validate(payload)
        self.assertIn("title", ctx.exception.errors)

    def test_03_submission_excessive_title_rejected(self):
        """Verifies grievance submission with title > 300 characters is rejected."""
        payload = {
            "title": "A" * 301,
            "description": "Valid complaint description with sufficient length."
        }
        with self.assertRaises(ValidationError) as ctx:
            GrievanceSubmissionSerializer.validate(payload)
        self.assertIn("title", ctx.exception.errors)

    def test_04_submission_short_description_rejected(self):
        """Verifies grievance submission with description < 5 characters is rejected."""
        payload = {
            "title": "Broken Streetlight",
            "description": "Bad"
        }
        with self.assertRaises(ValidationError) as ctx:
            GrievanceSubmissionSerializer.validate(payload)
        self.assertIn("description", ctx.exception.errors)

    def test_05_officer_correction_invalid_category_rejected(self):
        """Verifies officer category correction with arbitrary non-standard category is rejected."""
        payload = {
            "corrected_category": "Fake Unregistered Category",
            "reason": "Misclassified",
            "reviewer_id": "OFF-ROADS-001"
        }
        with self.assertRaises(ValidationError) as ctx:
            OfficerCorrectionSerializer.validate(payload)
        self.assertIn("corrected_category", ctx.exception.errors)

    def test_06_officer_correction_valid_category_accepted(self):
        """Verifies officer category correction with valid 8 municipal categories is accepted."""
        payload = {
            "corrected_category": "Sanitation and Waste Management",
            "reason": "Garbage issue near road",
            "reviewer_id": "OFF-ROADS-001"
        }
        validated = OfficerCorrectionSerializer.validate(payload)
        self.assertEqual(validated["corrected_category"], "Sanitation and Waste Management")

    def test_07_file_upload_dangerous_extension_rejected(self):
        """Verifies dangerous executable attachments (.exe, .sh, .php, .js) are blocked."""
        dangerous_files = [
            {"filename": "malware.exe", "size": 1024},
            {"filename": "exploit.sh", "size": 2048},
            {"filename": "backdoor.php", "size": 512},
            {"filename": "script.js", "size": 4096},
            {"filename": "payload.svg", "size": 1024}
        ]
        for f in dangerous_files:
            with self.assertRaises(ValidationError) as ctx:
                AttachmentValidationSerializer.validate_attachment(f)
            self.assertIn("attachment_security", ctx.exception.errors)

    def test_08_file_upload_unsupported_extension_rejected(self):
        """Verifies files with unpermitted extensions (e.g. .mp4, .zip) are rejected."""
        invalid_file = {"filename": "archive.zip", "size": 2048}
        with self.assertRaises(ValidationError) as ctx:
            AttachmentValidationSerializer.validate_attachment(invalid_file)
        self.assertIn("attachment_extension", ctx.exception.errors)

    def test_09_file_upload_oversized_file_rejected(self):
        """Verifies files larger than 10MB limit are rejected."""
        oversized_file = {"filename": "huge_photo.jpg", "size": 15 * 1024 * 1024}
        with self.assertRaises(ValidationError) as ctx:
            AttachmentValidationSerializer.validate_attachment(oversized_file)
        self.assertIn("attachment_size", ctx.exception.errors)

    def test_10_file_upload_valid_document_accepted(self):
        """Verifies valid photos and PDFs are sanitized and accepted."""
        valid_files = [
            {"filename": "site_photo.jpg", "size": 500000, "mime_type": "image/jpeg"},
            {"filename": "damage_report.pdf", "size": 1200000, "mime_type": "application/pdf"},
            {"filename": "evidence.png", "size": 800000, "mime_type": "image/png"}
        ]
        for f in valid_files:
            res = AttachmentValidationSerializer.validate_attachment(f)
            self.assertEqual(res["filename"], f["filename"])

    def test_11_admin_user_creation_invalid_email_rejected(self):
        """Verifies user creation without '@' in email is rejected."""
        payload = {
            "name": "Arun Verma",
            "email": "invalid-email-address",
            "role": "OFFICER"
        }
        with self.assertRaises(ValidationError) as ctx:
            AdminUserCreationSerializer.validate(payload)
        self.assertIn("email", ctx.exception.errors)

    def test_12_reopen_reason_minimum_length(self):
        """Verifies reopening a grievance requires at least 5 characters explanation."""
        payload = {"reopen_reason": "No"}
        with self.assertRaises(ValidationError) as ctx:
            CitizenReopenSerializer.validate(payload)
        self.assertIn("reopen_reason", ctx.exception.errors)


if __name__ == "__main__":
    unittest.main()
