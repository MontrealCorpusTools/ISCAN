# Generated by Django 2.0 on 2019-05-30 10:46

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('iscan', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_type', models.CharField(choices=[('G', 'Guest'), ('R', 'Researcher'), ('S', 'Superuser')], default='G', max_length=1)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='corpus',
            name='corpus_type',
            field=models.CharField(choices=[('T', 'Tutorial'), ('P', 'Public'), ('R', 'Restricted')], default='R', max_length=1),
        ),
        migrations.AlterField(
            model_name='corpus',
            name='input_format',
            field=models.CharField(choices=[('M', 'MFA forced aligned TextGrids'), ('F', 'FAVE forced aligned TextGrids'), ('W', 'Web-MAUS forced aligned TextGrids'), ('L', 'LaBB-CAT TextGrid output'), ('P', 'Partitur files'), ('T', 'TIMIT'), ('B', 'Buckeye')], default='M', max_length=1),
        ),
    ]
