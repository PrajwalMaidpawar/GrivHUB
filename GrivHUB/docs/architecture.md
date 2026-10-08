# GrievanceHUB System Architecture

## 1. Overview
GrievanceHUB is an AI-powered electricity consumer grievance routing, resolution, and operational intelligence platform designed for the Indian electricity distribution domain (inspired by MSEDCL/Mahavitaran workflows).

## 2. High-Level Architecture
- **Frontend Layer**: React 19 SPA built with Vite, Tailwind CSS, Lucide Icons, Axios, and Recharts. Standard JavaScript/JSX components.
- **Backend API Layer**: Django REST Framework (DRF) running modular apps for user management, grievances, departments, assignments, incidents, SLA, notifications, feedback, audit, and ML inference.
- **Data Persistence Layer**: PostgreSQL relational database storing normalized records, audit logs, and status transitions.
- **Machine Learning Subsystem**: Python scikit-learn pipeline performing TF-IDF vectorization, Multinomial Naive Bayes / Logistic Regression / Linear SVM classification, confidence estimation, and PII anonymization.

## 3. Communication Patterns
- RESTful HTTP APIs with JSON payload formats.
- Session / JWT Token authentication with role-based access control (`CONSUMER`, `OFFICER`, `ADMIN`).
- Real-time client polling / in-app notification center for live updates.
