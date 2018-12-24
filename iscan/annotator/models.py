from django.db import models
from polyglotdb import CorpusContext

# Create your models here.


class Annotation(models.Model):
    ITEM_TYPE_CHOICES = (('U', 'Utterance'),
                         ('W', 'Word'),
                         ('Y', 'Syllable'),
                         ('P', 'Phone'))
    corpus = models.ForeignKey('iscan.Corpus', on_delete=models.CASCADE)
    item_type = models.CharField(max_length=1, choices=ITEM_TYPE_CHOICES, default='P')
    label = models.CharField(max_length=100)
    save_user = models.BooleanField(default=False)

    def __str__(self):
        return '{}'.format(self.label)

    def check_hierarchy(self):
        a_type = self.get_item_type_display().lower()
        with CorpusContext(self.corpus.config) as c:
            if not c.hierarchy.has_subannotation_type(self.label):
                properties = []
                if self.save_user:
                    properties =[('user', str)]
                for field in self.fields.all():
                    if field.annotation_choice == 'N':
                        t = float
                    elif field.annotation_choice == 'B':
                        t = bool
                    else:
                        t = str
                    properties.append((field.label, t))
                c.hierarchy.add_subannotation_type(c, a_type, self.label, properties=properties)

    def add_property(self, field):
        props = []
        if field.annotation_choice == 'N':
            t = float
        elif field.annotation_choice == 'B':
            t = bool
        else:
            t = str
        props.append((field.label, t))
        with CorpusContext(self.corpus.config) as c:
            c.hierarchy.add_subannotation_properties(c, self.label, props)
            print(c.hierarchy.subannotations)
            print(c.hierarchy.subannotation_properties)

    def remove_property(self, field):
        props = []
        props.append(field.label)
        with CorpusContext(self.corpus.config) as c:
            c.hierarchy.remove_subannotation_properties(c, self.label, props)
            print(c.hierarchy.subannotations)
            print(c.hierarchy.subannotation_properties)

    def save(self, *args, **kwargs):
        a_type = self.get_item_type_display().lower()
        s_type = self.label
        with CorpusContext(self.corpus.config) as c:
            if not c.hierarchy.has_subannotation_type(s_type):
                properties = []
                if self.save_user:
                    properties =[('user', str)]
                c.hierarchy.add_subannotation_type(c, a_type, s_type, properties=properties)
        super(Annotation, self).save(*args, **kwargs)
        print(c.hierarchy.subannotations)
        print(c.hierarchy.subannotation_properties)

    def delete(self, using=None, keep_parents=False):
        with CorpusContext(self.corpus.config) as c:
            c.hierarchy.remove_subannotation_type(c, self.label)
        super(Annotation, self).delete(using=None, keep_parents=False)



class AnnotationField(models.Model):
    FIELD_CHOICES = (('C', 'Choice field'),
                     ('S', 'String'),
                     ('B', 'Boolean'),
                     ('N', 'Numeric'))
    annotation = models.ForeignKey(Annotation, on_delete=models.CASCADE, related_name='fields')
    annotation_choice = models.CharField(max_length=1, choices=FIELD_CHOICES, default='C')
    label = models.CharField(max_length=100)

    def __str__(self):
        return '{} {}'.format(self.annotation, self.label)

    def save(self, *args, **kwargs):
        super(AnnotationField, self).save(*args, **kwargs)
        self.annotation.add_property(self)

    def delete(self, using=None, keep_parents=False):
        self.annotation.remove_property(self)
        super(AnnotationField, self).delete(using=None, keep_parents=False)



class AnnotationChoice(models.Model):
    annotation = models.ForeignKey(AnnotationField, on_delete=models.CASCADE, related_name='choices')
    choice = models.CharField(max_length=100)

    def __str__(self):
        return '{} = {}'.format(self.annotation, self.choice)
