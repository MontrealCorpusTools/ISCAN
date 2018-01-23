import os

from django.conf import settings
from rest_framework import generics, permissions, viewsets, status, pagination
from rest_framework.response import Response
from rest_framework.decorators import detail_route

from neo4j import exceptions as neo4j_exceptions

from polyglotdb import CorpusContext

from . import models
from . import serializers
from .utils import get_used_ports
from .tasks import import_corpus_task, enrich_corpus_task, query_corpus_task


class DatabaseViewSet(viewsets.ModelViewSet):
    model = models.Database
    queryset = models.Database.objects.all()
    serializer_class = serializers.DatabaseSerializer

    def create(self, request, *args, **kwargs):
        used_ports = get_used_ports()
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
        serializer = serializers.DatabaseSerializer(data=data_dict)
        if serializer.is_valid():
            database = serializer.save()
            database.install()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @detail_route(methods=['post'])
    def start(self, request, pk=None):
        database = self.get_object()
        success = database.start()
        return Response(data=success)

    @detail_route(methods=['post'])
    def stop(self, request, pk=None):
        database = self.get_object()
        success = database.stop()
        return Response(data=success)

    @detail_route(methods=['get'])
    def ports(self, request, pk=None):
        database = self.get_object()
        data = database.ports
        return Response(data)

    @detail_route(methods=['get'])
    def data_directory(self, request, pk=None):
        database = self.get_object()
        data = database.directory
        return Response(data)

    @detail_route(methods=['get'])
    def corpora(self, request, pk=None):
        database = self.get_object()
        corpora = models.Corpus.objects.filter(database=database)
        serializer = serializers.CorpusSerializer(corpora, many=True)
        return Response(serializer.data)


class CorpusViewSet(viewsets.ModelViewSet):
    model = models.Corpus
    queryset = models.Corpus.objects.all()
    serializer_class = serializers.CorpusSerializer

    def create(self, request, *args, **kwargs):
        data = {k: v for k,v in request.data.items()}
        data['database'] = models.Database.objects.get(pk = int(data['database']))
        data['source_directory'] = os.path.join(settings.SOURCE_DATA_DIRECTORY, data['source_directory'])
        instance = models.Corpus.objects.create(name=data['name'], input_format=data['format'], source_directory=data['source_directory'], database=data['database'])
        return Response(self.serializer_class(instance).data)

    @detail_route(methods=['get'])
    def hierarchy(self, request, pk=None):
        corpus = self.get_object()
        with CorpusContext(corpus.config) as c:
            hierarchy = c.hierarchy

        return Response(hierarchy.to_json())

    @detail_route(methods=['post'])
    def import_corpus(self, request, pk=None):
        corpus = self.get_object()
        if corpus.database.status == 'S':
            return Response('Database is unavailable', status=status.HTTP_400_BAD_REQUEST)
        if corpus.status != 'NI':
            return Response('The corpus has already been imported.', status=status.HTTP_400_BAD_REQUEST)
        corpus.status = 'IR'
        corpus.save()
        blocking = request.data.get('blocking', False)
        if blocking:
            import_corpus_task(corpus.pk)
        else:
            t = import_corpus_task.delay(corpus.pk)
        return Response(status=status.HTTP_202_ACCEPTED)

    @detail_route(methods=['post'])
    def query(self, request, pk=None):
        corpus = self.get_object()
        data = request.data

        if corpus.database.status != 'R':
            return Response("The corpus's database is not currently running.",
                            status=status.HTTP_400_BAD_REQUEST)
        if corpus.status == 'NI':
            return Response('The corpus has not been imported yet.', status=status.HTTP_400_BAD_REQUEST)
        if corpus.is_busy:
            return Response('The corpus is currently busy, please try once the current process is finished.',
                            status=status.HTTP_409_CONFLICT)
        corpus.status = corpus.QUERY_RUNNING
        corpus.save()
        blocking = data.get('blocking', False)
        if blocking:
            results = query_corpus_task(corpus.pk, data)
            results = list(results.to_json())
            return Response(results, status=status.HTTP_200_OK)
        else:
            t = query_corpus_task.delay(corpus.pk, data)
            corpus.current_task_id = t.task_id
            return Response(status=status.HTTP_202_ACCEPTED)

    @detail_route(methods=['post'])
    def enrich(self, request, pk=None):
        corpus = self.get_object()
        data = request.data

        if corpus.database.status != 'R':
            return Response("The corpus's database is not currently running.",
                            status=status.HTTP_400_BAD_REQUEST)
        if corpus.status == 'NI':
            return Response('The corpus has not been imported yet.', status=status.HTTP_400_BAD_REQUEST)
        if corpus.is_busy:
            return Response('The corpus is currently busy, please try once the current process is finished.',
                            status=status.HTTP_409_CONFLICT)
        corpus.status = 'ER'
        corpus.save()
        blocking = data.get('blocking', False)
        if blocking:
            enrich_corpus_task(corpus.pk, data)
        else:
            t = enrich_corpus_task.delay(corpus.pk, data)
        return Response(status=status.HTTP_202_ACCEPTED)

    @detail_route(methods=['get'])
    def utterance_pitch_track(self, request, pk=None):
        utterance_id = request.query_params.get('utterance_id', None)
        if utterance_id is None:
            return Response(None)

        source = request.query_params.get('source', 'praat')
        min_pitch = int(request.query_params.get('min_pitch', 50))
        max_pitch = int(request.query_params.get('max_pitch', 500))
        corpus = self.get_object()
        with CorpusContext(corpus.config) as c:
            results = c.analyze_utterance_pitch(utterance_id, source=source, min_pitch=min_pitch, max_pitch=max_pitch)
        pitch_data = {}
        track = []
        for datapoint in results:
            v = datapoint['F0']
            k = datapoint['time']
            if v is None or v < 1:
                continue
            track.append({'x': k, 'y': v})
        pitch_data['pitch_track'] = track
        return Response(pitch_data['pitch_track'])


class SourceChoiceViewSet(viewsets.ViewSet):
    def list(self, request):
        choices = os.listdir(settings.SOURCE_DATA_DIRECTORY)
        return Response(choices)


class UtteranceViewSet(viewsets.ViewSet):

    def list(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        params = {**request.query_params}

        limit = int(params.pop('limit', [100])[0])
        offset = int(params.pop('offset', [0])[0])
        ordering = params.pop('ordering', [''])[0]
        search = params.pop('search', [''])[0]
        data = {}
        with CorpusContext(corpus.config) as c:
            q = c.query_graph(c.utterance)
            for k, v in params.items():
                k = k.split('.')
                att = c.utterance
                for f in k:
                    att = getattr(att, f)
                q = q.filter(att == v[0])
            data['count'] = q.count()
            if ordering:
                desc = False
                if ordering.startswith('-'):
                    desc = True
                    ordering = ordering[1:]
                ordering = ordering.split('.')
                att = c.utterance
                for o in ordering:
                    att = getattr(att, o)
                q = q.order_by(att, desc)
            else:
                q = q.order_by(c.utterance.id)
            q = q.limit(limit).offset(offset).preload(c.utterance.discourse, c.utterance.speaker)
            res = q.all()
            serializer = serializers.UtteranceSerializer(res, many=True)
            data['results'] = serializer.data
        data['next'] = None
        if offset + limit < data['count']:
            url = request.build_absolute_uri()
            url = pagination.replace_query_param(url,'limit', limit)
            data['next'] = pagination.replace_query_param(url, 'offset', offset+limit)
        data['previous'] = None
        if offset - limit >= 0:
            url = request.build_absolute_uri()
            url = pagination.replace_query_param(url,'limit', limit)
            data['previous'] = pagination.replace_query_param(url, 'offset', offset-limit)
        return Response(data)

    def retrieve(self, request, pk=None, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        with_pitch = request.query_params.get('with_pitch', False)
        with_waveform = request.query_params.get('with_waveform', False)
        with_spectrogram = request.query_params.get('with_spectrogram', False)
        try:
            with CorpusContext(corpus.config) as c:
                q = c.query_graph(c.utterance)
                q = q.filter(c.utterance.id == pk)
                track_column = c.utterance.pitch.track
                q = q.columns(c.utterance.id.column_name('utterance_id'),
                              c.utterance.word.label.column_name('label'),
                              c.utterance.discourse.name.column_name('discourse'),
                              c.utterance.speaker.name.column_name('speaker'),
                              c.utterance.discourse.context.column_name('context'),
                              c.utterance.discourse.item.column_name('item'),
                              c.utterance.end.column_name('end'),
                              c.utterance.begin.column_name('begin'),
                              c.utterance.pitch_last_edited.column_name('pitch_last_edited')
                              )
                if with_pitch:
                    q = q.columns(track_column)

                res = q.all()
                if res is None:
                    return Response(None)
                for x in res:

                    if x['item'] is None:
                        continue
                    if x['context'] is None:
                        continue
                    d = {k: v for k, v in zip(x.columns, x.values)}
                    d['pitch_track'] = [{'x': round(float(k), 2), 'y': v['F0']} for k, v in x.track.items()]
                    if with_waveform:
                        signal, sr = c.load_waveform(x['discourse'], 'vowel', begin=x['begin'], end=x['end'])
                        step = 1 / sr
                        d['waveform'] = [{'y': float(p), 'x': i * step + x['begin']} for i, p in enumerate(signal)]
                    if with_spectrogram:
                        orig, time_step, freq_step = c.generate_spectrogram(x['discourse'], 'consonant', begin=x['begin'],
                                                                            end=x['end'])
                        reshaped = []
                        for i in range(orig.shape[0]):
                            for j in range(orig.shape[1]):
                                reshaped.append({'time': j * time_step + x['begin'], 'frequency': i * freq_step,
                                                 'power': float(orig[i, j])})
                        d['spectrogram'] = {'values': reshaped,
                                            'time_step': time_step,
                                            'freq_step': freq_step,
                                            'num_time_bins': orig.shape[1],
                                            'num_freq_bins': orig.shape[0]}

                    return Response(d)
            return Response(None)
        except neo4j_exceptions.ServiceUnavailable:
            return Response(None, status=status.HTTP_423_LOCKED)
