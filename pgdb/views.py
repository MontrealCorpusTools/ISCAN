import os
import shutil
import signal
import json

from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse, JsonResponse, FileResponse
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.conf import settings
from django.views.generic import TemplateView

from .models import Database, Corpus
from .forms import CorpusForm
from .tasks import import_corpus_task, enrich_corpus_task, query_corpus_task
from celery.result import AsyncResult
import celery.states as cstates

from polyglotdb import CorpusContext
from .serializers import UserWithFullGroupsSerializer, UnauthorizedUserSerializer
from rest_framework.response import Response
from rest_framework import generics, status


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
    #if request.auth is None:
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



def export_pitch_tracks(request, corpus):
    #if request.auth is None:
    #    return Response(status=status.HTTP_401_UNAUTHORIZED)
    print(dir(request.GET))
    import csv
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
            q = q.columns(getattr(c.word.discourse, p).column_name('discourse_' + p))
        props = c.query_metadata(c.speaker).factors() + c.query_metadata(c.speaker).numerics()
        for p in props:
            q = q.columns(getattr(c.word.speaker, p).column_name('speaker_' + p))
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="F0_tracks.csv"'

        writer = csv.writer(response)
        q.to_csv(writer)
        return response
