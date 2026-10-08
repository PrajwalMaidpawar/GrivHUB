"""
GrievanceHUB Database Integrity & Consistency Test Suite
Validates relational consistency, foreign key linkages, duplicate prevention,
and health checking across all JSON-document MongoDB collections.
"""

import os
import sys
import unittest
import json
import shutil
import tempfile

sys.path.insert(0, os.path.abspath("."))

from backend.grievances.mongo_client import MongoRepository


class TestDatabaseIntegrity(unittest.TestCase):
    """Unit tests for MongoDB repository integrity and validation logic."""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.db = MongoRepository(data_dir=self.test_dir)
        self.db._init_storage()

        # Seed or fetch valid reference departments
        self.dept_roads = self.db.get_department_by_id("DEP-ROADS")
        if not self.dept_roads:
            self.dept_roads = self.db.insert_department({
                "department_id": "DEP-ROADS",
                "name": "Roads Department",
                "code": "ROADS",
                "active": True
            })
        self.dept_swm = self.db.get_department_by_id("DEP-SWM")
        if not self.dept_swm:
            self.dept_swm = self.db.insert_department({
                "department_id": "DEP-SWM",
                "name": "Solid Waste Management",
                "code": "SWM",
                "active": True
            })

        # Seed or fetch valid officers
        self.officer1 = self.db.get_officer_by_id("OFF-ROADS-001")
        if not self.officer1:
            self.officer1 = self.db.insert_officer({
                "officer_id": "OFF-ROADS-001",
                "user_id": "USR-OFF-001",
                "name": "Inspector Ramesh Kumar",
                "department_id": "DEP-ROADS",
                "role": "MUNICIPAL_TRIAGE_OFFICER",
                "active": True
            })

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_clean_database_reports_healthy(self):
        """Verifies a properly initialized database reports healthy with 0 issues."""
        # Insert a valid grievance
        grv = self.db.insert_grievance({
            "title": "Clean Water Pipeline Leak",
            "description": "Potable water pipeline leaking at 4th cross avenue.",
            "category": "Water Supply",
            "department_id": "DEP-ROADS",
            "assigned_officer_id": "OFF-ROADS-001",
            "status": "ASSIGNED",
            "citizen_id": "CITIZEN-001"
        })

        report = self.db.verify_database_integrity()
        self.assertTrue(report["healthy"])
        self.assertEqual(report["issues_count"], 0)
        self.assertGreaterEqual(report["total_grievances"], 1)

    def test_02_detects_duplicate_grievance_ids(self):
        """Verifies database integrity audit detects duplicate grievance IDs."""
        # Insert initial grievance
        grv1 = self.db.insert_grievance({
            "grievance_id": "GRV-DUPLICATE-001",
            "title": "Road Repair Request",
            "description": "Pothole on 1st cross.",
            "status": "SUBMITTED"
        })

        # Directly insert duplicate record
        with open(self.db.grievances_file, "r", encoding="utf-8") as f:
            records = json.load(f)
        records.append({
            "grievance_id": "GRV-DUPLICATE-001",
            "title": "Duplicate grievance record",
            "status": "SUBMITTED",
            "created_at": "2026-08-21T10:00:00Z"
        })
        with open(self.db.grievances_file, "w", encoding="utf-8") as f:
            json.dump(records, f)

        report = self.db.verify_database_integrity()
        self.assertFalse(report["healthy"])
        self.assertTrue(any("Duplicate grievance_id" in issue for issue in report["issues"]))

    def test_03_detects_orphaned_assignments(self):
        """Verifies database integrity audit catches assignments referencing non-existent grievances."""
        # Insert orphaned assignment
        self.db.insert_assignment({
            "assignment_id": "ASG-ORPHAN-001",
            "grievance_id": "GRV-NON-EXISTENT-999",
            "assigned_to_officer_id": "OFF-ROADS-001",
            "department_id": "DEP-ROADS"
        })

        report = self.db.verify_database_integrity()
        self.assertFalse(report["healthy"])
        self.assertTrue(any("Orphaned assignment" in issue for issue in report["issues"]))

    def test_04_detects_orphaned_comments_and_activities(self):
        """Verifies database integrity audit detects orphaned comments and activities."""
        # Insert orphaned comment
        self.db.add_comment({
            "comment_id": "CMT-ORPHAN-001",
            "grievance_id": "GRV-GHOST-123",
            "user_id": "CITIZEN-001",
            "user_role": "CITIZEN",
            "message": "Ghost comment"
        })

        # Insert orphaned activity
        self.db.record_activity({
            "activity_id": "ACT-ORPHAN-001",
            "grievance_id": "GRV-GHOST-123",
            "activity_type": "STATUS_CHANGED",
            "actor_id": "ADMIN"
        })

        report = self.db.verify_database_integrity()
        self.assertFalse(report["healthy"])
        self.assertTrue(any("Orphaned comment" in issue for issue in report["issues"]))
        self.assertTrue(any("Orphaned activity" in issue for issue in report["issues"]))

    def test_05_detects_invalid_grievance_status(self):
        """Verifies grievances with invalid status values fail integrity checks."""
        self.db.insert_grievance({
            "grievance_id": "GRV-BAD-STATUS-01",
            "title": "Garbage dumping",
            "status": "INVALID_UNKNOWN_STATUS",
            "created_at": "2026-08-21T10:00:00Z"
        })

        report = self.db.verify_database_integrity()
        self.assertFalse(report["healthy"])
        self.assertTrue(any("invalid or missing status" in issue for issue in report["issues"]))


if __name__ == "__main__":
    unittest.main()
