import logging
import uuid
import re
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from backend.grievances.models import Grievance, GrievanceStatusHistory
from backend.apps.departments.models import Department
from backend.grievances.services.ml_classifier import get_ml_service
from backend.grievances.services.routing_service import get_routing_service
from backend.apps.ml_engine.complaint_analysis import analyze_complaint
from backend.grievances.models import ComplaintUpdate
from backend.apps.audit.models import AuditLog
from backend.apps.sla.services.sla_engine import apply_sla_to_grievance, calculate_due_date

logger = logging.getLogger("grievancehub.api")
User = get_user_model()


def _workflow_actor(request):
    if request.user and request.user.is_authenticated:
        return request.user
    return None


def _authorize_officer_action(request, grievance):
    actor = _workflow_actor(request)
    if not actor:
        return None, Response({"error": "Authentication is required."}, status=status.HTTP_401_UNAUTHORIZED)
    if actor.role not in {User.Role.OFFICER, User.Role.ADMIN} and not actor.is_superuser:
        return None, Response({"error": "Officer or administrator authorization is required."}, status=status.HTTP_403_FORBIDDEN)
    if actor.role == User.Role.OFFICER and not actor.is_superuser and grievance.assigned_officer_id != actor.id:
        return None, Response({"error": "Only the assigned officer can update this complaint."}, status=status.HTTP_403_FORBIDDEN)
    return actor, None


def _authorize_citizen_action(request, grievance):
    actor = _workflow_actor(request)
    if not actor:
        return None, Response({"error": "Authentication is required."}, status=status.HTTP_401_UNAUTHORIZED)
    if actor.role not in {User.Role.CONSUMER, User.Role.ADMIN} and not actor.is_superuser:
        return None, Response({"error": "The complaint owner must be authenticated."}, status=status.HTTP_403_FORBIDDEN)
    if actor.role == User.Role.CONSUMER and not actor.is_superuser and grievance.consumer_id != actor.id:
        return None, Response({"error": "Only the complaint owner can access or review this complaint."}, status=status.HTTP_403_FORBIDDEN)
    return actor, None


def _record_workflow_event(grievance, actor, from_status, to_status, remarks, action_type, details=None):
    GrievanceStatusHistory.objects.create(
        grievance=grievance,
        from_status=from_status,
        to_status=to_status,
        changed_by=actor,
        remarks=remarks,
    )
    AuditLog.objects.create(
        actor=actor,
        action_type=action_type,
        resource_type="GRIEVANCE",
        resource_id=str(grievance.id),
        details=details or {"complaint_number": grievance.complaint_number, "status": to_status},
    )


def _workflow_payload(grievance):
    consumer = grievance.consumer
    return {
        "id": str(grievance.id),
        "grievance_id": grievance.complaint_number,
        "complaint_number": grievance.complaint_number,
        "title": grievance.title,
        "description": grievance.description,
        "category": grievance.effective_category,
        "predicted_category": grievance.predicted_category,
        "priority": grievance.priority,
        "safety_risk_level": grievance.safety_risk_level,
        "safety_flag": grievance.safety_risk_level != Grievance.RiskLevel.NONE,
        "consumer": {
            "id": str(consumer.id),
            "name": consumer.get_full_name() or consumer.username,
            "username": consumer.username,
            "phone": consumer.phone_number,
            "consumer_number": grievance.consumer_number,
        },
        "consumer_number": grievance.consumer_number,
        "location": grievance.location,
        "location_address": grievance.location_address,
        "sla": {
            "policy_name": grievance.sla_policy.name if grievance.sla_policy else "Standard MSEDCL SLA",
            "sla_status": grievance.sla_status,
            "escalation_level": grievance.escalation_level,
            "escalation_display": grievance.escalation_display,
            "due_at": grievance.due_at,
            "breached_at": grievance.breached_at,
            "remaining_seconds": grievance.remaining_seconds,
            "is_overdue": grievance.is_breached,
            "is_warning": grievance.is_warning,
            "is_paused": grievance.is_paused,
            "pause_reason": grievance.pause_reason,
            "total_paused_seconds": grievance.total_paused_seconds,
        },
        "due_at": grievance.due_at,
        "assigned_officer": grievance.assigned_officer.get_full_name() if grievance.assigned_officer else None,
        "assigned_officer_id": str(grievance.assigned_officer_id) if grievance.assigned_officer_id else None,
        "status": grievance.status,
        "attachments": grievance.attachments,
        "progress_updates": grievance.progress_updates,
        "resolution_summary": grievance.resolution_summary,
        "resolution_details": grievance.resolution_details,
        "resolution_evidence": grievance.resolution_evidence,
        "created_at": grievance.created_at,
        "updated_at": grievance.updated_at,
        "resolved_at": grievance.resolved_at,
        "citizen_rating": grievance.citizen_rating,
        "citizen_feedback": grievance.citizen_feedback,
        "reopen_reason": grievance.reopen_reason,
    }

@api_view(['GET'])
@permission_classes([AllowAny])
def system_health_view(request):
    return Response({
        "status": "HEALTHY",
        "system": "GrievanceHUB Electricity Grievance System",
        "version": "1.0.0"
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def ml_health_view(request):
    ml_service = get_ml_service()
    is_ready = ml_service.model is not None
    return Response({
        "ml_status": "READY" if is_ready else "NOT_LOADED",
        "model_version": getattr(ml_service, "model_version", "1.0.0")
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def classify_text_view(request):
    text = f"{request.data.get('title', '')} {request.data.get('text', '')}".strip()
    if not text:
        return Response({"error": "Text field is required for classification."}, status=status.HTTP_400_BAD_REQUEST)

    ml_service = get_ml_service()
    result = analyze_complaint(
        ml_service,
        request.data.get("title", ""),
        request.data.get("text", ""),
        request.data.get("custom_threshold") or request.data.get("threshold"),
    )
    return Response(result)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def submit_grievance_view(request):
    if request.method == 'GET':
        if request.user.role == User.Role.CONSUMER:
            grievances = Grievance.objects.filter(consumer=request.user).select_related("consumer", "assigned_officer", "assigned_department", "sla_policy").all()[:100]
        elif request.user.role == User.Role.OFFICER:
            grievances = Grievance.objects.filter(
                Q(assigned_officer=request.user) | Q(assigned_department__officers=request.user)
            ).distinct().select_related("consumer", "assigned_officer", "assigned_department", "sla_policy").all()[:100]
        else:
            grievances = Grievance.objects.select_related("consumer", "assigned_officer", "assigned_department", "sla_policy").all()[:100]
        data = [_workflow_payload(g) for g in grievances]
        return Response({"grievances": data})

    elif request.method == 'POST':
        title = request.data.get("title")
        description = request.data.get("description")
        provided_category = request.data.get("selected_category") or request.data.get("category")
        location = request.data.get("location", {})
        location_address = request.data.get("location_address", "")
        if isinstance(location, dict):
            location_address = ", ".join(
                str(location.get(key)).strip()
                for key in ("address", "locality", "serviceArea", "subDivision", "division", "circle", "region", "city", "district", "state", "pinCode")
                if location.get(key)
            )
        consumer_number = str(request.data.get("consumer_number", "")).strip()
        attachments = request.data.get("attachments", [])
        if not isinstance(attachments, list):
            return Response({"error": "Attachments must be a list."}, status=status.HTTP_400_BAD_REQUEST)
        if len(consumer_number) > 32 or (consumer_number and not re.match(r"^[A-Za-z0-9\-]+$", consumer_number)):
            return Response({"error": "Consumer number contains invalid characters."}, status=status.HTTP_400_BAD_REQUEST)

        if not title or not description:
            return Response({"error": "Title and description are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        # Auto-fill consumer_number from profile if not explicitly supplied
        if not consumer_number and hasattr(user, 'consumer_profile') and user.consumer_profile:
            consumer_number = user.consumer_profile.consumer_number

        ml_service = get_ml_service()
        pred_res = analyze_complaint(ml_service, title, description)
        predicted_category = pred_res.get("predicted_category") or Grievance.Category.GENERAL_SERVICES
        if provided_category in dict(Grievance.Category.choices):
            predicted_category = provided_category

        priority = pred_res["priority"]
        risk_level = pred_res["safety_risk_level"]
        priority_source = Grievance.PrioritySource.RULE_BASED

        num_str = f"MSED-{uuid.uuid4().hex[:10].upper()}"

        grievance = Grievance.objects.create(
            complaint_number=num_str,
            consumer=user,
            title=title,
            description=description,
            provided_category=provided_category,
            predicted_category=predicted_category,
            status=Grievance.Status.PENDING_ASSIGNMENT,
            priority=priority,
            priority_source=priority_source,
            safety_risk_level=risk_level,
            consumer_number=consumer_number or None,
            attachments=attachments,
            location=location if isinstance(location, dict) else {},
            location_address=location_address,
            model_version=pred_res.get("model_version", "1.0.0"),
        )
        # Apply authoritative MSEDCL SLA Engine policy and calculate due date
        apply_sla_to_grievance(grievance)

        routing_service = get_routing_service()
        dept = routing_service.route_grievance(grievance, location)
        officer = routing_service.recommend_officer(grievance)

        if officer:
            routing_service.assign_officer(grievance, officer)

        return Response({
            "message": "Grievance submitted and classified successfully.",
            "grievance_id": str(grievance.id),
            "complaint_number": grievance.complaint_number,
            "predicted_category": predicted_category,
            "assigned_department": dept.name if dept else None,
            "assigned_officer": officer.username if officer else None,
            "status": grievance.status,
            "grievance": {
                "id": str(grievance.id),
                "grievance_id": grievance.complaint_number,
                "complaint_number": grievance.complaint_number,
                "title": grievance.title,
                "description": grievance.description,
                "consumer_number": grievance.consumer_number,
                "predicted_category": predicted_category,
                "provided_category": provided_category,
                "priority": grievance.priority,
                "priority_source": grievance.priority_source,
                "safety_risk_level": grievance.safety_risk_level,
                "location": location,
                "location_address": location_address,
                "service_area_id": str(grievance.service_area_id) if grievance.service_area_id else None,
                "service_area": str(grievance.service_area) if grievance.service_area else None,
                "attachments": grievance.attachments,
                "assigned_department_name": dept.name if dept else None,
                "assigned_department_id": str(dept.id) if dept else None,
                "assigned_officer_name": officer.get_full_name() if officer else None,
                "assigned_officer_id": str(officer.id) if officer else None,
                "due_at": grievance.due_at,
                "status": grievance.status,
                "created_at": grievance.created_at,
                "updated_at": grievance.updated_at,
                "model_version": grievance.model_version,
                "summary": pred_res["summary"],
                "detected_entities": pred_res["detected_entities"],
                "safety_flag": pred_res["safety_flag"],
                "safety_reason": pred_res["safety_reason"],
                "category_source": pred_res["category_source"],
            },
            "ml_inference": pred_res,
            "routing": {
                "department": dept.name if dept else None,
                "officer": officer.get_full_name() if officer else None,
            },
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def get_grievance_detail_view(request, grievance_id):
    try:
        grievance = Grievance.objects.select_related('consumer', 'assigned_officer', 'assigned_department', 'sla_policy').get(id=grievance_id)
    except (Grievance.DoesNotExist, ValueError):
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)

    # Consumer data isolation check: a consumer can only access their own grievance
    if request.user.role == User.Role.CONSUMER and not request.user.is_superuser:
        if grievance.consumer_id != request.user.id:
            return Response({"error": "You do not have permission to access this grievance."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        payload = _workflow_payload(grievance)
        payload.update({
            "verified_category": grievance.verified_category,
            "assigned_department": grievance.assigned_department.name if grievance.assigned_department else None,
        })
        return Response(payload)
    elif request.method == 'PATCH':
        if request.user.role not in [User.Role.OFFICER, User.Role.ADMIN] and not request.user.is_superuser:
            return Response({"error": "Only authorized officers or administrators can update grievance status."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == User.Role.OFFICER and not request.user.is_superuser and grievance.assigned_officer_id != request.user.id:
            return Response({"error": "Only the assigned officer can update this complaint."}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get("status")
        if new_status in dict(Grievance.Status.choices):
            old_status = grievance.status
            grievance.status = new_status
            if new_status in [Grievance.Status.RESOLVED, Grievance.Status.CLOSED] and not grievance.resolved_at:
                grievance.resolved_at = timezone.now()
                grievance.sla_status = Grievance.SLAStatus.RESOLVED
            grievance.save()
            GrievanceStatusHistory.objects.create(
                grievance=grievance,
                from_status=old_status,
                to_status=new_status,
                changed_by=request.user,
                remarks=request.data.get("remarks", "Status updated via API")
            )
        return Response({"message": "Grievance status updated.", "status": grievance.status})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def officer_start_work_view(request, grievance_id):
    grievance = Grievance.objects.filter(id=grievance_id).first()
    if not grievance:
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)
    actor, error = _authorize_officer_action(request, grievance)
    if error:
        return error
    if grievance.status != Grievance.Status.ASSIGNED:
        return Response({"error": "Only assigned complaints can be started."}, status=status.HTTP_409_CONFLICT)
    notes = str(request.data.get("notes", "Officer started field work.")).strip()
    now = timezone.now()
    with transaction.atomic():
        old_status = grievance.status
        grievance.status = Grievance.Status.IN_PROGRESS
        grievance.started_at = now
        grievance.progress_updates = [
            *grievance.progress_updates,
            {"stage": "INVESTIGATION_STARTED", "note": notes, "attachments": [], "created_at": now.isoformat(), "created_by": actor.username},
        ]
        grievance.save(update_fields=["status", "started_at", "progress_updates", "updated_at"])
        _record_workflow_event(grievance, actor, old_status, grievance.status, notes, "OFFICER_STARTED_WORK")
    return Response({"message": "Work started successfully.", "status": grievance.status, "grievance": _workflow_payload(grievance)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def officer_progress_update_view(request, grievance_id):
    grievance = Grievance.objects.filter(id=grievance_id).first()
    if not grievance:
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)
    actor, error = _authorize_officer_action(request, grievance)
    if error:
        return error
    if grievance.status != Grievance.Status.IN_PROGRESS:
        return Response({"error": "Progress remarks can only be added while work is in progress."}, status=status.HTTP_409_CONFLICT)
    note = str(request.data.get("progress_note", "")).strip()
    if not note:
        return Response({"error": "Progress note is required."}, status=status.HTTP_400_BAD_REQUEST)
    stage = str(request.data.get("progress_stage", "WORK_INITIATED")).strip()
    attachments = request.data.get("attachments", [])
    if not isinstance(attachments, list):
        return Response({"error": "Attachments must be a list."}, status=status.HTTP_400_BAD_REQUEST)
    now = timezone.now()
    entry = {"stage": stage, "note": note, "attachments": attachments, "created_at": now.isoformat(), "created_by": actor.username}
    with transaction.atomic():
        grievance.progress_updates = [*grievance.progress_updates, entry]
        grievance.save(update_fields=["progress_updates", "updated_at"])
        ComplaintUpdate.objects.create(grievance=grievance, author=actor, update_text=f"{stage}: {note}")
        _record_workflow_event(grievance, actor, grievance.status, grievance.status, note, "OFFICER_PROGRESS_REMARK_ADDED", {"stage": stage, "attachments": attachments})
    return Response({"message": "Progress update recorded.", "status": grievance.status, "progress_update": entry, "grievance": _workflow_payload(grievance)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def officer_submit_resolution_view(request, grievance_id):
    grievance = Grievance.objects.filter(id=grievance_id).first()
    if not grievance:
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)
    actor, error = _authorize_officer_action(request, grievance)
    if error:
        return error
    if grievance.status != Grievance.Status.IN_PROGRESS:
        return Response({"error": "Only in-progress complaints can be resolved."}, status=status.HTTP_409_CONFLICT)
    summary = str(request.data.get("resolution_summary", "")).strip()
    details = str(request.data.get("resolution_details", "")).strip()
    evidence = request.data.get("resolution_images") or request.data.get("resolution_documents") or []
    if len(summary) < 5:
        return Response({"error": "Resolution summary is required (minimum 5 characters)."}, status=status.HTTP_400_BAD_REQUEST)
    if not isinstance(evidence, list):
        return Response({"error": "Resolution evidence must be a list."}, status=status.HTTP_400_BAD_REQUEST)
    now = timezone.now()
    with transaction.atomic():
        old_status = grievance.status
        grievance.status = Grievance.Status.RESOLVED
        grievance.resolution_summary = summary
        grievance.resolution_details = details
        grievance.resolution_evidence = evidence
        grievance.resolved_at = now
        grievance.sla_status = Grievance.SLAStatus.RESOLVED
        grievance.save(update_fields=["status", "resolution_summary", "resolution_details", "resolution_evidence", "resolved_at", "sla_status", "updated_at"])
        ComplaintUpdate.objects.create(grievance=grievance, author=actor, update_text=f"Resolution submitted: {summary}")
        _record_workflow_event(grievance, actor, old_status, grievance.status, summary, "OFFICER_RESOLUTION_SUBMITTED", {"evidence_count": len(evidence)})
        AuditLog.objects.create(
            actor=actor,
            action_type="SLA_RESOLVED",
            resource_type="GRIEVANCE",
            resource_id=str(grievance.id),
            details={"complaint_number": grievance.complaint_number, "resolved_at": now.isoformat()}
        )
    return Response({"message": "Resolution submitted successfully.", "status": grievance.status, "grievance": _workflow_payload(grievance)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def grievance_timeline_view(request, grievance_id):
    if not Grievance.objects.filter(id=grievance_id).exists():
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)
    history = GrievanceStatusHistory.objects.filter(grievance_id=grievance_id).select_related("changed_by")
    return Response({"timeline": [{
        "id": item.id,
        "from_status": item.from_status,
        "to_status": item.to_status,
        "remarks": item.remarks,
        "actor": item.changed_by.get_full_name() if item.changed_by else "System",
        "timestamp": item.timestamp,
    } for item in history]})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def grievance_comments_view(request, grievance_id):
    grievance = Grievance.objects.filter(id=grievance_id).first()
    if not grievance:
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "GET":
        comments = grievance.updates.select_related("author").all()
        return Response({"comments": [{
            "id": item.id,
            "comment": item.update_text,
            "author_name": item.author.get_full_name() or item.author.username,
            "author_role": item.author.role,
            "created_at": item.created_at,
            "is_internal_note": item.is_internal_note,
        } for item in comments]})
    actor = _workflow_actor(request)
    if not actor:
        return Response({"error": "Authorized user required."}, status=status.HTTP_403_FORBIDDEN)
    comment = str(request.data.get("comment", "")).strip()
    if not comment:
        return Response({"error": "Comment is required."}, status=status.HTTP_400_BAD_REQUEST)
    item = ComplaintUpdate.objects.create(
        grievance=grievance,
        author=actor,
        update_text=comment,
        is_internal_note=bool(request.data.get("is_internal")),
    )
    AuditLog.objects.create(actor=actor, action_type="COMPLAINT_COMMENT_ADDED", resource_type="GRIEVANCE", resource_id=str(grievance.id), details={"comment_id": item.id})
    return Response({"comment": {"id": item.id, "comment": item.update_text, "created_at": item.created_at}}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def citizen_confirm_resolution_view(request, grievance_id):
    grievance = Grievance.objects.filter(id=grievance_id).first()
    if not grievance:
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)
    actor, error = _authorize_citizen_action(request, grievance)
    if error:
        return error
    if grievance.status != Grievance.Status.RESOLVED:
        return Response({"error": "Only resolved complaints can be confirmed."}, status=status.HTTP_409_CONFLICT)
    try:
        rating = int(request.data.get("citizen_rating", request.data.get("feedback_rating", 5)))
    except (TypeError, ValueError):
        rating = 0
    if rating < 1 or rating > 5:
        return Response({"error": "Rating must be between 1 and 5."}, status=status.HTTP_400_BAD_REQUEST)
    feedback = str(request.data.get("feedback_comments", request.data.get("comments", ""))).strip()
    with transaction.atomic():
        old_status = grievance.status
        grievance.status = Grievance.Status.CLOSED
        grievance.sla_status = Grievance.SLAStatus.CLOSED
        grievance.citizen_rating = rating
        grievance.citizen_feedback = feedback
        grievance.closed_at = timezone.now()
        grievance.save(update_fields=["status", "sla_status", "citizen_rating", "citizen_feedback", "closed_at", "updated_at"])
        ComplaintUpdate.objects.create(grievance=grievance, author=actor, update_text=f"Resolution confirmed with rating {rating}/5. {feedback}".strip())
        _record_workflow_event(grievance, actor, old_status, grievance.status, feedback or "Resolution confirmed.", "CITIZEN_CONFIRMED_RESOLUTION", {"rating": rating})
    return Response({"message": "Resolution confirmed.", "status": grievance.status, "grievance": _workflow_payload(grievance)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def citizen_reopen_view(request, grievance_id):
    grievance = Grievance.objects.filter(id=grievance_id).first()
    if not grievance:
        return Response({"error": "Grievance not found."}, status=status.HTTP_404_NOT_FOUND)
    actor, error = _authorize_citizen_action(request, grievance)
    if error:
        return error
    if grievance.status not in {Grievance.Status.RESOLVED, Grievance.Status.CLOSED}:
        return Response({"error": "Only resolved or closed complaints can be reopened."}, status=status.HTTP_409_CONFLICT)
    reason = str(request.data.get("reopen_reason", request.data.get("reason", ""))).strip()
    if len(reason) < 10:
        return Response({"error": "A clear reopening reason is required (minimum 10 characters)."}, status=status.HTTP_400_BAD_REQUEST)
    with transaction.atomic():
        old_status = grievance.status
        grievance.status = Grievance.Status.REOPENED
        grievance.sla_status = Grievance.SLAStatus.ACTIVE
        grievance.reopen_reason = reason
        grievance.closed_at = None
        grievance.save(update_fields=["status", "sla_status", "reopen_reason", "closed_at", "updated_at"])
        ComplaintUpdate.objects.create(grievance=grievance, author=actor, update_text=f"Complaint reopened: {reason}")
        _record_workflow_event(grievance, actor, old_status, grievance.status, reason, "CITIZEN_REOPENED_COMPLAINT")
    return Response({"message": "Complaint reopened for follow-up.", "status": grievance.status, "grievance": _workflow_payload(grievance)})


@api_view(['POST'])
@permission_classes([AllowAny])
def trigger_routing_view(request, grievance_id):
    return Response({"message": "Routing triggered."})

@api_view(['POST'])
@permission_classes([AllowAny])
def manual_assignment_view(request, grievance_id):
    return Response({"message": "Manual assignment complete."})

@api_view(['POST'])
@permission_classes([AllowAny])
def reassign_grievance_view(request, grievance_id):
    return Response({"message": "Reassignment complete."})

@api_view(['POST'])
@permission_classes([AllowAny])
def correct_category_view(request, grievance_id):
    return Response({"message": "Category correction saved."})

@api_view(['GET'])
@permission_classes([AllowAny])
def grievance_history_view(request, grievance_id):
    history = GrievanceStatusHistory.objects.filter(grievance_id=grievance_id)
    return Response({"history": [{"from": h.from_status, "to": h.to_status, "timestamp": h.timestamp} for h in history]})

@api_view(['GET'])
@permission_classes([AllowAny])
def list_departments_view(request):
    depts = Department.objects.all()
    return Response({"departments": [{"code": d.code, "name": d.name} for d in depts]})

@api_view(['GET'])
@permission_classes([AllowAny])
def department_queue_view(request, department_id):
    return Response({"queue": []})

@api_view(['GET'])
@permission_classes([AllowAny])
def list_officers_view(request):
    officers = User.objects.filter(role=User.Role.OFFICER)
    return Response({"officers": [{"id": o.id, "username": o.username} for o in officers]})

@api_view(['GET'])
@permission_classes([AllowAny])
def officer_workload_view(request, officer_id):
    return Response({"active_workload": 0})

@api_view(['GET'])
@permission_classes([AllowAny])
def list_routing_audits_view(request):
    return Response({"audits": []})
