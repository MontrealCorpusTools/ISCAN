import os
import shutil
import signal

from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.views.generic import TemplateView


from .models import Database, Corpus
from .forms import CorpusForm
from .tasks import import_corpus_task, enrich_corpus_task, query_corpus_task
from celery.result import AsyncResult
import celery.states as cstates

from polyglotdb import CorpusContext


# Create your views here.


def index(request):
    return render(request, 'pgdb/app.html')
