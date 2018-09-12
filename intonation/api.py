import os
import csv
import time

from polyglotdb import CorpusContext
import django
from django.conf import settings
from django.http.response import FileResponse, HttpResponse
from rest_framework import generics, permissions, viewsets, status, pagination
from rest_framework.response import Response
from rest_framework.decorators import detail_route, list_route

from pgdb import models
from pgdb import serializers
from pgdb.tasks import run_query_task

from pgdb import api


class BestiaryCorpusViewSet(api.CorpusViewSet):
    @detail_route(methods=['get'])
    def bestiary_query(self, request, pk=None):
        if isinstance(request.user, django.contrib.auth.models.AnonymousUser):
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        try:
            query = models.Query.objects.get(corpus=corpus, name='Bestiary query')
        except models.Query.DoesNotExist:
            query = models.Query.objects.create(corpus=corpus, name='Bestiary query', annotation_type='U', user=request.user)
            query.config = {'filters':{}, 'columns':{},
                    'positions': {
                        'utterance': ['current']
                    },
                            'cache_acoustics': True,
                            'acoustic_columns':{'pitch':{'include': True, 'relative':True, 'relative_time':False}}}
            run_query_task.delay(query.pk)
            time.sleep(1)
        return Response(serializers.QuerySerializer(query).data)