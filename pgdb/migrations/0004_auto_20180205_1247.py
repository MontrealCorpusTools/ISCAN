# Generated by Django 2.0 on 2018-02-05 12:47

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pgdb', '0003_auto_20180205_1051'),
    ]

    operations = [
        migrations.AlterField(
            model_name='corpuspermissions',
            name='corpus',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_permissions', to='pgdb.Corpus'),
        ),
        migrations.AlterField(
            model_name='corpuspermissions',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='corpus_permissions', to=settings.AUTH_USER_MODEL),
        ),
    ]