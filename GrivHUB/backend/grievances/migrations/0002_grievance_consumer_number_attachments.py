from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("grievances", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="grievance",
            name="attachments",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="grievance",
            name="consumer_number",
            field=models.CharField(blank=True, db_index=True, max_length=32, null=True),
        ),
    ]
