import os
import shutil
import signal
import json

from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse, JsonResponse, FileResponse
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
        if request.auth is not None:
            return Response(UserWithFullGroupsSerializer(request.user).data)
        else:
            return Response(UnauthorizedUserSerializer(request.user).data)


def save_pitch_track(request, corpus, utterance_id):
    if request.auth is None:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
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


def sound_file(request, corpus, utterance_id):
    if request.auth is None:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_superuser:
        try:
            corpus = Corpus.objects.get(name=corpus, user_permissions__user=request.user)
        except Corpus.DoesNotExist:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not corpus.user_permissions.can_listen:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
    with CorpusContext(corpus.config) as c:
        fname = c.utterance_sound_file(utterance_id, 'consonant')

    response = FileResponse(open(fname, "rb"))
    # response['Content-Type'] = 'audio/wav'
    # response['Content-Length'] = os.path.getsize(fname)
    return response


def export_pitch_tracks(request, corpus):
    if request.auth is None:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
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


def get_next_utterance(request, corpus, utterance_id):
    if request.auth is None:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_superuser:
        try:
            corpus = Corpus.objects.get(pk=corpus, user_permissions__user=request.user)
        except Corpus.DoesNotExist:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
    with CorpusContext(corpus.config) as c:
        utt = c.query_graph(c.utterance).filter(c.utterance.id == utterance_id).preload(c.utterance.discourse).all()[0]
        q = c.query_graph(c.utterance).filter(c.utterance.begin >= utt.end).limit(1).all()
        if len(q):
            return JsonResponse({'id': q[0].id})
        for i, d in enumerate(sorted(c.discourses)):
            if d == utt.discourse.name and i < len(c.discourses) - 1:
                d_name = c.discourses[i + 1]
                break
        else:
            return JsonResponse({'id': None})
        utt = c.query_graph(c.utterance).filter(c.utterance.discourse.name == d_name).order_by(c.utterance.begin).limit(
            1).all()[0]
        return JsonResponse({'id': utt.id})


def get_previous_utterance(request, corpus, utterance_id):
    if request.auth is None:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    if not request.user.is_superuser:
        try:
            corpus = Corpus.objects.get(pk=corpus, user_permissions__user=request.user)
        except Corpus.DoesNotExist:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
    with CorpusContext(corpus.config) as c:
        utt = c.query_graph(c.utterance).filter(c.utterance.id == utterance_id).preload(c.utterance.discourse).all()[0]
        q = c.query_graph(c.utterance).filter(c.utterance.end <= utt.begin).limit(1).all()
        if len(q):
            return JsonResponse({'id': q[0].id})
        for i, d in enumerate(sorted(c.discourses)):
            if d == utt.discourse.name and i > 0:
                d_name = c.discourses[i - 1]
                break
        else:
            return JsonResponse({'id': None})
        utt = c.query_graph(c.utterance).filter(c.utterance.discourse.name == d_name).order_by(c.utterance.begin).limit(
            1).all()[0]
        return JsonResponse({'id': utt.id})
