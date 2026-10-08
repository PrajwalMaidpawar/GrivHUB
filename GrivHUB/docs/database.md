# GrievanceHUB Database Architecture & Schema Specification

## 1. Relational Engine
PostgreSQL is used as the primary relational database system.

## 2. Core Tables
- `users`: Standard AbstractUser extension with role flags (`CONSUMER`, `OFFICER`, `ADMIN`).
- `consumer_profiles`: Stores 12-digit consumer account number, billing address, and default service area.
- `officer_profiles`: Stores employee ID, assigned department, service circle, and active workload capacity.
- `departments`: Administrative electricity units (`POWER_SUPPLY`, `METERING`, `BILLING`, `MAINTENANCE`, `EMERGENCY_SAFETY`, `COMMERCIAL`).
- `service_areas`: Circle, division, substation, and pincode mapping for Maharashtra/Indian DISCOMs.
- `electrical_assets`: Transformers, feeders, electrical poles, substations, and meters.
- `grievances`: Main complaint record storing title, description, predicted vs verified categories, priority, safety risk level, status, SLA target due date, assigned officer, and model version.
- `grievance_status_history`: Audit tracking of state changes (`SUBMITTED` -> `AI_CLASSIFIED` -> `PENDING_ASSIGNMENT` -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`).
- `incidents`: Aggregated area-wide power outage clusters linked to multiple complaints.
- `incident_grievances`: Junction mapping between incident clusters and individual grievances.
- `sla_policies`: Resolution duration targets based on priority and category.
- `ml_predictions`: Logs original ML predictions, vector feature count, and confidence scores.
- `ml_corrections`: Captures human officer corrections to predictions for retraining feedback.
- `audit_logs`: Detailed action logging for security compliance.
