# Generated by Django 2.0 on 2018-03-09 17:34

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('annotator', '0002_auto_20180309_1711'),
    ]

    operations = [
        migrations.AlterField(
            model_name='annotationchoice',
            name='annotation',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='choices', to='annotator.AnnotationField'),
        ),
    ]