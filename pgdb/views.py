import os
import shutil
import signal
import csv
import json
from django.views.generic import View
from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse, JsonResponse, FileResponse
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.conf import settings
from django.views.generic import TemplateView

from .models import Database, Corpus


from polyglotdb import CorpusContext
from .serializers import UserSerializer
from rest_framework.response import Response
from rest_framework import generics, status

import logging
log = logging.getLogger(__name__)


# Create your views here.


def index(request):
    return render(request, 'pgdb/app.html')


class CheckAuthView(generics.views.APIView):
    def get(self, request, *args, **kwargs):
        if isinstance(request.user, User):
            return Response(UserWithFullGroupsSerializer(request.user).data)
        else:
            return Response(UnauthorizedUserSerializer(request.user).data)


class AuthView(generics.views.APIView):

    def post(self, request, *args, **kwargs):
        print(request.data)
        print(dir(request))
        print(dir(request.session))

        user = authenticate(request, username=request.data['username'], password=request.data['password'])
        login(request, user)
        return Response(UserWithFullGroupsSerializer(request.user).data)

    def delete(self, request, *args, **kwargs):
        logout(request)
        return Response({})


def save_pitch_track(request, corpus, utterance_id):
    # if request.auth is None:
    #    return Response(status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_superuser:
        try:
            corpus = Corpus.objects.get(name=corpus, user_permissions__user=request.user)
        except Corpus.DoesNotExist:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not corpus.user_permissions.can_edit:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
    data = json.loads(request.body)
    with CorpusContext(corpus.config) as c:
        c.update_utterance_pitch_track(utterance_id, data)
    return JsonResponse(data={'success': True})


def export(request, corpus):
    response = HttpResponse(content_type='text/csv')
    a_type = request.data['annotation_type']
    corpus = Corpus.objects.get(pk=corpus)
    ordering = request.data.get('ordering', '')
    filters = request.data['filters']
    columns = request.data['columns']
    response['Content-Disposition'] = 'attachment; filename="{}_query_export.csv"'.format(a_type)
    print(filters)
    print(columns)
    with CorpusContext(corpus.config) as c:
        a = getattr(c, a_type)
        q = c.query_graph(a)
        for k, v in filters.items():
            if v[0] == '':
                continue
            if v[0] == 'null':
                v = None
            else:
                try:
                    v = float(v[0])
                except ValueError:
                    v = v[0]
            k = k.split('__')
            att = a
            for f in k:
                att = getattr(att, f)
            q = q.filter(att == v)
        if ordering:
            desc = False
            if ordering.startswith('-'):
                desc = True
                ordering = ordering[1:]
            ordering = ordering.split('.')
            att = a
            for o in ordering:
                att = getattr(att, o)
            q = q.order_by(att, desc)
        else:
            q = q.order_by(getattr(a, 'label'))

        columns_for_export = []
        for c in columns:
            att = a
            for f in c.split('__'):
                att = getattr(att, f)
            columns_for_export.append(att)
        q = q.columns(*columns_for_export)
    writer = csv.writer(response)
    q.to_csv(writer)

    return response


def export_pitch_tracks(request, corpus):
    # if request.auth is None:
    #    return Response(status=status.HTTP_401_UNAUTHORIZED)
    print(dir(request.GET))
    if not request.user.is_superuser:
        try:
            corpus = Corpus.objects.get(name=corpus, user_permissions__user=request.user)
        except Corpus.DoesNotExist:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
    with CorpusContext(corpus.config) as c:
        props = c.query_metadata(c.discourse).factors() + c.query_metadata(c.discourse).numerics()
        q = c.query_graph(c.word).columns(c.word.label.column_name('word'),
                                          c.word.begin.column_name('begin'),
                                          c.word.end.column_name('end'),
                                          c.word.utterance.begin.column_name('utterance_begin'),
                                          c.word.utterance.end.column_name('utterance_end'),
                                          c.word.pitch.track)
        for p in props:
            q = q.columns(getattr(c.word.discourse, p).column_name('sound_file_' + p))
        props = c.query_metadata(c.speaker).factors() + c.query_metadata(c.speaker).numerics()
        for p in props:
            q = q.columns(getattr(c.word.speaker, p).column_name('speaker_' + p))
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="F0_tracks.csv"'

        writer = csv.writer(response)
        q.to_csv(writer)
        return response
