# Generated by Django 2.0 on 2018-09-10 18:43

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('iscan', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Annotation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('item_type', models.CharField(choices=[('U', 'Utterance'), ('W', 'Word'), ('Y', 'Syllable'), ('P', 'Phone')], default='P', max_length=1)),
                ('label', models.CharField(max_length=100)),
                ('save_user', models.BooleanField(default=False)),
                ('corpus', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='iscan.Corpus')),
            ],
        ),
        migrations.CreateModel(
            name='AnnotationChoice',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('choice', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='AnnotationField',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('annotation_choice', models.CharField(choices=[('C', 'Choice field'), ('S', 'String'), ('B', 'Boolean'), ('N', 'Numeric')], default='C', max_length=1)),
                ('label', models.CharField(max_length=100)),
                ('annotation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fields', to='annotator.Annotation')),
            ],
        ),
        migrations.AddField(
            model_name='annotationchoice',
            name='annotation',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='choices', to='annotator.AnnotationField'),
        ),
    ]
