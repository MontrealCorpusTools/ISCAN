# Generated by Django 2.0 on 2018-03-09 17:05

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Annotation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('item_type', models.CharField(choices=[('D', 'Discourse'), ('S', 'Speaker'), ('U', 'Utterance'), ('W', 'Word'), ('Y', 'Syllable'), ('P', 'Phone')], default='P', max_length=1)),
                ('annotation_choice', models.CharField(choices=[('D', 'Discourse'), ('S', 'Speaker'), ('U', 'Utterance'), ('W', 'Word'), ('Y', 'Syllable'), ('P', 'Phone')], default='C', max_length=1)),
                ('save_user', models.BooleanField(default=False)),
                ('label', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='AnnotationCategory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='AnnotationChoice',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('choice', models.CharField(max_length=100)),
                ('annotation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='choices', to='annotator.Annotation')),
            ],
        ),
    ]