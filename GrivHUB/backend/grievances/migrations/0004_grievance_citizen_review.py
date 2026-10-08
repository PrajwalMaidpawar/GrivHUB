from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("grievances", "0003_grievance_officer_workflow"),
    ]

    operations = [
        migrations.AddField(
            model_name="grievance",
            name="citizen_rating",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="grievance",
            name="citizen_feedback",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="grievance",
            name="reopen_reason",
            field=models.TextField(blank=True, null=True),
        ),
    ]
