# GrievanceHUB Enterprise — Backend Deployment Guide

This guide describes the complete procedure for deploying the **GrievanceHUB Django REST API and Machine Learning Backend** into production environments.

---

## 1. System Requirements & Prerequisites

| Requirement | Minimum Specification | Recommended Production |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 / RHEL 9 | Ubuntu 24.04 LTS / Enterprise Linux |
| **Python Version** | Python 3.10.x | Python 3.11 or 3.12 |
| **Memory (RAM)** | 2 GB (Includes ML model in RAM) | 4 GB to 8 GB |
| **CPU** | 2 vCPU | 4 vCPU |
| **Database** | MongoDB 6.0+ | MongoDB 7.0+ (Replica Set / Atlas) |
| **Reverse Proxy** | Nginx 1.22+ or Cloud Load Balancer | Nginx / Caddy / Cloudflare |

---

## 2. Environment Setup & Dependency Installation

### Step 2.1: Clone and Create Virtual Environment
```bash
cd /opt/grievancehub
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
```

### Step 2.2: Install Production Dependencies
```bash
pip install -r backend/requirements.txt
```

---

## 3. Environment Variables Configuration

Create a secure `.env` file inside `/opt/grievancehub/backend/.env`:

```ini
# ==============================================================================
# GrievanceHUB Backend Production Configuration
# ==============================================================================

# Core Django Settings
DEBUG=False
DJANGO_SECRET_KEY=9f8c2b7e1a3d4f5g6h7j8k9l0zxcvbnm1234567890qwertyuiopasdfghjkl
ALLOWED_HOSTS=api.grievancehub.gov.in,127.0.0.1,localhost
PORT=8005
HOST=0.0.0.0

# CORS Whitelist (Frontend Domains)
CORS_ALLOWED_ORIGINS=https://grievancehub.gov.in,https://admin.grievancehub.gov.in

# MongoDB Production Connection
MONGODB_URI=mongodb://grievance_app_user:SecureProdPass2026@mongodb-cluster.internal:27017/grievancehub_prod?authSource=admin&retryWrites=true&w=majority
MONGODB_DATABASE=grievancehub_prod

# Machine Learning Artifacts & Threshold
ML_ARTIFACTS_DIR=backend/ml_artifacts
ML_REVIEW_THRESHOLD=0.75
ML_AUTO_LOAD=True

# Rate Limiting (Requests/minute per client IP)
RATE_LIMIT_SUBMIT_PER_MIN=30
RATE_LIMIT_CLASSIFY_PER_MIN=60
RATE_LIMIT_ADMIN_PER_MIN=60
RATE_LIMIT_DEFAULT_PER_MIN=180

# Logging
LOG_LEVEL=INFO
```

---

## 4. MongoDB Database Setup & Recommended Indexes

Ensure MongoDB is running and execute the following index initialization script in `mongosh`:

```javascript
use grievancehub_prod;

// Grievances Collection Indexes
db.grievances.createIndex({ "grievance_id": 1 }, { unique: true });
db.grievances.createIndex({ "status": 1 });
db.grievances.createIndex({ "assigned_officer_id": 1 });
db.grievances.createIndex({ "department_id": 1 });
db.grievances.createIndex({ "citizen_id": 1 });
db.grievances.createIndex({ "created_at": -1 });
db.grievances.createIndex({ "location.ward": 1, "location.zone": 1 });

// Officers Collection Indexes
db.officers.createIndex({ "officer_id": 1 }, { unique: true });
db.officers.createIndex({ "department_id": 1, "assigned_ward": 1, "availability_status": 1 });

// Activities & Audits Indexes
db.activities.createIndex({ "grievance_id": 1, "created_at": -1 });
db.routing_audits.createIndex({ "grievance_id": 1, "timestamp": -1 });
db.notifications.createIndex({ "recipient_id": 1, "is_read": 1, "created_at": -1 });
```

---

## 5. ML Model Artifacts Placement

Verify the trained ML model files exist in `backend/ml_artifacts/`:
- `model.json` (Logistic regression coefficients & biases)
- `vectorizer.json` (TF-IDF vocabulary, idf weights, sublinear tf settings)
- `label_mapping.json` (Category to index mapping)
- `model_metadata.json` (Accuracy, precision, recall, training timestamp)
- `preprocessing_config.json` (Text cleaning rules & stopwords)

The ML classifier singleton automatically loads these artifacts on startup and caches them in RAM for zero-latency inference (< 5ms per grievance).

---

## 6. Static Files & Build Execution

```bash
# If using standard Django static files
python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.grievancehub.settings'); django.setup(); from django.core.management import call_command; call_command('collectstatic', interactive=False)"
```

---

## 7. Production Startup Commands

### Option A: High-Performance Standalone Daemon (Recommended)
```bash
# Direct startup with custom port
python3 backend/server.py 8005
```

### Option B: Systemd Service Configuration
Create `/etc/systemd/system/grievancehub-backend.service`:

```ini
[Unit]
Description=GrievanceHUB Enterprise Backend API Service
After=network.target mongodb.service

[Service]
Type=simple
User=grievancehub
WorkingDirectory=/opt/grievancehub
EnvironmentFile=/opt/grievancehub/backend/.env
ExecStart=/opt/grievancehub/venv/bin/python3 /opt/grievancehub/backend/server.py 8005
Restart=always
RestartSec=5s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable grievancehub-backend
sudo systemctl start grievancehub-backend
sudo systemctl status grievancehub-backend
```

---

## 8. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/grievancehub-api.conf`:

```nginx
server {
    listen 80;
    server_name api.grievancehub.gov.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.grievancehub.gov.in;

    ssl_certificate /etc/letsencrypt/live/api.grievancehub.gov.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.grievancehub.gov.in/privkey.pem;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Request size limit for evidence photo uploads (15MB)
    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:8005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

---

## 9. Health Check & Verification

Run automated health check:
```bash
curl -i https://api.grievancehub.gov.in/api/health/
```

Expected output:
```json
{
  "status_code": 200,
  "success": true,
  "message": "System is healthy and operational.",
  "data": {
    "status": "healthy",
    "database": "connected",
    "ml_model": "loaded",
    "version": "1.0.0",
    "service": "GrievanceHUB Enterprise API",
    "environment": "production"
  }
}
```

---

## 10. Troubleshooting & Common Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`503 Service Unavailable` on Health Check** | ML artifacts missing or MongoDB unreachable | Verify `ML_ARTIFACTS_DIR` path and test MongoDB connection with `mongosh "$MONGODB_URI"` |
| **`429 Rate Limit Exceeded`** | Client sending excessive automated queries | Adjust rate limit environment variables or implement client backoff |
| **`403 Forbidden` on Cross-Origin Requests** | Frontend origin missing from CORS whitelist | Add frontend origin to `CORS_ALLOWED_ORIGINS` in `.env` |
| **`400 Validation Error` on Grievance Submission** | Missing required location, title, or description | Ensure title (min 5 chars), description (min 15 chars), and ward/zone are supplied |
