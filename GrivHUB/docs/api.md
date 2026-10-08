# GrievanceHUB API Reference Manual

## 1. Base URL
All API requests are served relative to `/api/v1/` or `/api/`.

## 2. Standard Headers
- `Content-Type: application/json`
- `Authorization: Bearer <token>` or `Cookie: sessionid=<id>`

## 3. Endpoints Overview

### Authentication (`/api/auth/`)
- `POST /api/auth/register/` - Register new consumer account.
- `POST /api/auth/login/` - Login and acquire session/JWT token.
- `POST /api/auth/logout/` - Invalidate session.
- `GET  /api/auth/me/` - Fetch authenticated user profile.

### Grievances (`/api/grievances/`)
- `GET  /api/grievances/` - Paginated list of complaints (role-filtered).
- `POST /api/grievances/` - Create new grievance. Triggers ML classification, risk analysis, duplicate check, smart department routing.
- `GET  /api/grievances/{id}/` - Detail view with timeline and SLA.
- `PATCH /api/grievances/{id}/` - Update grievance status or fields.
- `POST /api/grievances/{id}/assign/` - Assign grievance to officer.
- `POST /api/grievances/{id}/resolve/` - Submit resolution report.
- `POST /api/grievances/check-duplicates/` - Vector similarity check against active complaints.

### Incidents (`/api/incidents/`)
- `GET  /api/incidents/` - List area-wide outage clusters.
- `POST /api/incidents/{id}/confirm/` - Confirm potential outage.

### ML & Metrics (`/api/ml/`)
- `GET  /api/ml/model-info/` - Retrieve active model details.
- `GET  /api/ml/metrics/` - Fetch accuracy, precision, recall, confusion matrix.
- `POST /api/ml/corrections/` - Record officer category correction.

### Analytics (`/api/analytics/`)
- `GET  /api/analytics/overview/` - Executive summary statistics.
