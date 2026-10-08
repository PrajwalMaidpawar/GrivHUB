from django.apps import AppConfig

class MlEngineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'backend.apps.ml_engine'
    verbose_name = 'ML Inference Engine & Safety Rules'
