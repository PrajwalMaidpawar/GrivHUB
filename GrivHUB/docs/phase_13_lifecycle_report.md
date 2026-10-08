# GrievanceHUB — Phase 13 Completion Report
## Grievance Lifecycle State Machine, Status Tracking, Immutable Activity History, and Real-Time Notifications

**Project**: GrievanceHUB (Civic Grievance Management Platform for Municipal Corporations)  
**Phase**: Phase 13 — Notifications, Grievance Lifecycle, Status Tracking, and Activity History  
**Date**: August 2026  
**Status**: Completed & Verified  

---

### Executive Summary

Phase 13 establishes the complete, production-grade operational lifecycle engine for GrievanceHUB. Building upon Phase 11's local ML classification and Phase 12's intelligent workload-aware routing engine, Phase 13 implements:
1. **Centralized Finite State Machine (FSM)** with deterministic transition validation and state guarantees.
2. **Role-Based Access Control (RBAC)** ensuring only authorized actors (Assigned Officers, Citizen owners, Department/Super Admins, or System processes) can execute specific lifecycle actions.
3. **Immutable, Append-Only Activity History & Timeline** with rich metadata, previous-to-new state diffs, and privacy-aware visibility filtering (public vs. internal).
4. **Context-Driven Notification Service** generating real, event-triggered in-app notifications with unread counts, pagination, and multi-actor notifications.
5. **Bidirectional Discussion System** supporting threaded communication with internal officer notes.
6. **Grace Period Auto-Closure Engine** automatically transitioning unconfirmed resolved grievances to closed status after a configurable grace period (e.g. 72 hours).

---

### 1. Finite State Machine (FSM) Specification

The lifecycle engine strictly enforces the valid transitions below. Any unauthorized or invalid transition attempt is immediately rejected with explicit error details.

| From State | Allowed Target States | Permitted Actors | Key Requirements |
| :--- | :--- | :--- | :--- |
| `SUBMITTED` | `CLASSIFIED`, `REVIEW_REQUIRED`, `PENDING_ASSIGNMENT`, `ASSIGNED`, `REJECTED`, `CANCELLED` | System, Admin, Citizen (Cancel) | Initial submission & triage |
| `ASSIGNED` | `IN_PROGRESS`, `ASSIGNED` (Reassign), `PENDING_ASSIGNMENT`, `CANCELLED`, `REJECTED` | Assigned Officer, Admin | Officer begins work or reassigns |
| `IN_PROGRESS` | `IN_PROGRESS` (Milestone), `RESOLVED`, `ASSIGNED` (Reassign), `REJECTED` | Assigned Officer, Admin | Milestone logging, resolution submission |
| `RESOLVED` | `CLOSED` (Citizen / Auto), `REOPENED` (Citizen) | Citizen Owner, System (Auto-Close), Admin | Citizen confirmation or dissatisfaction |
| `REOPENED` | `IN_PROGRESS`, `ASSIGNED` (Reassign), `REJECTED` | Assigned Officer, Admin | Counter incremented, re-investigation |
| `CLOSED` | *Terminal State* | — | No further transitions allowed |
| `REJECTED` | *Terminal State* | Admin | Documented rejection reason |
| `CANCELLED` | *Terminal State* | Citizen Owner | Citizen withdrawal |

---

### 2. Comprehensive Service Architecture

#### A. Centralized Lifecycle Service (`backend/grievances/services/lifecycle_service.py`)
- Standardized actor extraction helper (`_extract_actor`) supporting both dictionary context (`user_context={"user_id": ..., "role": ...}`) and direct keyword arguments.
- Fine-grained permission checks (`_check_officer_permission`, `_check_citizen_permission`, `_check_admin_permission`).
- Workflows implemented:
  - `start_work(grievance_id, user_context, notes)`
  - `update_progress(grievance_id, user_context, stage, note, attachments)`
  - `submit_resolution(grievance_id, user_context, resolution_summary, resolution_details, resolution_images)`
  - `confirm_resolution(grievance_id, user_context, feedback_rating, feedback_comments)`
  - `reopen_grievance(grievance_id, user_context, reopen_reason, notes)`
  - `reject_grievance(grievance_id, user_context, rejection_reason)`
  - `close_grievance(grievance_id, user_context, reason)`
  - `cancel_grievance(grievance_id, user_context, reason)`
  - `add_comment(grievance_id, user_context, message, visibility)`
  - `get_timeline(grievance_id, user_context)`
  - `process_auto_closures(auto_close_hours)`

#### B. Real Event Notification Service (`backend/grievances/services/notification_service.py`)
- Emits structured notifications directly into the persistent storage.
- Real event hooks:
  - Submission confirmation to Citizen
  - New Assignment notification to Assigned Officer
  - Reassignment alert to both Old and New Officers
  - Work Started & Progress Updates to Citizen
  - Resolution Notice to Citizen with rating prompt
  - Citizen Confirmation alert to Officer
  - Reopened escalation alert to Officer and Department Admin
  - Closure and Rejection alerts

#### C. MongoDB Repository Extension (`backend/grievances/mongo_client.py`)
- Collections for `activities`, `notifications`, and `comments`.
- Read-write thread safety with RLock.
- Unread counter synchronization and batch read status updates.
- Auto-closure date parsing for ISO 8601 timestamps.

---

### 3. REST API Endpoints

All endpoints are registered in `backend/server.py` and handled in `backend/grievances/views.py`:

| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/grievances/` | Submit grievance + ML Inference + Auto-Routing |
| `GET` | `/api/grievances/:id/timeline/` | Retrieve chronological activity audit trail & comments |
| `POST` | `/api/grievances/:id/start-work/` | Officer marks grievance `IN_PROGRESS` |
| `POST` | `/api/grievances/:id/progress/` | Officer logs progress milestone & field notes |
| `POST` | `/api/grievances/:id/resolve/` | Officer submits resolution summary & proof |
| `POST` | `/api/grievances/:id/confirm-resolution/` | Citizen confirms resolution and provides 1-5 star rating |
| `POST` | `/api/grievances/:id/reopen/` | Citizen reopens unresolved grievance with reason |
| `POST` | `/api/grievances/:id/reject/` | Admin rejects duplicate or out-of-jurisdiction complaint |
| `POST` | `/api/grievances/:id/close/` | Administrative closure override |
| `POST` | `/api/grievances/:id/cancel/` | Citizen cancels own grievance |
| `GET` | `/api/grievances/:id/comments/` | Fetch comments (with internal note visibility check) |
| `POST` | `/api/grievances/:id/comments/` | Post comment / internal note |
| `GET` | `/api/notifications/` | List recipient notifications with pagination & read filter |
| `GET` | `/api/notifications/unread-count/` | Get recipient unread notification count |
| `PATCH` | `/api/notifications/:id/read/` | Mark single notification as read |
| `PATCH` | `/api/notifications/mark-all-read/` | Mark all recipient notifications as read |
| `POST` | `/api/system/auto-close/` | Trigger background auto-closure maintenance job |

---

### 4. Verification & Automated Test Suite

The automated test suite across all subsystems completed with **100% pass rate**:

```bash
python3 -m unittest discover -s backend/tests -p "test_*.py"
Ran 29 tests in 0.234s
OK
```

#### Test Suite Breakdown:
1. **`test_lifecycle_service.py` (10 Tests - 100% Pass)**:
   - `test_01_valid_lifecycle_transitions`: Happy path transition sequence (`SUBMITTED` -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`).
   - `test_02_invalid_transition_rejections`: Illegal state transitions (`SUBMITTED` directly to `RESOLVED`/`CLOSED`, mutations on terminal `CLOSED`).
   - `test_03_role_based_permissions`: Enforces assigned officer isolation, non-owner citizen restrictions, and admin overrides.
   - `test_04_citizen_reopen_workflow`: Reopen state transition, counter increment, reopen history tracking, and work resumption.
   - `test_05_admin_rejection_workflow`: Rejection with audit reason.
   - `test_06_immutable_activity_history_and_timeline`: Activity logging completeness and ordering.
   - `test_07_notifications_workflow`: Notification creation, unread counts, and marking as read.
   - `test_08_comments_and_visibility_filtering`: Public vs. internal comments and citizen view filtering.
   - `test_09_auto_closure_policy`: Auto-closure of aged resolved tickets past the grace period.
   - `test_10_end_to_end_full_api_workflow`: Full integration cycle from API submission, ML inference, auto-routing, progress tracking, resolution proof, citizen rating, and timeline audit.
2. **`test_routing_service.py` (11 Tests - 100% Pass)**:
   - Routing rules, jurisdiction matching, workload balancing, reassignments, and audit trails.
3. **`test_ml_integration.py` (8 Tests - 100% Pass)**:
   - Local TF-IDF + SGD/LinearSVC ML classifier inference, confidence thresholding, and category feedback storage.

---

### 5. Phase 13 Sign-Off

All requirements for Phase 13 have been fully implemented, integrated with the local ML inference engine and intelligent routing service, and verified via automated test suites. GrievanceHUB is ready for subsequent phases.
