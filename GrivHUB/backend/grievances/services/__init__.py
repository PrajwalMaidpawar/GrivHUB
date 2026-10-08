"""
GrievanceHUB ML Services Module
Exposes local machine learning inference and grievance classification.
"""

from .ml_classifier import GrievanceMLService, get_ml_service, classify_grievance

__all__ = ["GrievanceMLService", "get_ml_service", "classify_grievance"]
