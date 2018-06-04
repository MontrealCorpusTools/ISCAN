import os
import csv
import time
import json

from django.conf import settings
from django.http.response import FileResponse, HttpResponse
from rest_framework import generics, permissions, viewsets, status, pagination
from rest_framework.response import Response
from rest_framework.decorators import detail_route, list_route

from neo4j import exceptions as neo4j_exceptions

from polyglotdb import CorpusContext

from . import models
from . import serializers
from .utils import get_used_ports
from .tasks import import_corpus_task, enrich_corpus_task, run_query_task, run_enrichment_task, reset_enrichment_task


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
        data = {k: v for k, v in request.data.items()}
        data['database'] = models.Database.objects.get(pk=int(data['database']))
        data['source_directory'] = os.path.join(settings.SOURCE_DATA_DIRECTORY, data['source_directory'])
        instance = models.Corpus.objects.create(name=data['name'], input_format=data['format'],
                                                source_directory=data['source_directory'], database=data['database'])
        return Response(self.serializer_class(instance).data)

    @detail_route(methods=['get'])
    def status(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        running_enrichments = models.Enrichment.objects.filter(corpus=corpus, running=True).all()
        if len(running_enrichments):
            return Response('enrichment running')
        running_queries = models.Query.objects.filter(corpus=corpus, running=True).all()
        if len(running_queries):
            return Response('query running')
        return Response('ready')

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
        print(hierarchy.to_json())
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
        pitch_data['pitch_track'] = serializers.PitchPointSerializer([x for x in results if x.F0 != None],
                                                                     many=True).data
        return Response(pitch_data['pitch_track'])

    @detail_route(methods=['post'])
    def save_utterance_pitch_track(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        id = request.data['id']
        track = request.data['track']
        with CorpusContext(corpus.config) as c:
            c.update_utterance_pitch_track(id, track)
        return Response({'success': True})


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
                data.append({'name': p, 'options': c.query_metadata(c.discourse).levels(getattr(c.discourse, p))})
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
            data = []
            for p in props:
                data.append({'name': p, 'options': c.query_metadata(c.speaker).levels(getattr(c.speaker, p))})
        return Response(data)


class BestiaryViewSet(viewsets.ViewSet):
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
            serializer_class = serializers.serializer_factory(c.hierarchy, 'utterance', top_level=True, with_pitch=True)
            serializer = serializer_class(res, many=True)
            data['results'] = serializer.data
        data['next'] = None
        if offset + limit < data['count']:
            url = request.build_absolute_uri()
            url = pagination.replace_query_param(url, 'limit', limit)
            data['next'] = pagination.replace_query_param(url, 'offset', offset + limit)
        data['previous'] = None
        if offset - limit >= 0:
            url = request.build_absolute_uri()
            url = pagination.replace_query_param(url, 'limit', limit)
            data['previous'] = pagination.replace_query_param(url, 'offset', offset - limit)
        return Response(data)


class SubannotationViewSet(viewsets.ViewSet):
    def create(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        print(request.data)
        a_type = request.data.pop('annotation_type')
        a_id = request.data.pop('annotation_id')
        s_type = request.data.pop('subannotation_type')
        data = request.data['subannotation']
        with CorpusContext(corpus.config) as c:
            att = getattr(c, a_type)
            q = c.query_graph(att).filter(getattr(att, 'id') == a_id)
            res = q.all()[0]
            res.add_subannotation(s_type, **data)
            print(getattr(res, s_type))
            data = serializers.serializer_factory(c.hierarchy, a_type, top_level=True, with_subannotations=True)(
                res).data
            data = data[a_type][s_type][-1]
        return Response(data)

    def update(self, request, pk=None, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        data = request.data
        s_id = data.pop('id')
        props = []
        prop_template = 's.%s = {%s}'
        for k, v in data.items():
            props.append(prop_template % (k, k))
        set_props = ',\n'.join(props)
        with CorpusContext(corpus.config) as c:
            statement = '''MATCH (s:{corpus_name}) WHERE s.id = {{s_id}}
            SET {set_props}'''.format(corpus_name=c.cypher_safe_name, set_props=set_props)
            c.execute_cypher(statement, s_id=s_id, **data)
        return Response(None)

    def destroy(self, request, pk=None, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        with CorpusContext(corpus.config) as c:
            statement = '''MATCH (s:{corpus_name}) WHERE s.id = {{s_id}}
            DETACH DELETE s'''.format(corpus_name=c.cypher_safe_name)
            c.execute_cypher(statement, s_id=pk)
        return Response(None)


class AnnotationViewSet(viewsets.ViewSet):

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
        a_type = params.pop('annotation_type')[0]
        with_pitch = params.pop('with_pitch', [False])[0]
        data = {}
        with CorpusContext(corpus.config) as c:
            a = getattr(c, a_type)
            q = c.query_graph(a)
            for k, v in params.items():
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
            data['count'] = q.count()
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
            q = q.limit(limit).offset(offset).preload(getattr(a, 'discourse'), getattr(a, 'speaker'))
            if with_pitch:
                pitch = getattr(a, 'pitch')
                pitch.relative_time = True
                pitch.relative = True
                q = q.preload_acoustics(pitch)
            for t in c.hierarchy.annotation_types:
                if t in c.hierarchy.subannotations:
                    for s in c.hierarchy.subannotations[t]:
                        if t == a_type:
                            q = q.preload(getattr(a, s))
                        else:
                            q = q.preload(getattr(getattr(a, t), s))
            print(q.cypher())
            res = q.all()
            serializer_class = serializers.serializer_factory(c.hierarchy, a_type, top_level=True,
                                                              with_pitch=with_pitch, detail=False,
                                                              with_higher_annotations=True,
                                                              with_subannotations=True)
            serializer = serializer_class(res, many=True)
            data['results'] = serializer.data
        data['next'] = None
        if offset + limit < data['count']:
            url = request.build_absolute_uri()
            url = pagination.replace_query_param(url, 'limit', limit)
            data['next'] = pagination.replace_query_param(url, 'offset', offset + limit)
        data['previous'] = None
        if offset - limit >= 0:
            url = request.build_absolute_uri()
            url = pagination.replace_query_param(url, 'limit', limit)
            data['previous'] = pagination.replace_query_param(url, 'offset', offset - limit)
        return Response(data)

    def retrieve(self, request, pk=None, corpus_pk=None):
        import time
        begin_time = time.time()
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions) or not permissions[0].can_view_detail:
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        with_pitch = request.query_params.get('with_pitch', False)
        with_waveform = request.query_params.get('with_waveform', False)
        with_spectrogram = request.query_params.get('with_spectrogram', False)
        with_subannotations = request.query_params.get('with_subannotations', False)
        try:
            with CorpusContext(corpus.config) as c:
                q = c.query_graph(c.utterance)
                q = q.filter(c.utterance.id == pk)
                q = q.preload(c.utterance.word)
                q = q.preload(c.utterance.syllable)
                q = q.preload(c.utterance.phone)
                q = q.preload(c.utterance.speaker)
                q = q.preload(c.utterance.discourse)
                if with_subannotations:
                    for t in c.hierarchy.annotation_types:
                        for s in c.hierarchy.subannotations[t]:
                            if t == 'utterance':
                                q = q.preload(getattr(c.utterance, s))
                            else:
                                q = q.preload(getattr(getattr(c.utterance, t), s))

                if with_pitch:
                    q = q.preload_acoustics(c.utterance.pitch)
                print(q.cypher(), q.cypher_params())
                utterances = q.all()
                if utterances is None:
                    return Response(None)
                serializer = serializers.serializer_factory(c.hierarchy, 'utterance', with_pitch=with_pitch,
                                                            with_waveform=with_waveform,
                                                            with_spectrogram=with_spectrogram,
                                                            top_level=True,
                                                            with_lower_annotations=True, detail=True,
                                                            with_subannotations=True)
                utt = utterances[0]
                print('query took', time.time() - begin_time)

                begin_time = time.time()
                data = serializer(utt).data
                print('serializing took', time.time() - begin_time)
                return Response(data)
            return Response(None)
        except neo4j_exceptions.ServiceUnavailable:
            return Response(None, status=status.HTTP_423_LOCKED)

    @detail_route(methods=['get'])
    def sound_file(self, request, pk=None, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        # if not request.user.is_superuser: # FIXME Needs actual authentication
        #    permissions = corpus.user_permissions.filter(user=request.user).all()
        #    if not len(permissions) or permissions[0].can_listen:
        #       return Response(status=status.HTTP_401_UNAUTHORIZED)
        with CorpusContext(corpus.config) as c:
            fname = c.utterance_sound_file(pk, 'consonant')

        response = FileResponse(open(fname, "rb"), content_type='audio/wav')
        # response['Content-Type'] = 'audio/wav'
        # response['Content-Length'] = os.path.getsize(fname)
        return response


class EnrichmentViewSet(viewsets.ModelViewSet):
    model = models.Enrichment
    serializer_class = serializers.EnrichmentSerializer

    def get_queryset(self):
        return models.Enrichment.objects.filter(corpus__pk=self.kwargs['corpus_pk'])

    def list(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        enrichments = models.Enrichment.objects.filter(corpus=corpus).all()

        # FIXME SO MUCH HARDCODING
        names = [x.name for x in enrichments]
        requery = False
        if 'Encode syllabics' not in names:
            if corpus.name == 'SCOTS':
                syllabics = ["@", "@`", "e", "e`", "O`", "3`", "E", "E@", "E`", "I", "O", "O@`", "OI", "O`", "e", "e@",
                  "e@`", "e`", "{`", "}", "}:", "}@", "}@`", "}`", "o:", "o@", "o@`", "o`", "V", "VU", "VU`", "Vi",
                  "i", "i:", "i@", "i@`", "i`", "a", "a`", "ae", "l=", "m=", "n="]
            elif corpus.name == 'Buckeye':
                syllabics = ["aa", "ae", "ay", "aw", "ao", "oy", "ow", "eh", "ey", "er", "ah", "uw", "ih", "iy", "uh",
                    "aan", "aen", "ayn", "awn", "aon", "oyn", "own", "ehn", "eyn", "ern", "ahn", "uwn", "ihn", "iyn", "uhn",
                             "en", "em", "eng", "el"]
            elif corpus.name == 'SOTC':
                syllabics = ["I", "E", "{", "V", "Q", "U", "@", "i","#", "$", "u", "3", "1", "2","4", "5", "6", "7", "8",
                             "9", "c","q", "O", "~", "B","F","H","L", "P", "C"]
            else:
                syllabics = ["ER0", "IH2", "EH1", "AE0", "UH1", "AY2", "AW2", "UW1", "OY2", "OY1", "AO0", "AH2", "ER1", "AW1",
                   "OW0", "IY1", "IY2", "UW0", "AA1", "EY0", "AE1", "AA0", "OW1", "AW0", "AO1", "AO2", "IH0", "ER2",
                   "UW2", "IY0", "AE2", "AH0", "AH1", "UH2", "EH2", "UH0", "EY1", "AY0", "AY1", "EH0", "EY2", "AA2",
                   "OW2", "IH1"]
            syllabic_enrichment = models.Enrichment.objects.create(name='Encode syllabics', corpus=corpus)
            syllabic_enrichment.config = {'enrichment_type': 'subset',
                                          'annotation_type': 'phone',
                                          'annotation_labels': syllabics,
                                          'subset_label': 'syllabic'}
            requery = True
        if 'Encode sibilants' not in names:
            if corpus.name == 'SCOTS':
                sibilants = ["s", "z", "S", "Z"]
            elif corpus.name == 'Buckeye':
                sibilants = ["s", "z", "sh", "zh"]
            else:
                sibilants = ["S", "Z", "SH", "ZH"]
            sibilant_enrichment = models.Enrichment.objects.create(name='Encode sibilants', corpus=corpus)
            sibilant_enrichment.config = {'enrichment_type': 'subset',
                                          'annotation_type': 'phone',
                                          'annotation_labels': sibilants,
                                          'subset_label': 'sibilant'}
            requery = True
        if 'Encode syllables' not in names:
            syllable_enrichment = models.Enrichment.objects.create(name='Encode syllables', corpus=corpus)
            syllable_enrichment.config = {'enrichment_type': 'syllables'}
            requery = True

        if 'Encode pauses' not in names:
            if corpus.name == 'Buckeye':
                pause_label = '^[<{].*$'
            else:
                pause_label = '^<SIL>$'
            pause_enrichment = models.Enrichment.objects.create(name='Encode pauses', corpus=corpus)
            pause_enrichment.config = {'enrichment_type': 'pauses',
                                       'pause_label': pause_label}
            requery = True
        if 'Encode utterances' not in names:
            utterance_enrichment = models.Enrichment.objects.create(name='Encode utterances', corpus=corpus)
            utterance_enrichment.config = {'enrichment_type': 'utterances',
                                           'pause_length': 0.15}
            requery = True
        if 'Encode speech rate' not in names:
            speechrate_enrichment = models.Enrichment.objects.create(name='Encode speech rate', corpus=corpus)
            speechrate_enrichment.config = {'enrichment_type': 'hierarchical_property',
                                            'property_type': 'rate',
                                            'higher_annotation': 'utterance',
                                            'lower_annotation': 'syllable',
                                            'property_label': 'speech_rate'}
            requery = True
        if requery:
            enrichments = models.Enrichment.objects.filter(corpus=corpus).all()
        return Response(serializers.EnrichmentSerializer(enrichments, many=True).data)

    def create(self, request, corpus_pk=None, *args, **kwargs):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        print(request.data)
        enrichment = models.Enrichment.objects.create(name=request.data['name'], corpus=corpus)
        enrichment.config = request.data
        return Response(serializers.EnrichmentSerializer(enrichment).data)

    @detail_route(methods=['post'])
    def run(self, request, pk=None, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        enrichment = models.Enrichment.objects.filter(pk=pk, corpus=corpus).get()
        run_enrichment_task.delay(enrichment.pk)
        time.sleep(1)
        return Response(True)

    @detail_route(methods=['post'])
    def reset(self, request, pk=None, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        enrichment = models.Enrichment.objects.filter(pk=pk, corpus=corpus).get()
        reset_enrichment_task.delay(enrichment.pk)
        time.sleep(1)
        return Response(True)

    def update(self, request, pk=None, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        print(request.data)
        enrichment = models.Enrichment.objects.filter(pk=pk, corpus=corpus).get()
        if enrichment is None:
            return Response(None, status=status.HTTP_400_BAD_REQUEST)
        enrichment.name = request.data.get('name')
        do_run = enrichment.config != request.data
        enrichment.config = request.data
        if do_run:
            run_enrichment_task.delay(enrichment.pk)
            time.sleep(1)
        return Response(serializers.EnrichmentSerializer(enrichment).data)


class QueryViewSet(viewsets.ModelViewSet):
    model = models.Query
    serializer_class = serializers.QuerySerializer

    def get_queryset(self):
        print('hellooooooo')
        return models.Query.objects.filter(corpus__pk=self.kwargs['corpus_pk'])

    def list(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
            queries = models.Query.objects.filter(user=request.user, corpus=corpus).all()
        else:
            queries = models.Query.objects.filter(corpus=corpus).all()
        return Response(serializers.QuerySerializer(queries, many=True).data)

    def create(self, request, corpus_pk=None, *args, **kwargs):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        print(request.data)
        query = models.Query.objects.create(name=request.data['name'], user=request.user,
                                            annotation_type=request.data['annotation_type'][0].upper(), corpus=corpus)
        query.config = request.data
        run_query_task.delay(query.pk)
        time.sleep(1)
        return Response(serializers.QuerySerializer(query).data)

    def update(self, request, pk=None, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        print(request.data)
        query = models.Query.objects.filter(pk=pk, corpus=corpus).get()
        if query is None:
            return Response(None, status=status.HTTP_400_BAD_REQUEST)
        query.name = request.data.get('name')
        do_run = query.config['filters'] != request.data['filters'] or query.config['subsets'] != request.data[
            'subsets']
        query.config = request.data
        if do_run:
            run_query_task.delay(query.pk)
            time.sleep(1)
        return Response(serializers.QuerySerializer(query).data)

    @list_route(methods=['GET'])
    def utterance(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
            queries = models.Query.objects.filter(user=request.user).filter(annotation_type='U').all()
        else:
            queries = models.Query.objects.filter(annotation_type='U').all()
        return Response(serializers.QuerySerializer(queries, many=True).data)

    @list_route(methods=['GET'])
    def word(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
            queries = models.Query.objects.filter(user=request.user).filter(annotation_type='W').all()
        else:
            queries = models.Query.objects.filter(annotation_type='W').all()
        return Response(serializers.QuerySerializer(queries, many=True).data)

    @list_route(methods=['GET'])
    def syllable(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
            queries = models.Query.objects.filter(user=request.user).filter(annotation_type='S').all()
        else:
            queries = models.Query.objects.filter(annotation_type='S').all()
        return Response(serializers.QuerySerializer(queries, many=True).data)

    @list_route(methods=['GET'])
    def phone(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
            queries = models.Query.objects.filter(user=request.user).filter(annotation_type='P').all()
        else:
            queries = models.Query.objects.filter(annotation_type='P').all()
        return Response(serializers.QuerySerializer(queries, many=True).data)

    def retrieve(self, request, pk=None, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions) or not permissions[0].can_view_detail:
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        query = models.Query.objects.filter(pk=pk, corpus=corpus).get()
        if query is None:
            return Response(None, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializers.QuerySerializer(query).data)

    @detail_route(methods=['get'])
    def results(self, request, pk=None, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions) or not permissions[0].can_view_detail:
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        query = models.Query.objects.filter(pk=pk, corpus=corpus).get()
        if query is None:
            return Response(None, status=status.HTTP_400_BAD_REQUEST)
        if query.running:
            return Response(None)
        ordering = request.query_params.get('ordering', '')
        offset = int(request.query_params.get('offset', 0))
        limit = int(request.query_params.get('limit', 100))
        results = query.get_results(ordering, limit, offset)
        return Response(results)

    @detail_route(methods=['get'])
    def result(self, request, pk=None, corpus_pk=None, index=None):
        print(request.query_params)
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions) or not permissions[0].can_view_detail:
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        query = models.Query.objects.filter(pk=pk, corpus=corpus).get()
        if query is None:
            return Response(None, status=status.HTTP_400_BAD_REQUEST)
        if query.running:
            return Response(None)
        ordering = request.query_params.get('ordering', '')
        index = int(request.query_params.get('index', '0'))
        limit = 1
        offset = index
        with_pitch = request.query_params.get('with_pitch', False)
        with_waveform = request.query_params.get('with_waveform', False)
        with_spectrogram = request.query_params.get('with_spectrogram', False)
        with_subannotations = request.query_params.get('with_subannotations', False)
        result = query.get_results(ordering, limit, offset)[0]
        utterance_id = result['utterance']['id']
        print(result)
        print(utterance_id)
        data = {'result': result}
        try:
            with CorpusContext(corpus.config) as c:
                q = c.query_graph(c.utterance)
                q = q.filter(c.utterance.id == utterance_id)
                q = q.preload(c.utterance.word)
                q = q.preload(c.utterance.syllable)
                q = q.preload(c.utterance.phone)
                q = q.preload(c.utterance.speaker)
                q = q.preload(c.utterance.discourse)
                if with_subannotations:
                    for t in c.hierarchy.annotation_types:
                        for s in c.hierarchy.subannotations[t]:
                            if t == 'utterance':
                                q = q.preload(getattr(c.utterance, s))
                            else:
                                q = q.preload(getattr(getattr(c.utterance, t), s))

                if with_pitch:
                    q = q.preload_acoustics(c.utterance.pitch)

                utterances = q.all()
                print(len(utterances))
                if utterances is None:
                    data['utterance'] = None
                else:
                    serializer = serializers.serializer_factory(c.hierarchy, 'utterance', with_pitch=with_pitch,
                                                                with_waveform=with_waveform,
                                                                with_spectrogram=with_spectrogram,
                                                                top_level=True,
                                                                with_lower_annotations=True, detail=True,
                                                                with_subannotations=True)
                    utt = utterances[0]
                    data['utterance'] = serializer(utt).data

        except neo4j_exceptions.ServiceUnavailable:
            return Response(None, status=status.HTTP_423_LOCKED)
        return Response(data)

    @detail_route(methods=['post'])
    def export(self, request, pk=None, corpus_pk=None):
        response = HttpResponse(content_type='text/csv')
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions) or not permissions[0].can_view_detail:
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        query = models.Query.objects.filter(pk=pk, corpus=corpus).get()
        if query is None:
            return Response(None, status=status.HTTP_400_BAD_REQUEST)
        if query.running:
            return Response(None, status=status.HTTP_423_LOCKED)
        print(corpus)
        do_run = query.config['filters'] != request.data['filters'] or query.config['subsets'] != request.data[
            'subsets']
        if do_run:
            return Response(None, status=status.HTTP_405_METHOD_NOT_ALLOWED)
        query.config = request.data
        columns = query.config['columns']
        response['Content-Disposition'] = 'attachment; filename="{}_query_export.csv"'.format(
            query.get_annotation_type_display())
        results = query.get_results(ordering='', offset=0, limit=None)

        writer = csv.writer(response)
        header = []
        for f_a_type, a_columns in columns.items():
            for field, val in a_columns.items():
                if not val:
                    continue
                header.append('{}_{}'.format(f_a_type, field))
        writer.writerow(header)
        print(len(results))
        for r in results:
            line = []
            for f_a_type, a_columns in columns.items():
                for field, val in a_columns.items():
                    if not val:
                        continue
                    line.append(r[f_a_type][field])
            writer.writerow(line)

        return response
