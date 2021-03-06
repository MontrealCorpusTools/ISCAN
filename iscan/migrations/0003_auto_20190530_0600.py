# Generated by Django 2.0 on 2019-05-30 11:00

from django.conf import settings
from django.db import migrations, models


def create_default_profiles(apps, schema_editor):
    Profile = apps.get_model("iscan", "Profile")
    User = apps.get_model('auth', 'User')
    for user in User.objects.all():
        Profile.objects.get_or_create(user=user)


class Migration(migrations.Migration):

    dependencies = [
        ('iscan', '0002_auto_20190530_0546'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='user_type',
            field=models.CharField(choices=[('G', 'Guest'), ('A', 'Annotator'), ('R', 'Researcher'), ('S', 'Superuser')], default='G', max_length=1),
        ),
        migrations.RunPython(create_default_profiles),
    ]
