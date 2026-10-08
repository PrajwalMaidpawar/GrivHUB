# GrievanceHUB — Phase 12 Completion Report
## Intelligent Grievance Routing and Officer Assignment Engine

**Project:** GrievanceHUB  
**Phase:** Phase 12 — Intelligent Grievance Routing and Officer Assignment  
**Execution Date:** August 21, 2026  
**Status:** Completed & Fully Verified  

---

### 1. Department Structure Implemented

A configurable, database-driven administrative hierarchy was implemented representing municipal civic departments (patterned on Indian municipal corporations such as Bruhat Bengaluru Mahanagara Palike - BBMP). Departments are stored in the MongoDB `departments` collection.

| Department ID | Department Name | Key Responsibilities & Scope | Supported Categories |
|---|---|---|---|
| `DEP-ROADS` | Roads and Infrastructure Department | Asphalt repair, potholes, flyovers, footpath paving, civil works | `["Roads and Infrastructure"]` |
| `DEP-WATER` | Water Supply and Sewerage Board | Potable piped water, pressure drops, pipeline leakages, tankers | `["Water Supply"]` |
| `DEP-SWM` | Solid Waste Management and Sanitation | Waste collection, blackspots, street sweeping, dump sites | `["Sanitation and Waste Management"]` |
| `DEP-DRAIN` | Drainage and Stormwater Sewage Department | Open stormwater drains (SWD), underground drainage (UGD), manholes | `["Drainage and Sewage"]` |
| `DEP-ELEC` | Street Lighting and Electrical Infrastructure | Streetlights, high-mast lamps, exposed cables, timer panels | `["Street Lighting and Electrical Infrastructure"]` |
| `DEP-PARKS` | Parks, Horticulture and Urban Environment | Public parks, green spaces, dangerous branches, civic tree planting | `["Parks and Environment"]` |
| `DEP-TRANS` | Transportation and Traffic Infrastructure | Traffic lights, zebra crossings, pedestrian subways, bus shelters | `["Transportation and Traffic Infrastructure"]` |
| `DEP-CIVIC` | General Civic Services and Revenue Administration | Trade licenses, birth/death records, stray animal control, civic queries | `["General Civic Services"]` |

---

### 2. Category to Department Mapping

Category resolution is fully centralized in `backend/grievances/services/routing_service.py` via database queries against `departments.supported_categories`.

```
Predicted Category (or Officer-Corrected Final Category)
                      ↓
  Query Responsible Department via MongoDB Store
                      ↓
  Matched Department ID & Administrative Queue
```

---

### 3. Officer Profile Structure

Officer profiles are stored in the MongoDB `officers` collection. Profiles contain administrative details, contact info, assigned department, jurisdiction mappings, active status, availability, and capacity limits:

```json
{
  "officer_id": "OFF-ROADS-001",
  "user_id": "USR-OFF-001",
  "name": "Rajesh Kumar",
  "email": "rajesh.roads@bbmp.gov.in",
  "phone": "+91-9880112201",
  "department_id": "DEP-ROADS",
  "designation": "Assistant Executive Engineer (Roads)",
  "assigned_jurisdictions": [
    {"zone": "East Zone", "ward": "Ward 112"},
    {"zone": "East Zone", "ward": "Ward 113"}
  ],
  "active": true,
  "availability_status": "AVAILABLE",
  "maximum_workload": 10,
  "last_assigned_at": "2026-08-21T19:36:30Z",
  "created_at": "2026-08-21T19:30:00Z",
  "updated_at": "2026-08-21T19:36:30Z"
}
```

*Availability Status Options:* `AVAILABLE`, `BUSY`, `UNAVAILABLE`, `ON_LEAVE`.

---

### 4. Location and Jurisdiction Structure

Location matching supports flexible granular geographic hierarchies across Indian civic zones and wards:

```
Jurisdiction Match Priority Hierarchy:
1. Exact Ward Match (e.g. Ward 112)
        ↓
2. Zone Match (e.g. East Zone)
        ↓
3. City / Municipal Area Match (Wildcard "*" Coverage)
        ↓
4. Department-Level Dispatch Pool
        ↓
5. Manual Administrative Assignment
```

If location is absent or unmapped, the routing engine routes to the responsible department pool and marks jurisdiction as `LOCATION_UNSPECIFIED`.

---

### 5. Routing Algorithm

The rule-based routing engine in `backend/grievances/services/routing_service.py` follows a transparent 10-step pipeline:

```
[ Citizen Complaint Submission ]
               ↓
[ Local ML Model Classification ] (Phase 10 & 11 Engine)
               ↓
[ Triage Gate ]
  ├── If REVIEW_REQUIRED: Route to Department Review Queue -> PENDING_REVIEW
  └── If AUTO_CLASSIFIED (Confidence >= 0.75): Proceed to Officer Routing
               ↓
[ Identify Responsible Department from Category ]
               ↓
[ Extract Grievance Location & Jurisdiction ]
               ↓
[ Filter Candidate Officers ]
  ├── Must be active (active == True)
  ├── Belong to Department (department_id == matched_dept)
  ├── Availability status == "AVAILABLE"
  └── Workload Capacity: current_workload < maximum_workload
               ↓
[ Rank Candidates by Jurisdiction Match Score & Dynamic Workload ]
               ↓
[ Deterministic Tie-Breaking (Least Recently Assigned) ]
               ↓
[ Generate Assignment Record & Update Grievance Status -> "ASSIGNED" ]
               ↓
[ Persist Decision in Routing Audit Trail ]
```

---

### 6. Workload Calculation Method

Active workload is computed **dynamically** in `MongoRepository.calculate_officer_workload(officer_id)` to guarantee 100% synchronization and prevent cache drift.

**Active Statuses Counted:**
- `ASSIGNED`
- `IN_PROGRESS`
- `REOPENED`

**Inactive Statuses Excluded:**
- `RESOLVED`
- `CLOSED`
- `CANCELLED`
- `REJECTED`

---

### 7. Deterministic Tie-Breaking Method

When multiple eligible officers share the same highest jurisdiction match tier and identical lowest active workload:
1. **Primary Tie-Break:** `last_assigned_at` timestamp (Ascending — officer least recently assigned is prioritized).
2. **Secondary Tie-Break:** `officer_id` (Ascending alphanumeric order — guarantees identical deterministic assignment across test runs without random selection).

---

### 8. No Available Officer Handling

When all officers in the department are `ON_LEAVE`, `UNAVAILABLE`, `BUSY`, or exceed `maximum_workload`:
- Grievance status set to `PENDING_ASSIGNMENT`.
- Assigned department set to responsible department; `assigned_officer_id` set to `null`.
- Assignment record created with type `QUEUE_ASSIGNED`, reason `ALL_OFFICERS_OVERLOADED` or `ALL_OFFICERS_UNAVAILABLE`.
- Grievance is visible in the Department Dispatch Queue (`/api/departments/<id>/grievances/`) for administrative reassignment.

---

### 9. Assignment History Structure

Every assignment, transfer, or queue action produces an immutable record in the `assignments` collection:

```json
{
  "assignment_id": "ASG-202608-E0CBB0",
  "grievance_id": "GRV-202608-D01E6A",
  "department_id": "DEP-ROADS",
  "assigned_officer_id": "OFF-ROADS-001",
  "assignment_type": "AUTO_ASSIGNED",
  "assignment_reason": "EXACT_WARD_MATCH_LOWEST_WORKLOAD",
  "assigned_by": "SYSTEM_ROUTING_ENGINE",
  "previous_officer_id": null,
  "status": "ACTIVE",
  "assigned_at": "2026-08-21T19:36:30Z",
  "notes": "Auto-routed to Rajesh Kumar based on category 'Roads and Infrastructure' and EXACT_WARD match."
}
```

Previous active assignments are transitioned to `SUPERSEDED` when reassignments occur, preserving the entire historical lifecycle.

---

### 10. Manual Override Workflow (Admin)

Authorized administrators can override automatic routing via `POST /api/grievances/<id>/assign/`:
- Admin specifies target `department_id` and optional `officer_id`.
- System marks existing active assignment as `SUPERSEDED`.
- Creates new assignment with type `MANUAL_ASSIGNED`, reason `ADMIN_OVERRIDE` (or custom reason), and records `assigned_by` (e.g. `USR-ADMIN-001`).
- Grievance status updated to `ASSIGNED` (or `PENDING_ASSIGNMENT` if assigned to department queue).

---

### 11. Reassignment Workflow (Officer / Admin)

Officers or admins can request case reassignment via `POST /api/grievances/<id>/reassign/`:
- Required fields: `reason` (e.g. `OFFICER_ON_LEAVE`, `JURISDICTION_REALIGNMENT`, `WRONG_DEPARTMENT`).
- Optional fields: `new_officer_id`, `new_department_id`.
- If `new_officer_id` is supplied: immediately reassigns and records `previous_officer_id`.
- If omitted: re-triggers the automated routing engine to select the next best eligible officer.

---

### 12. REST API Endpoints

| Method | Endpoint | Access Control | Description |
|---|---|---|---|
| `POST` | `/api/grievances/` | Citizen / All | Submits complaint, runs ML classification, automatically routes and assigns officer |
| `POST` | `/api/grievances/classify/` | All | Standalone ML text prediction and diagnostic testing |
| `GET` | `/api/grievances/` | Role-Filtered | Lists grievances with status, department, officer, and citizen filtering |
| `GET` | `/api/grievances/<id>/` | All (Scoper) | Retrieves grievance details, active assignment, and assigned officer profile |
| `POST` | `/api/grievances/<id>/route/` | Officer / Admin | Triggers intelligent routing engine for a grievance |
| `POST` | `/api/grievances/<id>/assign/` | Admin | Manually assigns department and officer |
| `POST` | `/api/grievances/<id>/reassign/` | Officer / Admin | Reassigns grievance with documented reason and previous officer tracking |
| `POST` | `/api/grievances/<id>/correct-category/` | Officer / Admin | Corrects category, logs retraining feedback, and re-routes grievance |
| `GET` | `/api/grievances/<id>/history/` | Officer / Admin | Returns complete assignment timeline and audit records |
| `GET` | `/api/departments/` | All | Lists all municipal departments and supported categories |
| `GET` | `/api/departments/<id>/grievances/` | Officer / Admin | Retrieves department queue (pending review, pending dispatch, active) |
| `GET` | `/api/officers/` | Officer / Admin | Lists officers with department, availability, and calculated workloads |
| `GET` | `/api/officers/<id>/workload/` | Officer / Admin | Returns real-time capacity and active workload summary for an officer |
| `GET` | `/api/routing/audits/` | Admin | Retrieves explainable routing audit logs |
| `GET` | `/api/ml/health/` | All | Returns local ML model health, version, and threshold |

---

### 13. Role Permissions (RBAC)

Role verification is enforced on the Django backend using `RBACValidator`:

- **Citizen (`CITIZEN`):**
  - Permitted: Submit grievances, view own complaints, track status, view public departments.
  - Denied: Direct routing triggers, manual assignments, reassignments, officer roster access.
- **Officer (`OFFICER`):**
  - Permitted: View assigned grievances, request reassignment, correct AI category, view department queue, check workload.
  - Denied: Full department admin management.
- **Admin (`ADMIN`):**
  - Permitted: Full administrative access (override assignments, reassign across departments, view audit logs, manage rosters).

---

### 14. Automated Test Results

Executed with `python3 -m unittest discover backend/tests/`:

```
Ran 19 tests in 0.161s
OK
```

**Key Scenarios Tested:**
1. `test_01_category_to_department_mapping`: All 8 target categories map to responsible departments.
2. `test_02_jurisdiction_matching_priority`: Ward match takes precedence over Zone and City matches.
3. `test_03_officer_availability_filtering`: Officers on leave or unavailable are excluded.
4. `test_04_workload_calculation`: Only active statuses count towards dynamic workload.
5. `test_05_lowest_workload_selection`: Officer with lower active workload selected over busy peer.
6. `test_06_equal_workload_tie_breaking`: Least recently assigned officer wins tie-break.
7. `test_07_no_available_officer_scenario`: Properly routes to `PENDING_ASSIGNMENT` department queue.
8. `test_08_manual_admin_assignment`: Admin manual override creates `MANUAL_ASSIGNED` history.
9. `test_09_officer_reassignment`: Reassignment preserves previous assignment history.
10. `test_10_rbac_access_control`: Citizen cannot perform administrative assignments (403 Forbidden).
11. `test_11_low_confidence_review_queue`: Low confidence predictions queued for review before assignment.

---

### 15. End-to-End Routing Test Results

Executed with `python3 ml/evaluation/test_e2e_routing.py`:

```
================================================================================
GRIEVANCEHUB - END-TO-END INTELLIGENT ROUTING & ASSIGNMENT TEST
================================================================================
ML Model Version: 1.0.0
Confidence Threshold: 0.75
Supported Categories: 8

--- Scenario 1: Pothole Complaint in Domlur (East Zone, Ward 112) ---
✓ Grievance ID: GRV-202608-D01E6A
✓ ML Predicted Category: 'Roads and Infrastructure' (Confidence: 0.8090, Status: AUTO_CLASSIFIED)
✓ Responsible Department: Roads and Infrastructure Department (DEP-ROADS)
✓ Assigned Officer: Rajesh Kumar (OFF-ROADS-001) - Assistant Executive Engineer (Roads)
✓ Officer Workload: Before=0, Now=1 (Max: 10)
✓ Routing Status: ASSIGNED
✓ Explainable Rationale: Routed to Roads and Infrastructure Department -> Assigned to Rajesh Kumar (EXACT_WARD Match, Active Workload: 0 -> 1)

--- Scenario 2: Water Supply Pipeline Disruption (East Zone, Ward 112) ---
✓ Grievance ID: GRV-202608-3D3670
✓ ML Predicted Category: 'Water Supply' (Confidence: 0.9323, Status: AUTO_CLASSIFIED)
✓ Responsible Department: Water Supply and Sewerage Board (DEP-WATER)
✓ Assigned Officer: Pooja Hegde (OFF-WATER-001) - Assistant Executive Engineer (Water Supply)
✓ Officer Workload: Before=0, Now=1 (Max: 10)
✓ Routing Status: ASSIGNED
✓ Explainable Rationale: Routed to Water Supply and Sewerage Board -> Assigned to Pooja Hegde (EXACT_WARD Match, Active Workload: 0 -> 1)

--- Scenario 3: Garbage Blackspot Dumping (East Zone, Ward 111) ---
✓ Grievance ID: GRV-202608-5D7971
✓ ML Predicted Category: 'Sanitation and Waste Management' (Confidence: 0.8475, Status: AUTO_CLASSIFIED)
✓ Responsible Department: Solid Waste Management and Sanitation Department (DEP-SWM)
✓ Assigned Officer: Kavita Rao (OFF-SWM-001) - Senior Health Inspector (Solid Waste)
✓ Officer Workload: Before=0, Now=1 (Max: 12)
✓ Routing Status: ASSIGNED
✓ Explainable Rationale: Routed to Solid Waste Management and Sanitation Department -> Assigned to Kavita Rao (EXACT_WARD Match, Active Workload: 0 -> 1)

--- Scenario 4: Sparking Streetlight Fault (South Zone, Ward 131) ---
✓ Grievance ID: GRV-202608-4F3F35
✓ ML Predicted Category: 'Street Lighting and Electrical Infrastructure' (Confidence: 0.9980, Status: AUTO_CLASSIFIED)
✓ Responsible Department: Street Lighting and Electrical Infrastructure (DEP-ELEC)
✓ Assigned Officer: Deepak Joshi (OFF-ELEC-001) - Assistant Engineer (Street Lighting)
✓ Officer Workload: Before=0, Now=1 (Max: 15)
✓ Routing Status: ASSIGNED
✓ Explainable Rationale: Routed to Street Lighting and Electrical Infrastructure -> Assigned to Deepak Joshi (CITY_WIDE Match, Active Workload: 0 -> 1)

--- Testing Officer Reassignment Workflow ---
✓ Reassigned GRV-202608-D01E6A to OFF-ROADS-003: Reassigned by USR-ADMIN-001 to Suresh Gowda (ZONAL_JURISDICTION_REALIGNMENT)
✓ Assignment History Records Preserved: 2
   • [SUPERSEDED] Type: AUTO_ASSIGNED | Officer: OFF-ROADS-001 | Reason: EXACT_WARD_MATCH_LOWEST_WORKLOAD
   • [ACTIVE] Type: REASSIGNED | Officer: OFF-ROADS-003 | Reason: ZONAL_JURISDICTION_REALIGNMENT

================================================================================
ALL END-TO-END WORKFLOW TESTS COMPLETED SUCCESSFULLY!
================================================================================
```

---

### 16. Known Limitations & Next Steps

1. **GIS Polygon Boundary Matching:** Current jurisdiction matching uses normalized hierarchical strings (Ward, Zone, City). In future iterations, spatial polygon point-in-polygon queries (GIS latitude/longitude boundary intersection) can be added for sub-ward pinpointing.
2. **Scheduled Automated Workload Balancing:** Workload is currently evaluated at dispatch/routing time. Background periodic re-dispatching of `PENDING_ASSIGNMENT` queues can be automated via cron jobs.
3. **Phase 13 Readiness:** System is fully prepared for Phase 13 (Notifications, Grievance Lifecycle, and Status Tracking).
