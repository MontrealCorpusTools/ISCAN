import os
import shutil
import signal

from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.views.generic import TemplateView

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .utils import get_used_ports
from .serializers import DatabaseSerializer
from .models import Database, Corpus
from .forms import CorpusForm
from .tasks import import_corpus_task, enrich_corpus_task, query_corpus_task
from celery.result import AsyncResult
import celery.states as cstates

from polyglotdb import CorpusContext


# Create your views here.

class DatabaseStatusView(TemplateView):
    template_name = 'pgdb/database_status.html'

    def get_context_data(self, **kwargs):
        context = super(DatabaseStatusView, self).get_context_data(**kwargs)
        context['databases'] = Database.objects.all()
        return context


class CreateCorpusView(TemplateView):
    template_name = 'pgdb/create_corpus.html'

    def get_context_data(self, **kwargs):
        context = super(CreateCorpusView, self).get_context_data(**kwargs)
        if self.request.method == 'GET':
            form = CorpusForm()
        else:
            form = CorpusForm(self.request.POST)
            if form.is_valid():
                return context
        context['form'] = form
        return context


class CorpusStatusView(TemplateView):
    template_name = 'pgdb/corpus_status.html'

    def get_context_data(self, **kwargs):
        context = super(CorpusStatusView, self).get_context_data(**kwargs)
        database = self.request.GET.get('database', None)
        if database is None:
            context['corpora'] = Corpus.objects.all()
        else:
            context['corpora'] = Corpus.objects.filter(database__name=database).all()
        return context


def import_corpus_view(request):
    if request.method == 'POST':
        corpus_id = request.POST.get('corpus_id', None)
        success = False
        corpus = Corpus.objects.get(pk=corpus_id)

        if corpus.status == 'NI':
            t = import_corpus_task.delay(corpus.pk)
            corpus.status = 'IR'
            corpus.current_task_id = t.task_id
            corpus.save()
            success = True
        if success:
            messages.success(request, "The {} corpus import was started successfully!".format(corpus.name))
        else:
            messages.error(request, "Something went wrong!")
    return redirect('pgdb:corpus_status')


def change_database_status(request):
    if request.method == 'POST':
        database = request.POST.get('database', None)
        action = request.POST.get('action', None)
        if database is not None:
            db = Database.objects.get(name=database)
            if action == 'stop':
                mod_action = 'stopped'
                success = db.stop()
            elif action == 'start':
                mod_action = 'started'
                success = db.start()
            else:  # FIXME for downloading logs
                success = False
                pass
            if action != 'log':
                if success:
                    messages.success(request, "The database {} was successfully {}!".format(db.name, mod_action))
                else:
                    messages.error(request,
                                   "The database {} could not be {}. Please check the relevant logs.".format(db.name,
                                                                                                             mod_action))
    return redirect('pgdb:database_status')


@api_view(['GET', 'POST'])
def create_database(request):
    if request.method == 'POST':
        used_ports = get_used_ports()
        print(used_ports)
        current_ports = []
        data_dict = {'name': request.data.get('name'),
                     'neo4j_http_port': request.data.get('neo4j_http_port', None),
                     'neo4j_https_port': request.data.get('neo4j_https_port', None),
                     'neo4j_bolt_port': request.data.get('neo4j_bolt_port', None),
                     'neo4j_admin_port': request.data.get('neo4j_admin_port', None),
                     'influxdb_http_port': request.data.get('influxdb_http_port', None),
                     'influxdb_meta_port': request.data.get('influxdb_meta_port', None),
                     'influxdb_udp_port': request.data.get('influxdb_udp_port', None),
                     'influxdb_admin_port': request.data.get('influxdb_admin_port', None)}
        ports = {'neo4j': settings.BASE_NEO4J_PORT, 'influxdb': settings.BASE_INFLUXDB_PORT}
        for k, v in data_dict.items():
            if 'port' not in k:
                continue
            if v is None:
                if 'neo4j' in k:
                    port_key = 'neo4j'
                else:
                    port_key = 'influxdb'
                while True:
                    if ports[port_key] not in used_ports and ports[port_key] not in current_ports:
                        data_dict[k] = ports[port_key]
                        current_ports.append(ports[port_key])
                        ports[port_key] += 1
                        break
                    ports[port_key] += 1
        print(data_dict)
        serializer = DatabaseSerializer(data=data_dict)
        if serializer.is_valid():
            database = serializer.save()
            database.install()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'GET':
        dbs = Database.objects.all()
        data = {}
        for db in dbs:
            data[db.name] = db.get_status_display()
        return JsonResponse(data, status=status.HTTP_200_OK)
    return HttpResponse('Request method not supported', status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def start_database(request):
    if request.method == 'POST':
        try:
            shutil.rmtree(os.path.expanduser('~/.neo4j'))
        except FileNotFoundError:
            pass
        try:
            database = Database.objects.get(name=request.data.get('name'))
        except ObjectDoesNotExist:
            return HttpResponse('Could not find the specified database.', status=status.HTTP_404_NOT_FOUND)
        success = database.start()
        if success:
            return HttpResponse(status=status.HTTP_202_ACCEPTED)
        return HttpResponse(status=status.HTTP_423_LOCKED)


@api_view(['POST'])
def stop_database(request):
    if request.method == 'POST':
        try:
            database = Database.objects.get(name=request.data.get('name'))
        except ObjectDoesNotExist:
            return HttpResponse('Could not find the specified database.', status=status.HTTP_404_NOT_FOUND)
        try:
            success = database.stop()
            if success:
                return HttpResponse(status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            return HttpResponse(content=str(e), status=status.HTTP_423_LOCKED)


@api_view(['GET', 'PUT', 'DELETE'])
def database_api(request, name):
    try:
        database = Database.objects.get(name=name)
    except ObjectDoesNotExist:
        return HttpResponse(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'DELETE':
        database.delete()
        return HttpResponse(status=status.HTTP_202_ACCEPTED)
    elif request.method == 'GET':
        data = database.get_status_display()
        return JsonResponse({'data': data}, status=status.HTTP_200_OK)


@api_view(['GET'])
def database_ports_api(request, name):
    if request.method == 'GET':
        try:
            database = Database.objects.get(name=name)
        except ObjectDoesNotExist:
            return HttpResponse(status=status.HTTP_404_NOT_FOUND)
        data = database.ports
        return JsonResponse(data=data, status=status.HTTP_200_OK)


@api_view(['GET'])
def database_data_directory_api(request, name):
    if request.method == 'GET':
        try:
            database = Database.objects.get(name=name)
        except ObjectDoesNotExist:
            return HttpResponse(status=status.HTTP_404_NOT_FOUND)
        data = {'data':database.directory}
        return JsonResponse(data=data, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT', 'DELETE'])
def corpus_api(request, name=None):
    if name is None:
        if request.method == 'GET':
            corpora = Corpus.objects.all()
            data = {}
            for c in corpora:
                data[c.name] = c.get_status_display()
            return JsonResponse(data, status=status.HTTP_200_OK)
    else:
        try:
            corpus = Corpus.objects.get(name=name)
        except ObjectDoesNotExist:
            return HttpResponse('Could not find the specified corpus.', status=status.HTTP_404_NOT_FOUND)
        if request.method == 'DELETE':
            corpus.delete()
            return HttpResponse(status=status.HTTP_202_ACCEPTED)
        elif request.method == 'GET':
            data = corpus.get_status_display()
            return JsonResponse({'data': data}, status=status.HTTP_200_OK)


@api_view(['GET'])
def corpus_list_api(request, name):
    try:
        database = Database.objects.get(name=name)
    except ObjectDoesNotExist:
        return HttpResponse('Could not find the specified database.', status=status.HTTP_404_NOT_FOUND)
    corpora = Corpus.objects.filter(database=database)
    if request.method == 'GET':
        data = [c.name for c in corpora]
        return JsonResponse(data, status=status.HTTP_200_OK, safe=False)


@api_view(['GET'])
def get_source_choices_api(request):
    if request.method == 'GET':
        return JsonResponse({'data': os.listdir(settings.SOURCE_DATA_DIRECTORY)}, status=status.HTTP_200_OK)


@api_view(['POST'])
def import_corpus_api(request):
    if request.method == 'POST':
        try:
            corpus = Corpus.objects.get(name=request.data.get('name'))
        except ObjectDoesNotExist:
            try:
                database = Database.objects.get(name=request.data.get('database_name'))
            except ObjectDoesNotExist:
                return HttpResponse('Could not find the specified database.', status=status.HTTP_404_NOT_FOUND)

            if database.status != 'R':
                return HttpResponse('The specified database is not currently running.',
                                    status=status.HTTP_400_BAD_REQUEST)
            corpus = Corpus(name=request.data['name'], database=database,
                            source_directory=os.path.join(settings.SOURCE_DATA_DIRECTORY,
                                                          request.data['source_directory']),
                            input_format=request.data['format'])
            corpus.save()
        if corpus.status != 'NI':
            return HttpResponse('The corpus has already been imported.', status=status.HTTP_400_BAD_REQUEST)
        corpus.status = 'IR'
        # corpus.current_task_id = t.task_id
        corpus.save()
        blocking = request.data.get('blocking', False)
        if blocking:
            import_corpus_task(corpus.pk)
        else:
            t = import_corpus_task.delay(corpus.pk)
        return HttpResponse(status=status.HTTP_202_ACCEPTED)


@api_view(['GET'])
def get_corpus_status(request, name=None):
    if request.method == 'GET':
        try:
            corpus = Corpus.objects.get(name=name)
        except ObjectDoesNotExist:
            return HttpResponse('Could not find the specified corpus.', status=status.HTTP_404_NOT_FOUND)

        if corpus.current_task_id is None:
            return JsonResponse(data={'data': 'ready'}, status=status.HTTP_200_OK)
        else:
            res = AsyncResult(corpus.current_task_id)
            if res.state == cstates.SUCCESS:
                corpus.current_task_id = None
                if corpus.status == Corpus.IMPORT_RUNNING:
                    corpus.status = Corpus.IMPORTED
                corpus.save()
                return JsonResponse(data={'data': 'ready'}, status=status.HTTP_200_OK)
            elif res.state == cstates.FAILURE:
                corpus.current_task_id = None
                if corpus.status == Corpus.IMPORT_RUNNING:
                    corpus.status = Corpus.NOT_IMPORTED
                corpus.save()
                return JsonResponse(data={'data': 'error'}, status=status.HTTP_200_OK)
            return JsonResponse(data={'data': 'busy'}, status=status.HTTP_200_OK)


@api_view(['GET'])
def corpus_hierarchy_api(request, name=None):
    if request.method == 'GET':
        try:
            corpus = Corpus.objects.get(name=name)
        except ObjectDoesNotExist:
            return HttpResponse('Could not find the specified corpus.', status=status.HTTP_404_NOT_FOUND)
        with CorpusContext(corpus.config) as c:
            hierarchy = c.hierarchy
        return JsonResponse(data=hierarchy.to_json(), status=status.HTTP_200_OK)


@api_view(['POST'])
def corpus_query_api(request, name=None):
    if request.method == 'POST':
        data = request.data
        print(data)
        try:
            corpus = Corpus.objects.get(name=name)
        except ObjectDoesNotExist:
            return HttpResponse('Could not find the specified corpus.', status=status.HTTP_404_NOT_FOUND)
        if corpus.database.status != 'R':
            return HttpResponse("The corpus's database is not currently running.",
                                status=status.HTTP_400_BAD_REQUEST)
        if corpus.status == 'NI':
            return HttpResponse('The corpus has not been imported yet.', status=status.HTTP_400_BAD_REQUEST)
        if corpus.is_busy:
            return HttpResponse('The corpus is currently busy, please try once the current process is finished.',
                                status=status.HTTP_409_CONFLICT)
        corpus.status = corpus.QUERY_RUNNING
        corpus.save()
        blocking = data.get('blocking', False)
        if blocking:
            results = query_corpus_task(corpus.pk, data)
            results = list(results.to_json())
            print(results)
            return JsonResponse(data=results, status=status.HTTP_200_OK, safe=False)
        else:
            t = query_corpus_task.delay(corpus.pk, data)
            corpus.current_task_id = t.task_id
            return HttpResponse(status=status.HTTP_202_ACCEPTED)


@api_view(['POST'])
def corpus_enrichment_api(request, name=None):
    if request.method == 'POST':
        data = request.data
        print(data)
        try:
            corpus = Corpus.objects.get(name=name)
        except ObjectDoesNotExist:
            return HttpResponse('Could not find the specified corpus.', status=status.HTTP_404_NOT_FOUND)

        if corpus.database.status != 'R':
            return HttpResponse("The corpus's database is not currently running.",
                                status=status.HTTP_400_BAD_REQUEST)
        if corpus.status == 'NI':
            return HttpResponse('The corpus has not been imported yet.', status=status.HTTP_400_BAD_REQUEST)
        if corpus.is_busy:
            return HttpResponse('The corpus is currently busy, please try once the current process is finished.',
                                status=status.HTTP_409_CONFLICT)
        corpus.status = 'ER'
        corpus.save()
        blocking = data.get('blocking', False)
        if blocking:
            enrich_corpus_task(corpus.pk, data)
        else:
            t = enrich_corpus_task.delay(corpus.pk, data)
        return HttpResponse(status=status.HTTP_202_ACCEPTED)
