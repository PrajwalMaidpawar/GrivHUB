from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("grievances", "0002_grievance_consumer_number_attachments"),
    ]

    operations = [
        migrations.AddField(
            model_name="grievance",
            name="location",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="grievance",
            name="progress_updates",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="grievance",
            name="resolution_summary",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="grievance",
            name="resolution_details",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="grievance",
            name="resolution_evidence",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="grievance",
            name="started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
