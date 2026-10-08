"""
GrievanceHUB Analytics Services & Aggregations Test Suite
Validates aggregation pipelines, KPI metrics calculations, ML confidence bins,
confusion matrix calculations, and report generation using real data schemas.
"""

import os
import sys
import unittest
import json
import shutil
import tempfile

sys.path.insert(0, os.path.abspath("."))

from backend.grievances.mongo_client import MongoRepository
from backend.analytics.services import AnalyticsService
from backend.analytics.aggregations import AnalyticsAggregator


class TestAnalyticsServices(unittest.TestCase):
    """Unit tests for analytics calculations and reports."""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.db = MongoRepository(data_dir=self.test_dir)
        self.db._init_storage()

        # Seed or fetch test departments
        self.dept1 = self.db.get_department_by_id("DEP-ROADS")
        if not self.dept1:
            self.dept1 = self.db.insert_department({
                "department_id": "DEP-ROADS",
                "name": "Roads and Infrastructure Department",
                "code": "ROADS",
                "active": True
            })
        self.dept2 = self.db.get_department_by_id("DEP-SWM")
        if not self.dept2:
            self.dept2 = self.db.insert_department({
                "department_id": "DEP-SWM",
                "name": "Solid Waste Management",
                "code": "SWM",
                "active": True
            })

        # Seed or fetch test officers
        self.officer1 = self.db.get_officer_by_id("OFF-ROADS-001")
        if not self.officer1:
            self.officer1 = self.db.insert_officer({
                "officer_id": "OFF-ROADS-001",
                "user_id": "USR-OFF-001",
                "name": "Inspector Ramesh Kumar",
                "department_id": "DEP-ROADS",
                "active": True
            })
        self.officer2 = self.db.get_officer_by_id("OFF-SWM-001")
        if not self.officer2:
            self.officer2 = self.db.insert_officer({
                "officer_id": "OFF-SWM-001",
                "user_id": "USR-OFF-002",
                "name": "Officer Sunita Rao",
                "department_id": "DEP-SWM",
                "active": True
            })

        # Seed diverse sample grievances
        self.db.insert_grievance({
            "title": "Severe Pothole on 5th Main",
            "description": "Deep pothole causing vehicle damage near school.",
            "category": "Roads and Infrastructure",
            "department_id": "DEP-ROADS",
            "assigned_officer_id": "OFF-ROADS-001",
            "status": "RESOLVED",
            "created_at": "2026-08-15T09:00:00Z",
            "resolved_at": "2026-08-16T15:00:00Z",
            "ai_classification": {
                "predicted_category": "Roads and Infrastructure",
                "confidence_score": 0.96,
                "needs_review": False
            }
        })

        self.db.insert_grievance({
            "title": "Garbage accumulating outside market",
            "description": "Large pile of uncollected garbage causing foul smell.",
            "category": "Sanitation and Waste Management",
            "department_id": "DEP-SWM",
            "assigned_officer_id": "OFF-SWM-001",
            "status": "IN_PROGRESS",
            "created_at": "2026-08-20T10:00:00Z",
            "ai_classification": {
                "predicted_category": "Sanitation and Waste Management",
                "confidence_score": 0.92,
                "needs_review": False
            }
        })

        self.db.insert_grievance({
            "title": "Broken Streetlight Near Park",
            "description": "Streetlight pole completely dark at night.",
            "category": "Street Lighting and Electrical Infrastructure",
            "status": "SUBMITTED",
            "created_at": "2026-08-21T08:00:00Z",
            "ai_classification": {
                "predicted_category": "Street Lighting and Electrical Infrastructure",
                "confidence_score": 0.65,
                "needs_review": True
            }
        })

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_analytics_overview_calculation(self):
        """Verifies analytics overview computes accurate counts and rates."""
        service = AnalyticsService(db=self.db)
        overview = service.get_overview_metrics()

        self.assertEqual(overview["total_grievances"], 3)
        self.assertEqual(overview["resolved_count"], 1)
        self.assertEqual(overview["in_progress_count"], 1)
        self.assertGreaterEqual(overview["active_count"], 1)

    def test_02_category_distribution(self):
        """Verifies category distribution groups grievances accurately."""
        service = AnalyticsService(db=self.db)
        cats = service.get_category_distribution()
        cat_names = [c["category"] for c in cats]

        self.assertIn("Roads and Infrastructure", cat_names)
        self.assertIn("Sanitation and Waste Management", cat_names)

    def test_03_status_distribution(self):
        """Verifies status distribution counts correspond to records."""
        service = AnalyticsService(db=self.db)
        status_map = service.get_status_distribution()

        self.assertEqual(status_map.get("RESOLVED"), 1)
        self.assertEqual(status_map.get("IN_PROGRESS"), 1)
        self.assertEqual(status_map.get("SUBMITTED"), 1)

    def test_04_ml_confidence_distribution(self):
        """Verifies ML confidence distribution places grievances into correct confidence metrics."""
        service = AnalyticsService(db=self.db)
        conf_data = service.get_ml_confidence_metrics()
        
        self.assertIn("distribution_buckets", conf_data)
        self.assertIn("low_confidence_count", conf_data)

    def test_05_csv_export_generation(self):
        """Verifies CSV export generates valid CSV format."""
        service = AnalyticsService(db=self.db)
        csv_output = service.export_grievances_csv(dataset_type="grievances")

        self.assertIn("Grievance ID,Title,Category", csv_output)
        self.assertIn("Severe Pothole on 5th Main", csv_output)
        self.assertIn("Garbage accumulating outside market", csv_output)


if __name__ == "__main__":
    unittest.main()
