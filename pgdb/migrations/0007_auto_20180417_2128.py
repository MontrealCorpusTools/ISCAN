# Generated by Django 2.0 on 2018-04-17 21:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pgdb', '0006_auto_20180402_2309'),
    ]

    operations = [
        migrations.AddField(
            model_name='query',
            name='result_count',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='query',
            name='running',
            field=models.BooleanField(default=False),
        ),
    ]