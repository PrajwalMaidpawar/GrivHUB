"""
GrievanceHUB Django Settings
Configures PostgreSQL relational database, REST Framework, JWT/Session Auth, CORS, and ML engine.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "grievancehub-insecure-secret-key-2026-prod-gate")

DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "t")

allowed_hosts_env = os.environ.get("ALLOWED_HOSTS", "*")
if allowed_hosts_env == "*":
    ALLOWED_HOSTS = ["*"]
else:
    ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_env.split(",") if h.strip()]

APPEND_SLASH = False

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "backend.apps.accounts",
    "backend.apps.departments",
    "backend.apps.assignments",
    "backend.apps.incidents",
    "backend.apps.sla",
    "backend.apps.notifications",
    "backend.apps.feedback",
    "backend.apps.audit",
    "backend.apps.ml_engine",
    "backend.grievances",
    "backend.analytics",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.grievancehub.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.grievancehub.wsgi.application"

# Primary Relational Database Configuration (PostgreSQL with SQLite fallback)
DB_ENGINE = os.environ.get("DB_ENGINE", "django.db.backends.postgresql")
DB_NAME = os.environ.get("DB_NAME", "grievancehub")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "postgres")
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")

USE_SQLITE_DEV = os.environ.get("USE_SQLITE", "False").lower() in ("true", "1")

if USE_SQLITE_DEV:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE,
            "NAME": DB_NAME,
            "USER": DB_USER,
            "PASSWORD": DB_PASSWORD,
            "HOST": DB_HOST,
            "PORT": DB_PORT,
        }
    }

# Custom User Model
AUTH_USER_MODEL = "accounts.User"

# REST Framework Configuration
_IS_TESTING = "pytest" in sys.modules or any("pytest" in arg for arg in sys.argv) or "test" in sys.argv

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "backend.apps.accounts.authentication.CsrfExemptSessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "10000/day",
        "user": "50000/day",
        "auth_login": "10/minute",
        "auth_signup": "1000/minute" if _IS_TESTING else "10/minute",
        "auth_verify": "1000/minute" if _IS_TESTING else "15/minute",
        "auth_resend": "3/minute",
        "auth_password_reset": "5/minute",
        "staff_login": "10/minute",
        "staff_signup": "1000/minute" if _IS_TESTING else "10/minute",
        "staff_verify": "1000/minute" if _IS_TESTING else "15/minute",
        "admin_invite": "1000/hour" if _IS_TESTING else "20/hour",
        "admin_action": "1000/minute" if _IS_TESTING else "60/minute",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

# Session & CSRF Cookie Security
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False  # Allows Axios to read CSRF token
CSRF_COOKIE_SAMESITE = "Lax"

# CSRF Trusted Origins (Allows React/Vite dev servers on localhost/127.0.0.1)
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8005",
    "http://127.0.0.1:8005",
]
_csrf_origins = os.environ.get("CSRF_TRUSTED_ORIGINS", "")
if _csrf_origins:
    CSRF_TRUSTED_ORIGINS.extend([o.strip() for o in _csrf_origins.split(",") if o.strip()])

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Staff Allowed Email Domains (If empty, allows development domain / any in development)
_staff_domains = os.environ.get("STAFF_ALLOWED_EMAIL_DOMAINS", "")
STAFF_ALLOWED_EMAIL_DOMAINS = [d.strip().lower() for d in _staff_domains.split(",") if d.strip()]

# CAPTCHA Configuration
CAPTCHA_ENABLED = os.environ.get("CAPTCHA_ENABLED", "False").lower() in ("true", "1", "t")
CAPTCHA_SITE_KEY = os.environ.get("CAPTCHA_SITE_KEY", "")
CAPTCHA_SECRET_KEY = os.environ.get("CAPTCHA_SECRET_KEY", "")

# CORS Configuration for React Frontend
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8005",
    "http://127.0.0.1:8005",
]
cors_origins_env = os.environ.get("CORS_ALLOWED_ORIGINS", "")
if cors_origins_env:
    CORS_ALLOWED_ORIGINS.extend([o.strip() for o in cors_origins_env.split(",") if o.strip()])

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# GrievanceHUB ML Service Settings
ML_ARTIFACTS_DIR = os.environ.get("ML_ARTIFACTS_DIR", os.path.join(BASE_DIR, "ml_artifacts"))
ML_REVIEW_THRESHOLD = float(os.environ.get("ML_REVIEW_THRESHOLD", "0.75"))
ML_AUTO_LOAD = True

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s [%(levelname)s] [%(name)s]: %(message)s"
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.environ.get("LOG_LEVEL", "INFO"),
    },
}
