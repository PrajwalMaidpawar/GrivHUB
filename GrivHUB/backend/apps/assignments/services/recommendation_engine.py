import logging
from typing import List, Dict, Any
from django.contrib.auth import get_user_model
from backend.apps.accounts.models import OfficerProfile
from backend.grievances.models import Grievance
from backend.apps.departments.models import Department

logger = logging.getLogger("grievancehub.assignments")
User = get_user_model()

def recommend_officers_for_grievance(grievance: Grievance) -> List[Dict[str, Any]]:
    """
    Ranks eligible field officers based on Department Match, Availability, and Current Workload.
    
    Scoring Formula:
        Score = (Department_Match * 0.40) + (Availability_Score * 0.30) + (Workload_Capacity_Score * 0.30)
    """
    officer_users = User.objects.filter(
        role=User.Role.OFFICER,
        is_active=True,
        is_verified=True
    ).select_related('officer_profile')

    dept = grievance.assigned_department
    recommendations = []

    for user in officer_users:
        profile = getattr(user, 'officer_profile', None)
        if not profile:
            continue

        # Strictly filter out unapproved, rejected, or suspended officers
        if profile.approval_status != OfficerProfile.ApprovalStatus.APPROVED:
            continue

        # 1. Department Score (1.0 if matching department or head officer, 0.5 otherwise)
        is_dept_match = bool(dept and profile.department and profile.department.upper() == dept.code.upper())
        is_head = bool(dept and dept.head_officer_id == user.id)
        dept_match = 1.0 if (is_dept_match or is_head) else 0.5

        # 2. Availability Score (1.0 if AVAILABLE, 0.5 if ON_FIELD, 0.0 if OFF_DUTY)
        if profile.availability_status == OfficerProfile.Status.AVAILABLE:
            avail_score = 1.0
        elif profile.availability_status == OfficerProfile.Status.ON_FIELD:
            avail_score = 0.5
        else:
            avail_score = 0.0

        # 3. Workload Capacity Score
        active_assigned_count = user.assigned_grievances.filter(
            status__in=[Grievance.Status.ASSIGNED, Grievance.Status.IN_PROGRESS, Grievance.Status.REOPENED]
        ).count()

        max_cap = max(1, profile.max_active_workload)
        capacity_ratio = max(0.0, 1.0 - (active_assigned_count / max_cap))

        # Composite Score
        total_score = (dept_match * 0.40) + (avail_score * 0.30) + (capacity_ratio * 0.30)

        recommendations.append({
            "officer_id": user.id,
            "username": user.username,
            "full_name": user.get_full_name() or user.username,
            "designation": profile.designation,
            "availability_status": profile.availability_status,
            "active_workload": active_assigned_count,
            "max_workload": max_cap,
            "recommendation_score": round(total_score, 2),
            "explanation": f"Dept Match ({int(dept_match*100)}%), Avail ({profile.availability_status}), Active Workload ({active_assigned_count}/{max_cap})"
        })

    recommendations.sort(key=lambda x: x["recommendation_score"], reverse=True)
    return recommendations
