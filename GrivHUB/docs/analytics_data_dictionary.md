# GrievanceHUB Analytics Data Dictionary

## 1. Overview
This document defines the schema, field types, semantic meanings, and analytics usages for all collections stored in the GrievanceHUB municipal repository (`data/mongodb_store/`). All analytics calculations in GrievanceHUB are grounded directly in these verified database structures without synthetic metrics or client-side fabrication.

---

## 2. Collection Schemas & Field Definitions

### 2.1 `grievances` Collection
Primary repository for all citizen grievances submitted across municipal wards and departments.

| Field Name | Data Type | Nullable | Description / Semantic Meaning | Analytics & KPI Usage |
| :--- | :--- | :--- | :--- | :--- |
| `grievance_id` | String | No | Unique tracking identifier (e.g., `GRV-202608-41CE4A`) | Total grievance volume, distinct counts, deduplication checks |
| `title` | String | No | Citizen-provided concise headline of the issue | Text analysis, keyword frequency, search indexing |
| `description` | String | No | Full grievance statement | ML classification feature vector extraction |
| `citizen_id` | String | No | Identifier of the submitting citizen (`USR-CITIZEN-xxx` or anon) | Citizen activity volume, repeat complainant analysis |
| `citizen_name` | String | Yes | Citizen's full display name | Display & contact verification in reports |
| `citizen_phone` | String | Yes | Contact phone number | Contact rate metrics |
| `location` | Object | No | Geographic location breakdown (`ward`, `zone`, `city`, `address`, `pincode`, `coordinates`) | Geographic distribution, ward-level heatmaps, zonal backlogs |
| `location.ward` | String | Yes | Municipal ward identifier / name (e.g., `Ward 112`) | Ward-level grievance aggregation |
| `location.zone` | String | Yes | Administrative zone (e.g., `East Zone`) | Zonal administrative performance |
| `location.city` | String | Yes | Municipal corporation city name (e.g., `Bengaluru`) | City-wide aggregations |
| `predicted_category` | String | Yes | Category output by the local ML classifier | ML performance, category distribution, raw model inference |
| `classification_confidence` | Float (0.0-1.0) | Yes | Softmax confidence score from local ML model | Confidence distribution, low-confidence threshold monitoring |
| `classification_status` | String | No | Enum: `AUTO_CLASSIFIED`, `REVIEW_REQUIRED`, `MANUALLY_CORRECTED`, `CONFIRMED` | ML review rate, human-in-the-loop audit |
| `model_version` | String | Yes | Version of ML model used during classification (e.g., `1.0.0`) | Model version drift, multi-version performance tracking |
| `officer_final_category` | String | Yes | Human-verified / corrected category set by officer or admin | Ground truth category distribution, ML agreement calculation |
| `classification_corrected`| Boolean | No | `true` if human changed the predicted category | Model error rate, category confusion analysis |
| `status` | String | No | Lifecycle status: `SUBMITTED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REOPENED`, `REJECTED` | Status distribution, backlog analysis, pipeline funnel |
| `priority` | String | No | Grievance priority: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | Priority breakdown, escalation analysis |
| `assigned_department_id` | String | Yes | Identifier of assigned municipal department (`DEP-ROADS`, etc.) | Departmental workload, department resolution performance |
| `assigned_officer_id` | String | Yes | Identifier of current assigned field officer (`OFF-ROADS-001`) | Officer workload, capacity utilization, dispatch metrics |
| `current_assignment_id` | String | Yes | Identifier linking to the active record in `assignments` | Assignment integrity verification |
| `routing_method` | String | Yes | Enum: `AUTO_WORKLOAD_MIN`, `AUTO_DIRECT`, `MANUAL_OVERRIDE`, `ADMIN_ASSIGNED` | Routing automation rate, manual intervention frequency |
| `routing_reason` | String | Yes | Human-readable explanation of why this officer was chosen | Routing auditability and explainability analysis |
| `progress_stage` | String | Yes | Sub-stage: `INVESTIGATION_STARTED`, `CREW_DISPATCHED`, `WORK_IN_PROGRESS`, `RESOLUTION_SUBMITTED` | Operational velocity, bottleneck tracking |
| `progress_notes` | Array | No | Array of milestone updates, internal notes, and photos | Progress update frequency per ticket |
| `resolution` | Object | Yes | Resolution payload containing summary, proof images, and timestamps | Resolution validity, proof compliance rate |
| `resolved_at` | String (ISO) | Yes | Timestamp when officer marked grievance as RESOLVED | Resolution duration calculation (`resolved_at - created_at`) |
| `closed_at` | String (ISO) | Yes | Timestamp when grievance was permanently CLOSED | Full lifecycle duration (`closed_at - created_at`) |
| `closed_info` | Object | Yes | Close metadata (`closed_by`, `close_type`, `feedback_rating`, `feedback_comments`) | Citizen satisfaction scoring (CSAT), auto-closure tracking |
| `reopen_history` | Array | Yes | Array of reopen events with citizen reasons and timestamps | Reopen rate (`reopens / resolutions`), quality analysis |
| `auto_closure_deadline` | String (ISO) | Yes | Target timestamp for automatic closure if citizen doesn't object | SLA compliance, auto-closure queue monitoring |
| `created_at` | String (ISO) | No | Initial submission timestamp | Time series trends (day/week/month), vintage analysis |
| `updated_at` | String (ISO) | No | Last modification timestamp | Activity freshness, stale ticket detection |

---

### 2.2 `assignments` Collection
Historical log of every assignment, reassignment, and manual delegation.

| Field Name | Data Type | Nullable | Description / Semantic Meaning | Analytics & KPI Usage |
| :--- | :--- | :--- | :--- | :--- |
| `assignment_id` | String | No | Unique assignment identifier (`ASG-202608-xxxxxx`) | Assignment volume tracking |
| `grievance_id` | String | No | Target grievance identifier | Linking assignment events to tickets |
| `assigned_officer_id` | String | No | Field officer receiving the task | Officer assignment velocity |
| `previous_officer_id` | String | Yes | Previous officer in case of reassignment | Reassignment rate, transfer pattern analysis |
| `department_id` | String | No | Assigned municipal department | Cross-department transfer analysis |
| `assignment_type` | String | No | Enum: `INITIAL_AUTO`, `MANUAL_OVERRIDE`, `ESCALATION`, `REASSIGNMENT` | Automation vs. manual dispatch efficiency |
| `assignment_reason` | String | Yes | Explanatory note or justification | Reassignment cause tracking |
| `assigned_by` | String | No | User/Actor ID who executed assignment (`SYSTEM`, `USR-ADMIN-xxx`) | Administrative intervention tracking |
| `status` | String | No | `ACTIVE` or `SUPERSEDED` | Current active assignment state |
| `assigned_at` | String (ISO) | No | Timestamp of assignment | Time-to-assignment (`assigned_at - grievance.created_at`) |
| `superseded_at` | String (ISO) | Yes | Timestamp when reassigned | Officer task hold duration |

---

### 2.3 `officers` Collection
Municipal field workforce directory with capacity parameters.

| Field Name | Data Type | Nullable | Description / Semantic Meaning | Analytics & KPI Usage |
| :--- | :--- | :--- | :--- | :--- |
| `officer_id` | String | No | Unique officer code (`OFF-ROADS-001`) | Primary workforce key |
| `user_id` | String | No | System user reference | RBAC & auth linkage |
| `name` | String | No | Officer's full name | Display in workload analytics |
| `department_id` | String | No | Home municipal department | Departmental workforce distribution |
| `designation` | String | No | Official government title | Role hierarchy analytics |
| `assigned_jurisdictions` | Array | No | List of zones & wards assigned to this engineer | Geographic coverage ratio |
| `availability_status` | String | No | `AVAILABLE`, `ON_LEAVE`, `FIELD_DUTY`, `UNAVAILABLE` | Available capacity index |
| `maximum_workload` | Integer | No | Configured maximum concurrent active task ceiling | Utilization rate calculation (`active_load / max_load * 100`) |
| `last_assigned_at` | String (ISO) | Yes | Timestamp of most recent task dispatch | Dispatch balancing & round-robin fairness |
| `active` | Boolean | No | Active personnel flag | Total workforce count |

---

### 2.4 `departments` Collection
Municipal administrative divisions and service domains.

| Field Name | Data Type | Nullable | Description / Semantic Meaning | Analytics & KPI Usage |
| :--- | :--- | :--- | :--- | :--- |
| `department_id` | String | No | Unique department key (`DEP-ROADS`, `DEP-WATER`) | Grouping key for departmental analytics |
| `name` | String | No | Official department name | Label in charts and reports |
| `supported_categories` | Array | No | Civic issue categories routed to this department | Routing mapping audit |
| `active` | Boolean | No | Operational status | Active department filtering |

---

### 2.5 `category_feedback` Collection
Ground-truth corrections logged whenever an officer or administrator corrects an AI prediction.

| Field Name | Data Type | Nullable | Description / Semantic Meaning | Analytics & KPI Usage |
| :--- | :--- | :--- | :--- | :--- |
| `feedback_id` | String | No | Unique feedback identifier (`FDB-202608-xxxxxx`) | Feedback sample count |
| `grievance_id` | String | No | Associated grievance ID | Ticket correlation |
| `complaint_title` | String | No | Title text of the complaint | Retraining dataset curation |
| `complaint_description`| String | No | Body text of the complaint | Retraining feature data |
| `original_prediction` | String | No | Category originally assigned by AI model | Confusion matrix predicted axis |
| `original_confidence` | Float | No | Softmax score of original prediction | Error correlation with low confidence |
| `corrected_category` | String | No | Verified correct category by human officer | Confusion matrix actual axis, ground truth |
| `is_mismatch` | Boolean | No | `true` if predicted != corrected | Model error tracking |
| `correction_reason` | String | Yes | Explanation for correction | Error typology & edge case analysis |
| `reviewer_id` | String | No | Officer or Admin who reviewed | Reviewer contribution tracking |
| `correction_timestamp` | String (ISO) | No | Timestamp of correction | Drift over time analysis |

---

### 2.6 `routing_audit` Collection
Explainability audit trail for every automated and manual routing event.

| Field Name | Data Type | Nullable | Description / Semantic Meaning | Analytics & KPI Usage |
| :--- | :--- | :--- | :--- | :--- |
| `audit_id` | String | No | Unique audit record identifier | Total routing events |
| `grievance_id` | String | No | Target grievance ID | Traceability |
| `final_category` | String | No | Category used for routing | Category routing distribution |
| `selected_department` | String | No | Department chosen | Department workload intake rate |
| `selected_officer` | String | Yes | Officer assigned | Officer intake rate |
| `selected_officer_workload_before` | Integer | Yes | Workload before assignment | Routing fairness & load leveling |
| `candidate_officers_count` | Integer | No | Number of eligible officers in pool | Capacity constraint analysis |
| `routing_method` | String | No | `AUTO_WORKLOAD_MIN`, `AUTO_DIRECT`, etc. | Automation rate KPI |
| `timestamp` | String (ISO) | No | Execution timestamp | Routing latency metrics |

---

## 3. Core Analytics Metrics & Mathematical Formulations

1. **Active Backlog**:
   $$\text{Active} = \text{Count}(\text{status} \in \{\text{ASSIGNED}, \text{IN\_PROGRESS}, \text{REOPENED}\})$$

2. **Resolution Time (Hours)**:
   $$\text{Duration} = \frac{\text{Timestamp}(\text{resolved\_at}) - \text{Timestamp}(\text{created\_at})}{3600}$$
   *(Filtered for valid timestamps where $\text{Duration} \ge 0$)*

3. **Reopen Rate**:
   $$\text{Reopen Rate} = \frac{\text{Count}(\text{reopened})}{\text{Count}(\text{resolved}) + \text{Count}(\text{closed}) + \text{Count}(\text{reopened})}$$

4. **Officer Capacity Utilization (%)**:
   $$\text{Utilization} = \frac{\text{Active Workload}}{\text{Maximum Workload}} \times 100 \quad (\text{for } \text{Maximum Workload} > 0)$$

5. **ML Reviewed Prediction Agreement Rate**:
   $$\text{Agreement Rate} = \frac{\text{Count}(\text{predicted\_category} = \text{officer\_final\_category})}{\text{Count}(\text{reviewed\_records})}$$

6. **Time-To-Assignment (Minutes)**:
   $$\text{TTA} = \frac{\text{Timestamp}(\text{first\_assigned\_at}) - \text{Timestamp}(\text{grievance.created\_at})}{60}$$
