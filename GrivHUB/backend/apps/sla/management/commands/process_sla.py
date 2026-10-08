"""
Django management command: process_sla
Processes all active complaints, monitors SLA deadlines, marks warning/breach states,
applies hierarchical escalations, dispatches notifications, and writes audit records.
Fully idempotent.
Usage:
    python manage.py process_sla
"""

from django.core.management.base import BaseCommand
from backend.apps.sla.services.sla_engine import process_all_active_sla, ensure_default_sla_policies


class Command(BaseCommand):
    help = "Evaluates active grievance SLA deadlines, triggers warnings, breaches, and idempotent escalations."

    def add_arguments(self, parser):
        parser.add_argument(
            "--seed-only",
            action="store_true",
            help="Seed baseline MSEDCL SLA policies without processing grievances.",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting MSEDCL SLA Engine evaluation..."))

        ensure_default_sla_policies()
        if options.get("seed_only"):
            self.stdout.write(self.style.SUCCESS("MSEDCL SLA policies seeded successfully."))
            return

        result = process_all_active_sla()

        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("MSEDCL SLA Engine Processing Complete"))
        self.stdout.write(f"Timestamp:              {result['timestamp']}")
        self.stdout.write(f"Active Complaints:      {result['total_active_evaluated']}")
        self.stdout.write(f"SLA Warnings Marked:    {result['warnings_marked']}")
        self.stdout.write(f"SLA Breaches Marked:    {result['breaches_marked']}")
        self.stdout.write(f"Escalations Created:    {result['escalations_created']}")
        self.stdout.write(self.style.SUCCESS("=" * 60))
