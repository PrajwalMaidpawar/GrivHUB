# GrievanceHUB Automated Test Suite Documentation

## 1. Test Coverage
- **Authentication**: `backend/tests/test_auth.py`
- **Grievance Lifecycle**: `backend/tests/test_grievances.py`
- **ML Inference & Safety Rules**: `backend/tests/test_ml_service.py`

## 2. Running Tests
```bash
$env:USE_SQLITE="True"; $env:DJANGO_SETTINGS_MODULE="backend.grievancehub.settings"; venv\Scripts\python.exe -m pytest backend/tests/test_auth.py backend/tests/test_grievances.py backend/tests/test_ml_service.py -v -o pythonpath=.
```
