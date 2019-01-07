from rest_framework import serializers
from . import models


class AnnotationChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationChoice
        fields = '__all__'

class AnnotationFieldSerializer(serializers.ModelSerializer):
    choices = AnnotationChoiceSerializer(many=True)
    class Meta:
        model = models.AnnotationField
        fields = ('id', 'label', 'annotation_choice', 'choices')

class AnnotationSerializer(serializers.ModelSerializer):
    fields = AnnotationFieldSerializer(many=True)
    class Meta:
        model = models.Annotation
        fields = ('id', 'label', 'item_type', 'save_user', 'fields')