from django.db import models


# Create your models here.


class Annotation(models.Model):
    ITEM_TYPE_CHOICES = (('D', 'Discourse'),
                         ('S', 'Speaker'),
                         ('U', 'Utterance'),
                         ('W', 'Word'),
                         ('Y', 'Syllable'),
                         ('P', 'Phone'))
    item_type = models.CharField(max_length=1, choices=ITEM_TYPE_CHOICES, default='P')
    label = models.CharField(max_length=100)
    save_user = models.BooleanField(default=False)

    def __str__(self):
        return '{}'.format(self.label)


class AnnotationField(models.Model):
    FIELD_CHOICES = (('C', 'Choice field'),
                     ('S', 'String'),
                     ('N', 'Numeric'))
    annotation = models.ForeignKey(Annotation, on_delete=models.CASCADE, related_name='fields')
    annotation_choice = models.CharField(max_length=1, choices=FIELD_CHOICES, default='C')
    label = models.CharField(max_length=100)

    def __str__(self):
        return '{} {}'.format(self.annotation, self.label)


class AnnotationChoice(models.Model):
    annotation = models.ForeignKey(AnnotationField, on_delete=models.CASCADE, related_name='choices')
    choice = models.CharField(max_length=100)

    def __str__(self):
        return '{} = {}'.format(self.annotation, self.choice)
