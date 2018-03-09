from rest_framework import generics, permissions, viewsets, status, pagination
from rest_framework.response import Response
from rest_framework.decorators import detail_route, list_route

from . import models
from . import serializers


class AnnotationViewSet(viewsets.ModelViewSet):
    model = models.Annotation
    queryset = models.Annotation.objects.all()
    serializer_class = serializers.AnnotationSerializer
