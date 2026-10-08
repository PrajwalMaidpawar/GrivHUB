"""
GrievanceHUB Analytics Service Layer
Orchestrates collection queries, date range slicing, department filtering,
ML model evaluation reading, report generation, and data export formatting.
"""

import os
import io
import csv
import json
import time
import datetime
from typing import Dict, Any, List, Optional, Tuple

from backend.grievances.mongo_client import get_db_client, MongoRepository
from .aggregations import AnalyticsAggregator

class AnalyticsService:
    """
    Service coordinating real database analytics queries and report assembly.
    """

    def __init__(self, db: Optional[MongoRepository] = None):
        self.db = db or get_db_client()
        self.aggregator = AnalyticsAggregator()

    def _get_filtered_grievances(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves and filters grievances directly from repository."""
        grievances, _ = self.db.list_grievances(limit=10000)

        # Department filter
        if department_id and department_id != "ALL":
            grievances = [g for g in grievances if g.get("assigned_department_id") == department_id]

        # Category filter
        if category and category != "ALL":
            grievances = [
                g for g in grievances
                if g.get("officer_final_category") == category or g.get("predicted_category") == category
            ]

        # Date range filter
        if start_date or end_date:
            grievances = self.aggregator.filter_by_date_range(
                grievances,
                date_field="created_at",
                start_date=start_date,
                end_date=end_date
            )

        return grievances

    def get_overview_metrics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[str] = None,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates executive dashboard metrics."""
        grievances = self._get_filtered_grievances(start_date, end_date, department_id, category)
        officers = self.db.list_officers()
        
        if department_id and department_id != "ALL":
            officers = [o for o in officers if o.get("department_id") == department_id]

        overview = self.aggregator.aggregate_overview(grievances, officers)
        overview["query_filter"] = {
            "start_date": start_date,
            "end_date": end_date,
            "department_id": department_id or "ALL",
            "category": category or "ALL"
        }
        return overview

    def get_grievance_trends(
        self,
        group_by: str = "day",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Returns time series volume trends."""
        valid_groupings = {"day", "week", "month"}
        selected_group = group_by.lower() if group_by.lower() in valid_groupings else "day"
        grievances = self._get_filtered_grievances(start_date, end_date, department_id, category)
        return self.aggregator.aggregate_trends(grievances, group_by=selected_group)

    def get_category_distribution(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Returns category breakdown metrics."""
        grievances = self._get_filtered_grievances(start_date, end_date, department_id)
        return self.aggregator.aggregate_categories(grievances)

    def get_status_distribution(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[str] = None
    ) -> Dict[str, int]:
        """Returns grievance counts by status."""
        grievances = self._get_filtered_grievances(start_date, end_date, department_id)
        statuses: Dict[str, int] = {
            "SUBMITTED": 0,
            "ASSIGNED": 0,
            "IN_PROGRESS": 0,
            "RESOLVED": 0,
            "CLOSED": 0,
            "REOPENED": 0,
            "REJECTED": 0
        }
        for g in grievances:
            st = g.get("status", "SUBMITTED")
            statuses[st] = statuses.get(st, 0) + 1
        return statuses

    def get_department_analytics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Returns departmental workloads, resolutions, and capacity stats."""
        grievances = self._get_filtered_grievances(start_date, end_date)
        departments = self.db.list_departments()
        officers = self.db.list_officers()
        return self.aggregator.aggregate_departments(grievances, departments, officers)

    def get_resolution_time_analytics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates actual resolution duration analytics."""
        grievances = self._get_filtered_grievances(start_date, end_date, department_id)
        departments = self.db.list_departments()
        return self.aggregator.aggregate_resolution_times(grievances, departments)

    def get_officer_workload_analytics(
        self,
        department_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Returns officer workload, utilization, and capacity metrics."""
        officers = self.db.list_officers(department_id=department_id if department_id != "ALL" else None)
        grievances, _ = self.db.list_grievances(limit=10000)
        departments = self.db.list_departments()
        return self.aggregator.aggregate_officer_workload(officers, grievances, departments)

    def get_reopen_analytics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Returns reopen statistics and reason breakdowns."""
        grievances = self._get_filtered_grievances(start_date, end_date, department_id)
        departments = self.db.list_departments()
        return self.aggregator.aggregate_reopens(grievances, departments)

    def get_routing_analytics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Returns auto-routing metrics and assignment latencies."""
        grievances = self._get_filtered_grievances(start_date, end_date)
        routing_audits = self.db.list_routing_audits(limit=5000)
        
        # Load assignments
        assignments = []
        if hasattr(self.db, "assignments_file") and os.path.exists(self.db.assignments_file):
            try:
                with open(self.db.assignments_file, "r", encoding="utf-8") as f:
                    assignments = json.load(f)
            except Exception:
                assignments = []

        return self.aggregator.aggregate_routing(routing_audits, assignments, grievances)

    def get_geographic_analytics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Returns location, zone, and ward aggregations."""
        grievances = self._get_filtered_grievances(start_date, end_date)
        return self.aggregator.aggregate_locations(grievances)

    def get_ml_model_monitoring(self) -> Dict[str, Any]:
        """Returns offline model evaluation benchmark and live production feedback agreement."""
        grievances, _ = self.db.list_grievances(limit=10000)
        feedback_records = self.db.list_feedback(limit=5000)
        return self.aggregator.aggregate_ml_monitoring(grievances, feedback_records)

    def get_ml_confusion_matrix(self) -> Dict[str, Any]:
        """Returns category confusion matrix from human-reviewed ground truth."""
        ml_data = self.get_ml_model_monitoring()
        return ml_data.get("live_feedback_monitoring", {}).get("confusion_matrix", {"labels": [], "matrix": []})

    def get_ml_confidence_metrics(self) -> Dict[str, Any]:
        """Returns confidence distribution and low confidence alert statistics."""
        ml_data = self.get_ml_model_monitoring()
        live = ml_data.get("live_feedback_monitoring", {})
        return {
            "average_confidence": live.get("average_confidence"),
            "low_confidence_count": live.get("low_confidence_predictions_count"),
            "distribution_buckets": live.get("confidence_distribution_buckets", {})
        }

    def get_data_quality_audit(self) -> Dict[str, Any]:
        """Runs automated municipal data health audit."""
        grievances, _ = self.db.list_grievances(limit=10000)
        officers = self.db.list_officers()
        departments = self.db.list_departments()
        return self.aggregator.audit_data_quality(grievances, officers, departments)

    def export_grievances_csv(
        self,
        dataset_type: str = "grievances",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[str] = None
    ) -> str:
        """Alias for export_analytics_csv."""
        return self.export_analytics_csv(dataset_type, start_date, end_date, department_id)

    def export_analytics_csv(
        self,
        dataset_type: str = "grievances",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[str] = None
    ) -> str:
        """
        Generates genuine CSV export string from filtered database records.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        if dataset_type == "departments":
            dept_data = self.get_department_analytics(start_date, end_date)
            writer.writerow(["Department ID", "Department Name", "Total Grievances", "Active Backlog", "Resolved", "Closed", "Reopened", "Avg Resolution (Hours)", "Reopen Rate (%)", "Officers Count", "Capacity Utilization (%)"])
            for d in dept_data:
                writer.writerow([
                    d.get("department_id"),
                    d.get("name"),
                    d.get("total"),
                    d.get("active"),
                    d.get("resolved"),
                    d.get("closed"),
                    d.get("reopened"),
                    d.get("average_resolution_hours") if d.get("average_resolution_hours") is not None else "N/A",
                    round(d.get("reopen_rate", 0) * 100, 1),
                    d.get("officer_count"),
                    d.get("capacity_utilization_pct") if d.get("capacity_utilization_pct") is not None else "N/A"
                ])

        elif dataset_type == "officers":
            officer_data = self.get_officer_workload_analytics(department_id)
            writer.writerow(["Officer ID", "Officer Name", "Department", "Designation", "Availability", "Active Cases", "Total Assigned", "Resolved Cases", "Closed Cases", "Reopened Cases", "Max Capacity", "Utilization (%)"])
            for o in officer_data:
                writer.writerow([
                    o.get("officer_id"),
                    o.get("name"),
                    o.get("department"),
                    o.get("designation"),
                    o.get("availability_status"),
                    o.get("active_cases"),
                    o.get("total_assigned_cases"),
                    o.get("resolved_cases"),
                    o.get("closed_cases"),
                    o.get("reopened_cases"),
                    o.get("maximum_capacity"),
                    o.get("utilization_percentage") if o.get("utilization_percentage") is not None else "N/A"
                ])

        elif dataset_type == "categories":
            cat_data = self.get_category_distribution(start_date, end_date, department_id)
            writer.writerow(["Category", "Total Count", "Active", "Resolved", "Closed", "Reopened", "Human Corrected Count", "Avg Confidence", "Avg Resolution (Hours)", "Reopen Rate (%)"])
            for c in cat_data:
                writer.writerow([
                    c.get("category"),
                    c.get("count"),
                    c.get("active"),
                    c.get("resolved"),
                    c.get("closed"),
                    c.get("reopened"),
                    c.get("corrected_count"),
                    c.get("average_confidence") if c.get("average_confidence") is not None else "N/A",
                    c.get("average_resolution_hours") if c.get("average_resolution_hours") is not None else "N/A",
                    round(c.get("reopen_rate", 0) * 100, 1)
                ])

        else: # Default: grievances
            grievances = self._get_filtered_grievances(start_date, end_date, department_id)
            writer.writerow(["Grievance ID", "Title", "Category", "Confidence", "Status", "Priority", "Department ID", "Officer ID", "Ward", "Zone", "Created At", "Resolved At", "Closed At"])
            for g in grievances:
                loc = g.get("location") or {}
                cat = g.get("officer_final_category") or g.get("predicted_category") or ""
                writer.writerow([
                    g.get("grievance_id"),
                    g.get("title"),
                    cat,
                    g.get("classification_confidence"),
                    g.get("status"),
                    g.get("priority"),
                    g.get("assigned_department_id"),
                    g.get("assigned_officer_id"),
                    loc.get("ward", ""),
                    loc.get("zone", ""),
                    g.get("created_at"),
                    g.get("resolved_at", ""),
                    g.get("closed_at", "")
                ])

        return output.getvalue()

    def generate_municipal_report(
        self,
        report_type: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        department_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates structured official municipal intelligence report data.
        """
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        date_range_label = f"{start_date or 'All Time'} to {end_date or 'Present'}"

        if report_type == "department-performance":
            dept_stats = self.get_department_analytics(start_date, end_date)
            return {
                "report_title": "Municipal Department Performance & SLA Report",
                "report_id": f"REP-DEP-{int(time.time())}",
                "generated_at": now_iso,
                "date_range": date_range_label,
                "data_source": "GrievanceHUB Municipal Database Engine",
                "summary": {
                    "total_departments": len(dept_stats),
                    "total_grievances_evaluated": sum(d.get("total", 0) for d in dept_stats),
                    "total_active_backlog": sum(d.get("active", 0) for d in dept_stats),
                    "total_resolved": sum(d.get("resolved", 0) + d.get("closed", 0) for d in dept_stats)
                },
                "records": dept_stats,
                "limitations": "Resolution hours require both created_at and resolved_at timestamps."
            }

        elif report_type == "officer-workload":
            officer_stats = self.get_officer_workload_analytics(department_id)
            return {
                "report_title": "Field Workforce Capacity & Workload Allocation Report",
                "report_id": f"REP-OFF-{int(time.time())}",
                "generated_at": now_iso,
                "date_range": date_range_label,
                "data_source": "GrievanceHUB Field Workforce & Dynamic Workload Registry",
                "summary": {
                    "total_officers": len(officer_stats),
                    "available_officers": sum(1 for o in officer_stats if o.get("availability_status") == "AVAILABLE"),
                    "overloaded_officers": sum(1 for o in officer_stats if o.get("is_overloaded")),
                    "total_active_tasks": sum(o.get("active_cases", 0) for o in officer_stats)
                },
                "records": officer_stats,
                "limitations": "Workload considers ASSIGNED, IN_PROGRESS, and REOPENED active statuses."
            }

        elif report_type == "category-demand":
            cat_stats = self.get_category_distribution(start_date, end_date, department_id)
            return {
                "report_title": "Civic Demand & Category Distribution Report",
                "report_id": f"REP-CAT-{int(time.time())}",
                "generated_at": now_iso,
                "date_range": date_range_label,
                "data_source": "GrievanceHUB Category Registry & Officer Validations",
                "summary": {
                    "categories_evaluated": len(cat_stats),
                    "total_grievances": sum(c.get("count", 0) for c in cat_stats),
                    "total_human_corrections": sum(c.get("corrected_count", 0) for c in cat_stats)
                },
                "records": cat_stats,
                "limitations": "Uses officer verified category with fallback to AI model prediction."
            }

        elif report_type == "ml-feedback":
            ml_data = self.get_ml_model_monitoring()
            return {
                "report_title": "Machine Learning Model Evaluation & Production Feedback Report",
                "report_id": f"REP-ML-{int(time.time())}",
                "generated_at": now_iso,
                "date_range": "Model Baseline to Live Production",
                "data_source": "Core ML Model Evaluation Artifacts & Officer Category Feedback",
                "offline_evaluation": ml_data.get("offline_evaluation"),
                "live_feedback": ml_data.get("live_feedback_monitoring"),
                "limitations": "Live agreement rate requires human officer review or admin classification override."
            }

        else: # Default: summary report
            overview = self.get_overview_metrics(start_date, end_date, department_id)
            res_times = self.get_resolution_time_analytics(start_date, end_date, department_id)
            routing = self.get_routing_analytics(start_date, end_date)
            return {
                "report_title": "Comprehensive Municipal Grievance Executive Summary",
                "report_id": f"REP-SUM-{int(time.time())}",
                "generated_at": now_iso,
                "date_range": date_range_label,
                "data_source": "GrievanceHUB Consolidated Municipal Data Layer",
                "overview_metrics": overview,
                "resolution_metrics": res_times.get("overall"),
                "routing_efficiency": routing,
                "limitations": "All calculations derived from live immutable repository state."
            }


_analytics_service_instance: Optional[AnalyticsService] = None

def get_analytics_service() -> AnalyticsService:
    """Returns singleton analytics service instance."""
    global _analytics_service_instance
    if _analytics_service_instance is None:
        _analytics_service_instance = AnalyticsService()
    return _analytics_service_instance
