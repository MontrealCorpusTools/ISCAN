# Generated by Django 2.0 on 2018-09-10 18:43

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Corpus',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('input_format', models.CharField(choices=[('M', 'MFA forced aligned TextGrids'), ('F', 'FAVE forced aligned TextGrids'), ('L', 'LaBB-CAT TextGrid output'), ('P', 'Partitur files'), ('T', 'TIMIT'), ('B', 'Buckeye')], default='M', max_length=1)),
                ('imported', models.BooleanField(default=False)),
                ('busy', models.BooleanField(default=False)),
                ('current_task_id', models.CharField(blank=True, max_length=250, null=True)),
            ],
            options={
                'verbose_name_plural': 'corpora',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='CorpusPermissions',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('can_edit', models.BooleanField(default=False)),
                ('can_annotate', models.BooleanField(default=False)),
                ('can_view_annotations', models.BooleanField(default=False)),
                ('can_listen', models.BooleanField(default=False)),
                ('can_view_detail', models.BooleanField(default=False)),
                ('can_enrich', models.BooleanField(default=False)),
                ('can_access_database', models.BooleanField(default=False)),
                ('corpus', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_permissions', to='iscan.Corpus')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='corpus_permissions', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Database',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('neo4j_http_port', models.SmallIntegerField(blank=True)),
                ('neo4j_https_port', models.SmallIntegerField(blank=True)),
                ('neo4j_bolt_port', models.SmallIntegerField(blank=True)),
                ('neo4j_admin_port', models.SmallIntegerField(blank=True)),
                ('influxdb_http_port', models.SmallIntegerField(blank=True)),
                ('influxdb_meta_port', models.SmallIntegerField(blank=True)),
                ('influxdb_udp_port', models.SmallIntegerField(blank=True)),
                ('influxdb_admin_port', models.SmallIntegerField(blank=True)),
                ('status', models.CharField(choices=[('S', 'Stopped'), ('R', 'Running'), ('E', 'Error')], default='S', max_length=1)),
                ('neo4j_pid', models.IntegerField(blank=True, null=True)),
                ('influxdb_pid', models.IntegerField(blank=True, null=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Enrichment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('running', models.BooleanField(default=False)),
                ('completed', models.BooleanField(default=False)),
                ('last_run', models.DateTimeField(blank=True, null=True)),
                ('corpus', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='iscan.Corpus')),
            ],
        ),
        migrations.CreateModel(
            name='Query',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('annotation_type', models.CharField(choices=[('U', 'Utterance'), ('W', 'Word'), ('S', 'Syllable'), ('P', 'Phone')], max_length=1)),
                ('running', models.BooleanField(default=False)),
                ('result_count', models.IntegerField(blank=True, null=True)),
                ('corpus', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='iscan.Corpus')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Queries',
            },
        ),
        migrations.AddField(
            model_name='corpus',
            name='database',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='corpora', to='iscan.Database'),
        ),
        migrations.AddField(
            model_name='corpus',
            name='users',
            field=models.ManyToManyField(through='iscan.CorpusPermissions', to=settings.AUTH_USER_MODEL),
        ),
    ]
