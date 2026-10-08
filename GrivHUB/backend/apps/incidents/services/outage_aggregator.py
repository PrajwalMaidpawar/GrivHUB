import logging
from datetime import timedelta
from django.utils import timezone
from backend.grievances.models import Grievance
from backend.apps.incidents.models import Incident, IncidentGrievance

logger = logging.getLogger("grievancehub.incidents")

def check_and_aggregate_outage(new_grievance: Grievance) -> Incident:
    """
    Scans active complaints in the same service area over the past 2 hours.
    If 3 or more complaints exist for Power Outage or Transformer Fault,
    creates/aggregates them into a single Incident cluster.
    """
    if not new_grievance.service_area:
        return None

    # Filter categories relevant to power outages
    OUTAGE_CATEGORIES = [
        Grievance.Category.POWER_OUTAGE,
        Grievance.Category.TRANSFORMER_FAULT,
        "Power Outage / No Supply",
        "Transformer Fault"
    ]

    eff_cat = new_grievance.effective_category
    if eff_cat not in OUTAGE_CATEGORIES:
        return None

    time_window = timezone.now() - timedelta(hours=2)

    recent_outages = Grievance.objects.filter(
        service_area=new_grievance.service_area,
        created_at__gte=time_window
    )

    if recent_outages.count() >= 3:
        # Locate existing active incident or create a new one
        existing_incident = Incident.objects.filter(
            service_area=new_grievance.service_area,
            status__in=[Incident.Status.POTENTIAL_INCIDENT, Incident.Status.CONFIRMED_OUTAGE]
        ).first()

        if not existing_incident:
            import random
            inc_code = f"OUTAGE-{new_grievance.service_area.pincode}-{random.randint(1000, 9999)}"
            existing_incident = Incident.objects.create(
                incident_code=inc_code,
                title=f"Potential Area Power Outage in {new_grievance.service_area.substation_name}",
                service_area=new_grievance.service_area,
                status=Incident.Status.POTENTIAL_INCIDENT,
                affected_substation=new_grievance.service_area.substation_name,
                linked_complaints_count=0
            )
            logger.info(f"Created Incident Cluster {inc_code} for substation {new_grievance.service_area.substation_name}")

        # Link grievances to incident
        for grv in recent_outages:
            IncidentGrievance.objects.get_or_create(
                incident=existing_incident,
                grievance=grv
            )

        existing_incident.linked_complaints_count = existing_incident.linked_grievances.count()
        existing_incident.save(update_fields=['linked_complaints_count'])
        return existing_incident

    return None
