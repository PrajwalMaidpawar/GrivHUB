# GrievanceHUB — Authentication & Access Architecture (Phase 1)

This document provides a comprehensive specification of the authentication, account verification, and role-based access control (RBAC) foundation implemented for GrievanceHUB (MSEDCL/Mahavitaran Domain).

---

## 1. Authentication Architecture Overview

GrievanceHUB implements a multi-tier, defense-in-depth authentication framework where the **Django REST backend is the sole authority** for authentication and authorization. The React frontend never determines system permissions; it consumes authenticated user sessions and roles provided by the backend.

```
React 19 Frontend (Vite)
       │
       ▼  (withCredentials: true, CSRF Cookie)
Django REST Framework Gateway
       │
       ├── Rate Limiting & Throttling (auth_login, auth_signup, auth_verify, etc.)
       ├── CAPTCHA Verification Abstraction (Cloudflare Turnstile / Google reCAPTCHA)
       │
       ▼
Django Authentication & Session Middleware
       │
       ├── Password Hashing (PBKDF2-SHA256, server-side strength validation)
       ├── Custom User Model (AbstractUser)
       │       ├── role: CONSUMER | OFFICER | ADMIN
       │       └── is_verified: True | False
       │
       ├── OTP Lifecycle Engine (AccountVerificationCode)
       │       ├── SHA-256 OTP Hash (plaintext never stored)
       │       ├── 10-Minute Expiry & Single-Use Enforcement
       │       └── 5-Attempt Lockout & 60s Resend Cooldown
       │
       ▼
Role-Based Permissions & Data Isolation
       ├── IsConsumer: Verified Consumers Only
       ├── IsOfficer: Field Officers & Admins
       ├── IsAdminUserRole: Administrators Only
       └── IsComplaintOwnerOrStaff: Strict Consumer Data Isolation
```

---

## 2. User Lifecycle & Flows

### A. Consumer Signup & Verification Flow
1. **Input Submission**: Consumer enters Full Name, Mobile Number, Email Address, Consumer Number (12-digit MSEDCL LT/HT ID), Password, and Confirm Password.
2. **Server-Side Validation**:
   - Email uniqueness check (`"An account already exists with this email address."`).
   - Mobile number uniqueness check (`"This mobile number is already registered."`).
   - Consumer number uniqueness check (`"This Consumer Number is already associated with an account."`).
   - Password mismatch check (`"Passwords do not match."`).
   - Django Password Validator (`validate_password`) enforcing minimum length, complexity, and common password prevention.
   - Client CANNOT specify role, staff, or verification status; user is created with `role=CONSUMER` and `is_verified=False`.
3. **Password Storage**: The password is encrypted using Django's `PBKDF2PasswordHasher`. Plaintext is never stored.
4. **OTP Dispatch**: A 6-digit cryptographic numeric OTP is generated, hashed with SHA-256, saved to `AccountVerificationCode`, and dispatched via `VerificationDeliveryService`. In development mode (`DEBUG=True`), the code is safely logged to the Django console.
5. **Verification**: Consumer enters the 6-digit code. On successful verification:
   - `user.is_verified` is set to `True`.
   - The OTP is marked `is_used=True`.
   - Django session is created via `login(request, user)`.
   - User is routed directly to the Consumer Dashboard.

### B. Login Flow
1. **Universal Identifier**: Accepts Email Address, Mobile Number, or Username + Password.
2. **Status Checks**:
   - Verifies password hash.
   - Verifies `is_active` (`"This account has been deactivated."`).
   - Verifies `is_verified` for consumers (`"Your account has not been verified yet."`).
3. **Dashboard Redirection**:
   - `CONSUMER` &rarr; Consumer / Citizen Dashboard (Overview, Submit Grievance, My Grievances, Notifications, Profile).
   - `OFFICER` &rarr; Field Officer Dashboard (Overview, Work Queue, Workload & Capacity, Detail).
   - `ADMIN` &rarr; System Administrator Dashboard (Analytics, Grievances, ML Performance, Department Load, Settings).

### C. Logout Flow
1. Client calls `POST /api/auth/logout/`.
2. Backend calls Django `logout(request)`, destroying session data and clearing cookies.
3. Client resets `AuthContext` state and returns to Login page.

### D. Forgot / Reset Password Flow (Anti-Enumeration)
1. User enters Email or Mobile.
2. `POST /api/auth/forgot-password/` always responds with:
   `"If an account matches the provided information, a password reset code will be sent."`
   This strictly prevents malicious user enumeration.
3. If user exists, a `RESET_PASSWORD` OTP is generated and delivered.
4. User submits OTP + New Password + Confirm Password via `POST /api/auth/reset-password/`.
5. Upon successful validation, the password hash is updated and the OTP is consumed.

---

## 3. Security Controls & Rate Limiting

### A. Password Security
- Passwords are encrypted with Django's default PBKDF2 with SHA-256 algorithm.
- Automated tests (`test_password_is_hashed_never_plaintext`) verify that passwords in the database start with `pbkdf2_sha256$` and are never stored in plaintext.

### B. OTP Code Security
- **Single-Use**: Once verified, `is_used` is set to `True`.
- **Hashed Storage**: Stored as SHA-256 digest in `code_hash`.
- **Expiration**: 10 minutes from creation.
- **Brute Force Protection**: Locked after 5 failed attempts.
- **Resend Throttling**: Enforces a 60-second cooldown period between code dispatches.

### C. Rate Limiting (DRF Throttling)
Configured in `settings.py` and enforced via custom throttle classes in `throttling.py`:
- `POST /api/auth/login/`: `10/minute` (IP + attempted identifier).
- `POST /api/auth/register/`: `10/minute` (IP).
- `POST /api/auth/verify/`: `15/minute` (IP + identifier).
- `POST /api/auth/resend-verification/`: `3/minute` (IP + identifier).
- `POST /api/auth/forgot-password/`: `5/minute` (IP + identifier).
- `POST /api/auth/reset-password/`: `5/minute` (IP + identifier).

### D. CAPTCHA Architecture
Implemented via `CaptchaService` in `backend/apps/accounts/captcha.py`:
- In local development (`DEBUG=True`), CAPTCHA validation defaults to disabled (`CAPTCHA_ENABLED=False`) or permits mock test tokens.
- In production (`DEBUG=False`), when `CAPTCHA_ENABLED=True`, verifies tokens server-side with Cloudflare Turnstile or Google reCAPTCHA. Secret keys are never exposed to the frontend.

### E. Consumer Data Isolation (Ownership Checks)
- `GET /api/grievances/`: When requested by an authenticated `CONSUMER`, automatically filters to only grievances where `consumer == request.user`.
- `GET /api/grievances/<id>/`: If a `CONSUMER` attempts to access a grievance belonging to another consumer, the backend terminates the request with `403 Forbidden` (`"You do not have permission to access this grievance."`).
- Fully validated by automated tests in `test_phase1_auth.py`.

---

## 4. API Endpoints Reference

| Method | Endpoint | Description | Throttle Scope | Auth Required |
|---|---|---|---|---|
| `POST` | `/api/auth/register/` | Register new consumer | `auth_signup` | No |
| `POST` | `/api/auth/verify/` | Verify OTP and activate account | `auth_verify` | No |
| `POST` | `/api/auth/resend-verification/` | Resend verification OTP (60s cooldown) | `auth_resend` | No |
| `POST` | `/api/auth/login/` | Universal login (Email/Mobile/User) | `auth_login` | No |
| `POST` | `/api/auth/logout/` | Invalidate session | None | Yes |
| `POST` | `/api/auth/forgot-password/` | Request password reset OTP | `auth_password_reset` | No |
| `POST` | `/api/auth/reset-password/` | Verify reset OTP and update password | `auth_password_reset` | No |
| `GET` | `/api/auth/me/` | Hydrate active authenticated session | None | Yes |

---

## 5. Development Setup & Seed Accounts

### Running Migrations
```powershell
python manage.py makemigrations accounts
python manage.py migrate
```

### Seeding Initial Accounts
To seed or update demonstration accounts:
```powershell
python manage.py seed_users
```

**Pre-Configured Development Accounts**:
- **Consumer**: `consumer.demo@gmail.com` / `consumer123` (Consumer ID: `270019284102`)
- **Field Officer 1**: `pune.officer@msedcl-grievance.in` / `officer123` (Employee ID: `MSED-ENG-4091`)
- **Field Officer 2**: `metering.officer@msedcl-grievance.in` / `officer123` (Employee ID: `MSED-ENG-8823`)
- **Administrator**: `admin@msedcl-grievance.in` / `admin123` (System Admin)

---

## 6. Running Tests

### Execute Entire Backend Test Suite (59 Tests)
```powershell
.\venv\Scripts\python.exe -m pytest backend/tests
```

### Execute Phase 1 Authentication Tests (22 Tests)
```powershell
.\venv\Scripts\python.exe -m pytest backend/tests/test_phase1_auth.py
```

### Frontend Build Verification
```powershell
npm run build
```

---

## 7. Status: Implemented vs. Planned for Phase 2

### Implemented in Phase 1:
- [x] Secure consumer registration with Full Name, Email, Mobile, Consumer Number, and Password confirmation.
- [x] Server-side password validation via Django password framework.
- [x] PBKDF2 password hashing (plaintext passwords strictly rejected and never saved).
- [x] Account verification lifecycle with SHA-256 hashed OTPs, 10-minute expiry, max 5 attempts, single-use check, and 60-second cooldown.
- [x] Safe console OTP logging in development mode (`DEBUG=True`).
- [x] Universal login supporting Email, Mobile Number, or Username.
- [x] Rejection of unverified consumer login attempts (`403 Forbidden` with verification prompt).
- [x] Secure session logout.
- [x] Anti-enumeration forgot password and reset password workflows.
- [x] Rate limiting foundation (DRF throttles for login, signup, verify, resend, reset).
- [x] CAPTCHA verification service abstraction (Turnstile/reCAPTCHA).
- [x] Consumer data isolation (ownership verification on list and detail grievance endpoints).
- [x] Role-based dashboard protection (Consumer, Officer, Admin).
- [x] Frontend AuthContext single source of truth with session hydration on page refresh.
- [x] Modern, responsive Login and Signup pages with quick-fill demo credentials.

### Planned for Phase 2:
- [ ] Live MSEDCL Consumer Database API integration (validating consumer number against DISCOM billing billing server).
- [ ] Direct SMS Gateway integration (CDAC / Gov SMS API for OTP delivery).
- [ ] MSEDCL Administrative Hierarchy selection during signup (Region, Circle, Division, Sub-Division, Section, Substation, Pole Number).
- [ ] Hardware token / FIDO2 Multi-Factor Authentication for System Administrators.
- [ ] Advanced IP geofencing and WAF integration.
