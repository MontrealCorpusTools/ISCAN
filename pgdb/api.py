import os

from django.conf import settings
from django.http.response import FileResponse
from rest_framework import generics, permissions, viewsets, status, pagination
from rest_framework.response import Response
from rest_framework.decorators import detail_route, list_route

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
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_superuser:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
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
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_superuser:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        database = self.get_object()
        success = database.start()
        return Response(data=success)

    @detail_route(methods=['post'])
    def stop(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_superuser:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        database = self.get_object()
        success = database.stop()
        return Response(data=success)

    @detail_route(methods=['get'])
    def ports(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_superuser:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        database = self.get_object()
        data = database.ports
        return Response(data)

    @detail_route(methods=['get'])
    def data_directory(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_superuser:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        database = self.get_object()
        data = database.directory
        return Response(data)

    @detail_route(methods=['get'])
    def corpora(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_superuser:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        database = self.get_object()
        corpora = models.Corpus.objects.filter(database=database)
        serializer = serializers.CorpusSerializer(corpora, many=True)
        return Response(serializer.data)


class CorpusViewSet(viewsets.ModelViewSet):
    model = models.Corpus
    queryset = models.Corpus.objects.all()
    serializer_class = serializers.CorpusSerializer

    def list(self, request, *args, **kwargs):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if request.user.is_superuser:
            corpora = models.Corpus.objects.all()
        else:
            corpora = models.Corpus.objects.filter(user_permissions__user=request.user).all()
        return Response(self.serializer_class(corpora, many=True).data)

    def create(self, request, *args, **kwargs):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_superuser:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        data = {k: v for k,v in request.data.items()}
        data['database'] = models.Database.objects.get(pk = int(data['database']))
        data['source_directory'] = os.path.join(settings.SOURCE_DATA_DIRECTORY, data['source_directory'])
        instance = models.Corpus.objects.create(name=data['name'], input_format=data['format'], source_directory=data['source_directory'], database=data['database'])
        return Response(self.serializer_class(instance).data)

    @detail_route(methods=['get'])
    def speakers(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        with CorpusContext(corpus.config) as c:
            speakers = c.speakers

        return Response(speakers)

    @detail_route(methods=['get'])
    def hierarchy(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        with CorpusContext(corpus.config) as c:
            hierarchy = c.hierarchy

        return Response(hierarchy.to_json())

    @detail_route(methods=['post'])
    def import_corpus(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_superuser:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
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
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
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
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
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
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        utterance_id = request.query_params.get('utterance_id', None)
        if utterance_id is None:
            return Response(None)
        source = request.query_params.get('source', 'praat')
        min_pitch = int(request.query_params.get('min_pitch', 50))
        max_pitch = int(request.query_params.get('max_pitch', 500))
        with CorpusContext(corpus.config) as c:
            results = c.analyze_utterance_pitch(utterance_id, source=source, min_pitch=min_pitch, max_pitch=max_pitch)
        pitch_data = {}
        pitch_data['pitch_track'] = serializers.PitchPointSerializer([x for x in results if x.F0 != None], many=True).data
        return Response(pitch_data['pitch_track'])


class SourceChoiceViewSet(viewsets.ViewSet):
    def list(self, request):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        choices = os.listdir(settings.SOURCE_DATA_DIRECTORY)
        return Response(choices)


class DiscourseViewSet(viewsets.ViewSet):
    def list(self, request, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        with CorpusContext(corpus.config) as c:
            discourses = c.discourses

        return Response(discourses)

    @list_route(methods=['get'])
    def properties(self, request, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        with CorpusContext(corpus.config) as c:
            props = c.query_metadata(c.discourse).grouping_factors()
            data = []
            for p in props:
                data.append({'name': p, 'options': c.query_metadata(c.discourse).levels(getattr(c.discourse,p))})
        return Response(data)


class SpeakerViewSet(viewsets.ViewSet):
    def list(self, request, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        with CorpusContext(corpus.config) as c:
            speakers = c.speakers

        return Response(speakers)

    @list_route(methods=['get'])
    def properties(self, request, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        with CorpusContext(corpus.config) as c:
            props = c.query_metadata(c.speaker).grouping_factors()
            print(c.query_metadata(c.speaker).factors())
            data = []
            for p in props:
                data.append({'name': p, 'options': c.query_metadata(c.speaker).levels(getattr(c.speaker,p))})
        return Response(data)


class UtteranceViewSet(viewsets.ViewSet):

    def list(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        params = {**request.query_params}

        limit = int(params.pop('limit', [100])[0])
        offset = int(params.pop('offset', [0])[0])
        ordering = params.pop('ordering', [''])[0]
        search = params.pop('search', [''])[0]
        with_pitch = params.pop('with_pitch', [False])[0]
        data = {}
        with CorpusContext(corpus.config) as c:
            q = c.query_graph(c.utterance)
            for k, v in params.items():
                if v[0] == 'null':
                    v = None
                else:
                    v = v[0]
                k = k.split('__')
                att = c.utterance
                for f in k:
                    att = getattr(att, f)
                q = q.filter(att == v)
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
            if with_pitch:
                pitch = c.utterance.pitch
                pitch.relative_time = True
                pitch.relative = True
                q = q.preload_acoustics(pitch)
            res = q.all()
            serializer_class = serializers.serializer_factory(c.hierarchy, 'utterance')
            serializer = serializer_class(res, many=True)
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
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions) or permissions[0].can_view_detail:
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        with_pitch = request.query_params.get('with_pitch', False)
        with_waveform = request.query_params.get('with_waveform', False)
        with_spectrogram = request.query_params.get('with_spectrogram', False)
        try:
            with CorpusContext(corpus.config) as c:
                q = c.query_graph(c.utterance)
                q = q.filter(c.utterance.id == pk)
                q = q.preload(c.utterance.word)
                q = q.preload(c.utterance.syllable)
                q = q.preload(c.utterance.phone)
                q = q.preload(c.utterance.speaker)
                q = q.preload(c.utterance.discourse)

                if with_pitch:
                    q = q.preload_acoustics(c.utterance.pitch)

                utterances = q.all()
                if utterances is None:
                    return Response(None)
                serializer = serializers.serializer_factory(c.hierarchy, 'utterance', with_pitch=with_pitch, with_waveform=with_waveform, with_spectrogram=with_spectrogram)

                return Response(serializer(utterances[0]).data)
            return Response(None)
        except neo4j_exceptions.ServiceUnavailable:
            return Response(None, status=status.HTTP_423_LOCKED)

    @detail_route(methods=['get'])
    def next(self, request, pk=None, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions) or permissions[0].can_view_detail:
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        with CorpusContext(corpus.config) as c:
            utt = c.query_graph(c.utterance).filter(c.utterance.id == pk).preload(c.utterance.discourse).all()[0]
            q = c.query_graph(c.utterance).filter(c.utterance.begin >= utt.end).limit(1).all()
            if len(q):
                return Response(q[0].id)
            for i, d in enumerate(sorted(c.discourses)):
                if d == utt.discourse.name and i < len(c.discourses) - 1:
                    d_name = c.discourses[i + 1]
                    break
            else:
                return Response(None)
            utt = c.query_graph(c.utterance).filter(c.utterance.discourse.name == d_name).order_by(c.utterance.begin).limit(1).all()[0]
            return Response(utt.id)

    @detail_route(methods=['get'])
    def previous(self, request, pk=None, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions) or permissions[0].can_view_detail:
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        with CorpusContext(corpus.config) as c:
            utt = c.query_graph(c.utterance).filter(c.utterance.id == pk).preload(c.utterance.discourse).all()[0]
            q = c.query_graph(c.utterance).filter(c.utterance.end <= utt.begin).limit(1).all()
            if len(q):
                return Response({'id': q[0].id})
            for i, d in enumerate(sorted(c.discourses)):
                if d == utt.discourse.name and i > 0:
                    d_name = c.discourses[i - 1]
                    break
            else:
                return Response({'id': None})
            utt = c.query_graph(c.utterance).filter(c.utterance.discourse.name == d_name).order_by(c.utterance.begin).limit(
                1).all()[0]
            return Response({'id': utt.id})

    @detail_route(methods=['get'])
    def sound_file(self, request, pk=None, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        #if not request.user.is_superuser: # FIXME Needs actual authentication
        #    permissions = corpus.user_permissions.filter(user=request.user).all()
        #    if not len(permissions) or permissions[0].can_listen:
         #       return Response(status=status.HTTP_401_UNAUTHORIZED)
        with CorpusContext(corpus.config) as c:
            fname = c.utterance_sound_file(pk, 'consonant')

        response = FileResponse(open(fname, "rb"), content_type='audio/wav')
        # response['Content-Type'] = 'audio/wav'
        # response['Content-Length'] = os.path.getsize(fname)
        return response

class WordViewSet(viewsets.ViewSet):
    def list(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        params = {**request.query_params}

        limit = int(params.pop('limit', [100])[0])
        offset = int(params.pop('offset', [0])[0])
        ordering = params.pop('ordering', [''])[0]
        data = {}
        with CorpusContext(corpus.config) as c:
            q = c.query_graph(c.word)
            for k, v in params.items():
                if v[0] == '':
                    continue
                if v[0] == 'null':
                    v = None
                else:
                    v = v[0]
                k = k.split('__')
                att = c.word
                for f in k:
                    att = getattr(att, f)
                q = q.filter(att == v)
            data['count'] = q.count()
            if ordering:
                desc = False
                if ordering.startswith('-'):
                    desc = True
                    ordering = ordering[1:]
                ordering = ordering.split('.')
                att = c.word
                for o in ordering:
                    att = getattr(att, o)
                q = q.order_by(att, desc)
            else:
                q = q.order_by(c.word.label)
            q = q.limit(limit).offset(offset).preload(c.word.utterance, c.word.discourse, c.word.speaker)
            res = q.all()
            serializer_class = serializers.serializer_factory(c.hierarchy, 'word')
            serializer = serializer_class(res, many=True)
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