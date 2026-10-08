# GrievanceHUB Security Architecture & Controls

## 1. Role-Based Access Control (RBAC)
Strict Django REST Framework backend permission classes (`IsConsumer`, `IsOfficer`, `IsAdminUserRole`) enforce endpoint security regardless of client request headers.

## 2. PII Protection
Automated PII scrubbing engine redacts 10-digit Indian phone numbers (`+91`), email addresses, Aadhaar IDs, and PAN cards using regex token replacement (`[PHONE]`, `[EMAIL]`).

## 3. Data Protection Controls
- Environment variable separation for secrets (`DJANGO_SECRET_KEY`, database credentials).
- CORS headers white-listing.
- Input validation and parameterized ORM queries protecting against SQL injection and XSS.
