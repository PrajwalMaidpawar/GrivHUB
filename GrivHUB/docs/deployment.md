# GrievanceHUB Local & Production Deployment Guide

## 1. Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ (or local SQLite dev mode)

## 2. Environment Setup
```bash
cp .env.example .env
```

## 3. Backend Setup
```bash
venv\Scripts\python.exe -m django migrate --settings=backend.grievancehub.settings
venv\Scripts\python.exe -m django seed_users --settings=backend.grievancehub.settings
venv\Scripts\python.exe backend/server.py 8005
```

## 4. Frontend Setup
```bash
npm run dev
```
Access client at `http://localhost:3000`.
