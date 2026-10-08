# GrievanceHUB

## Intelligent Electricity Grievance Redressal & Operational Management Platform

**GrievanceHUB** is an enterprise-grade full-stack electricity distribution grievance management system engineered for Indian power distribution utilities, modeled after **MSEDCL (Mahavitaran / Maharashtra State Electricity Distribution Co. Ltd.)** operational workflows.

The system combines role-based access control (RBAC), machine-learning complaint classification, automated jurisdictional routing, hierarchical SLA tracking with auto-escalation, and comprehensive administrative auditing.

---

## 🌟 Key Architecture & Capabilities

1. **Machine Learning Complaint Classification**:
   - Automated categorization of citizen grievance texts across 10 structured electricity distribution classes.
   - Built on **TF-IDF Feature Extraction + Multinomial Logistic Regression** with calibrated softmax probabilities.
   - Low-latency local inference (<1 ms) with high holdout accuracy (>99.5% on verified test splits).
   - Real-world provenance: trained and validated on real Indian civic/electrical complaints from OpenCity public datasets (zero synthetic/LLM generated data for training).

2. **Hierarchical MSEDCL SLA Engine & Escalation**:
   - Database-driven SLA policies mapped to urgency and priority (`CRITICAL`: 2h, `HIGH`: 8h, `MEDIUM`: 24h, `LOW`: 72h).
   - Strict hierarchical utility escalation:
     - **Level 1**: Section / Junior Engineer (JE)
     - **Level 2**: Assistant Engineer (AE) / Sub-Division In-charge
     - **Level 3**: Executive Engineer (EE) / Division Head
     - **Level 4**: Superintending Engineer (SE) / Circle Officer
   - SLA pause/resume tracking with reason codes and automated background processing (`python manage.py process_sla`).

3. **Intelligent Department & Officer Routing**:
   - Automatic routing based on predicted/verified complaint category and consumer electrical substation/pincode.
   - Officer recommendation engine scoring by department match, availability, and active workload limits.

4. **Safety Hazard Detection & Incident Aggregation**:
   - Rule-based safety interceptor for immediate critical hazards (live wires, sparking transformers, electrocution risks).
   - Cluster detection aggregating multiple related complaints in the same service area into operational incidents.

5. **Role-Based Portals & Workflows (RBAC)**:
   - **Consumer Portal**: Grievance registration, live tracking, status timeline, resolution confirmation & ratings, reopening workflows.
   - **Field Officer Portal**: Assigned queue, start work, progress updates, evidence upload, resolution submission, SLA warning badges.
   - **Admin Command Center**: System overview, department & jurisdiction management, staff approvals, audit logs, and analytics.

6. **Multilingual Support**:
   - Native interface support for English, Hindi (हिन्दी), and Marathi (मराठी).

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Recharts, Axios.
- **Backend**: Python 3.10+, Django 6.1, Django REST Framework, SQLite (Development) / PostgreSQL (Production).
- **Machine Learning**: `scikit-learn`, `numpy`, `joblib`, TF-IDF Vectorizer.
- **Testing**: `pytest`, `pytest-django`, `pytest-cov`.

---

## 📁 Repository Structure

```
GrievanceHUB/
│
├── frontend/ (src/)            # React 19 frontend application
│   ├── components/             # Reusable UI (admin/, auth/, citizen/, officer/, common/)
│   ├── context/                # AuthContext, GrievanceContext, i18nContext
│   ├── api/                    # Axios API client, authApi, grievanceApi, analyticsApi
│   ├── ml/                     # Client-side typing assist & pipeline metrics
│   ├── App.jsx                 # Main application view dispatcher
│   └── main.jsx                # React entry point
│
├── backend/                    # Django 6.1 Enterprise Backend
│   ├── grievancehub/           # Django project configuration (settings, urls, wsgi, asgi)
│   ├── apps/
│   │   ├── accounts/           # User model, RBAC, profiles, auth, verification
│   │   ├── departments/        # MSEDCL departments, service areas, electrical assets
│   │   ├── grievances/         # Grievance model, history, lifecycle views, serializers
│   │   ├── sla/                # SLA policies, escalations, pause logs, SLA engine
│   │   ├── assignments/        # Grievance assignments & recommendation engine
│   │   ├── incidents/          # Outage aggregator & grid incident tracking
│   │   ├── ml_engine/          # ML inference service, safety rules, analysis
│   │   ├── notifications/      # Dispatcher for system and in-app notifications
│   │   ├── audit/              # Immutable administrative audit logging
│   │   └── feedback/           # Retraining pipeline & officer corrections
│   ├── analytics/              # Real-time database analytics & aggregations
│   ├── ml_artifacts/           # Production model artifacts (TF-IDF vectorizer, model JSON)
│   └── tests/                  # Automated pytest test suite
│
├── ml/                         # ML Research, Training & Evaluation
│   ├── preprocessing/          # Text sanitization, PII removal, split builders
│   ├── training/               # Model training scripts (Logistic Regression, SVM, Naive Bayes)
│   ├── evaluation/             # Metrics evaluation, confusion matrices, audit runners
│   ├── datasets/               # Cleaned data splits and feedback storage
│   └── artifacts/              # Final serialized models and candidate benchmarks
│
├── docs/                       # System Documentation
│   ├── architecture.md         # Full system architecture
│   ├── api.md                  # REST API reference manual
│   ├── AUTHENTICATION.md       # Authentication & security specification
│   ├── SLA_ENGINE.md           # MSEDCL SLA specification & escalation hierarchy
│   ├── database.md             # Relational database schema
│   ├── ml_pipeline.md          # Machine learning pipeline specification
│   ├── dataset_provenance.md   # Data sources, authenticity & chain of custody
│   └── deployment.md           # Local & production deployment instructions
│
├── manage.py                   # Django management CLI
├── package.json                # Frontend package configuration
├── vite.config.js              # Vite bundler & reverse proxy configuration
├── pytest.ini                  # Pytest test runner configuration
└── requirements.txt            # Python dependencies
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+ (with virtual environment)
- Node.js 18+ and npm

### 2. Environment Setup
```bash
# Clone the repository
git clone https://github.com/PrajwalMaidpawar/GrivHUB.git
cd GrivHUB

# Configure environment variables
cp .env.example .env
```

### 3. Backend Setup
```bash
# Activate virtual environment
venv\Scripts\activate          # Windows PowerShell: .\venv\Scripts\Activate.ps1

# Run database migrations
python manage.py migrate

# Seed initial system users and administrative accounts
python manage.py seed_users
```

### 4. Running the Development Services
```bash
# Option A: Run using the root PowerShell orchestrator (Windows)
powershell -ExecutionPolicy Bypass -File .\start-local.ps1

# Option B: Run services manually
# Terminal 1 (Backend on port 8005):
python manage.py runserver 127.0.0.1:8005

# Terminal 2 (Frontend on port 3000):
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Demonstration Credentials

| Role | Username / Identifier | Password | Domain / Department |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `admin123` | Circle Head / Administrator |
| **Field Officer (Power)** | `officer_pune` | `officer123` | Power Supply & Operations |
| **Field Officer (Metering)** | `officer_metering` | `officer123` | Metering & Technical Services |
| **Electricity Consumer** | `consumer_demo` | `consumer123` | Pune Urban Circle (Consumer # `270019284102`) |

---

## 🧪 Testing & Validation

Run the complete automated test suite:

```bash
# Run all backend and ML tests
pytest

# Run tests with verbose output
pytest -v

# Run frontend production build validation
npm run build
```

---

## 📚 Documentation Links

- [System Architecture](docs/architecture.md)
- [API Reference Manual](docs/api.md)
- [Authentication & Access Control](docs/AUTHENTICATION.md)
- [MSEDCL SLA Engine Specification](docs/SLA_ENGINE.md)
- [Relational Database Schema](docs/database.md)
- [ML Pipeline Architecture](docs/ml_pipeline.md)
- [Dataset Provenance & Real-Data Authenticity](docs/dataset_provenance.md)
- [Deployment Guide](docs/deployment.md)
- [Testing & Quality Assurance](docs/testing.md)
- [Security Controls & Policies](docs/security.md)
- [System Scope & Limitations](docs/limitations.md)

---

## 📄 License
This project is licensed under the MIT License.
