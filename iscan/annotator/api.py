from rest_framework import viewsets, status

from . import models
from . import serializers


class AnnotationViewSet(viewsets.ModelViewSet):
    model = models.Annotation
    queryset = models.Annotation.objects.all()
    serializer_class = serializers.AnnotationSerializer

    def get_queryset(self):
        annotation_type = self.request.data.get('annotation_type', '')

        if not annotation_type:
            results = models.Annotation.objects.all()
        else:
            results = models.Annotation.objects.filter(item_type=annotation_type[0].upper()).all()
        for r in results:
            r.check_hierarchy()
        return results
