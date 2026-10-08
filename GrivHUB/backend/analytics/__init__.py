"""
GrievanceHUB Analytics Engine
Provides real-time data-driven aggregations, trends, department metrics,
resolution time distributions, officer workload metrics, ML model evaluation
benchmarks, live prediction feedback tracking, and data quality audits.
"""

from .services import AnalyticsService, get_analytics_service

__all__ = ["AnalyticsService", "get_analytics_service"]
