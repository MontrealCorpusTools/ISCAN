import os
import csv
import time
import json

from django.conf import settings
from django.http.response import FileResponse, HttpResponse
from django.db.models import Q
from rest_framework import generics, permissions, viewsets, status, pagination
from rest_framework.response import Response
from rest_framework.decorators import detail_route, list_route

from neo4j import exceptions as neo4j_exceptions

from polyglotdb import CorpusContext
from polyglotdb.query.base.func import Count

from . import models
from . import serializers
from .utils import get_used_ports
from .tasks import import_corpus_task, run_query_task, run_enrichment_task, reset_enrichment_task, delete_enrichment_task

import logging
log = logging.getLogger('polyglot_server')


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
            #FIXME TOO MUCH HARDCODING
            corpus_names = [x.name for x in corpora]
            requery = False
            for dataset in os.listdir(settings.SOURCE_DATA_DIRECTORY):
                if dataset not in corpus_names:
                    d, _ = models.Database.objects.get_or_create(name=dataset)
                    c = models.Corpus.objects.create(name=dataset, database=d)
                    if 'input_format' in c.configuration_data:
                        c.input_format = c.configuration_data['input_format'][0].upper()
                        c.save()
                    requery = True
            if requery:
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
        instance = models.Corpus.objects.create(name=data['name'], database=data['database'])
        return Response(self.serializer_class(instance).data)

    @detail_route(methods=['post'])
    def import_corpus(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not corpus.database.is_running:
            return Response("Database is not running, cannot import", 
                    status=status.HTTP_400_BAD_REQUEST)

        import_corpus_task.delay(corpus.pk)
        time.sleep(1)
        return Response()

    @detail_route(methods=['get'])
    def status(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        if not corpus.database.is_running:
            return Response("database not running")
        running_enrichments = models.Enrichment.objects.filter(corpus=corpus, running=True).all()
        if len(running_enrichments):
            return Response('enrichment running')
        running_queries = models.Query.objects.filter(corpus=corpus, running=True).all()
        if len(running_queries):
            return Response('query running')
        return Response('ready')

    @detail_route(methods=['get'])
    def autocomplete(self, request, pk=None):
        prefix = request.GET.get('prefix', None)
        category = request.GET.get('category', None)
        if category in ['speaker', 'discourse']:
            category = category.title()
        else:
            category += '_type'
        prop = request.GET.get('prop', 'label')
        if prefix is None:
            return Response("Please provide a prefix", 
                    status=status.HTTP_400_BAD_REQUEST)

        for x in ['\'', '\"']:
            #Escape characters
            prefix = prefix.replace(x, '\\{}'.format(x))
        if prop not in ["name", "label", "transcription"]:
            return Response("Provided property:{} is invalid".format(prop), 
                    status=status.HTTP_400_BAD_REQUEST)
        corpus = self.get_object()
        with CorpusContext(corpus.config) as c:
            statement = """MATCH (n:{category}:{corpus_name})
                         WHERE n.{prop} STARTS WITH {{prefix}}
                         RETURN DISTINCT n.{prop}
                         LIMIT 10""".format(corpus_name=c.cypher_safe_name, category=category, prop=prop)
            resp = c.execute_cypher(statement, prefix=prefix).value()
        return Response(resp)

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
    def words(self, request, pk=None):
        count = request.GET.get('count', None)
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        if count is None or not count.isdigit():
            return Response(
                'There must be a requested number of words',
                status=status.HTTP_400_BAD_REQUEST)
        with CorpusContext(corpus.config) as c:
            #FIXME: currently choosing top n words is done here, would be much faster to do in PolyglotDB directly
            q = c.query_graph(c.word).group_by(c.word.label.column_name('label')).order_by(Count(), descending=True)
            results = [dict(x) for x in q.aggregate(Count())[:int(count)]]
        return Response(json.dumps(results))

    @detail_route(methods=['get'])
    def default_subsets(self, request, pk=None):
        subset_class = request.GET.get('subset_class', 'syllabics')
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        if subset_class not in ['syllabics', 'sibilants', 'stressed_vowels']:
            return Response(
                'Invalid subset class',
                status=status.HTTP_400_BAD_REQUEST)

        if corpus.name.startswith("spade-"):
            corpus_name = corpus.name.split("spade-")[1]
        else:
            corpus_name = corpus.name
        if 'tutorial' in corpus_name:
            corpus_name = 'tutorial'

        if subset_class == 'syllabics':
            if corpus_name == 'SCOTS':
                subset = ["@", "@`", "e", "e`", "O`", "3`", "E", "E@", "E`", "I", "O", "O@`", "OI", "O`", "e", "e@",
                  "e@`", "e`", "{`", "}", "}:", "}@", "}@`", "}`", "o:", "o@", "o@`", "o`", "V", "VU", "VU`", "Vi",
                  "i", "i:", "i@", "i@`", "i`", "a", "a`", "ae", "l=", "m=", "n="]
            elif corpus_name == 'Buckeye':
                subset = ["aa", "ae", "ay", "aw", "ao", "oy", "ow", "eh", "ey", "er", "ah", "uw", "ih", "iy", "uh",
                    "aan", "aen", "ayn", "awn", "aon", "oyn", "own", "ehn", "eyn", "ern", "ahn", "uwn", "ihn", "iyn", "uhn",
                             "en", "em", "eng", "el"]
            elif corpus_name == 'SOTC':
                subset = ["I", "E", "{", "V", "Q", "U", "@", "i","#", "$", "u", "3", "1", "2","4", "5", "6", "7", "8",
                             "9", "c","q", "O", "~", "B","F","H","L", "P", "C"]
            elif corpus_name in ["ICE-Can", "Raleigh", "SantaBarbara", "tutorial", "acoustic"]:
                subset = ["ER0", "IH2", "EH1", "AE0", "UH1", "AY2", "AW2", "UW1", "OY2", "OY1", "AO0", "AH2", "ER1", "AW1",
                   "OW0", "IY1", "IY2", "UW0", "AA1", "EY0", "AE1", "AA0", "OW1", "AW0", "AO1", "AO2", "IH0", "ER2",
                   "UW2", "IY0", "AE2", "AH0", "AH1", "UH2", "EH2", "UH0", "EY1", "AY0", "AY1", "EH0", "EY2", "AA2",
                   "OW2", "IH1"]
            else:
                subset = []
        elif subset_class == "sibilants":
            if corpus_name in ['SOTC', 'SCOTS']:
                subset = ["s", "z", "S", "Z"]
            elif corpus_name == 'Buckeye':
                subset = ["s", "z", "sh", "zh"]
            elif corpus_name in ["ICE-Can", "Raleigh", "SantaBarbara", "tutorial", "acoustic"]:
                subset = ["S", "Z", "SH", "ZH"]
            else:
                subset = []
        elif subset_class == "stressed_vowels":
            if corpus_name in ["ICE-Can", "Raleigh", "SantaBarbara", "tutorial", "acoustic"]:
                subset = ["EH1", "UH1", "UW1", "OY1", "ER1", "AW1", "IY1", "AA1", "AE1", "OW1",  "AO1", "AH1", "EY1", "AY1", "IH1"]
            else:
                subset = []
        return Response(json.dumps(subset))

    @detail_route(methods=['get'])
    def phones(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        with CorpusContext(corpus.config) as c:
            phones = c.query_lexicon(c.phone).columns(c.phone.label).all()
            print(phones.to_json())

        return Response(phones.to_json())

    @detail_route(methods=['get'])
    def phone_set(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        with CorpusContext(corpus.config) as c:
            q = c.query_lexicon(c.lexicon_phone).columns(c.lexicon_phone.label.column_name('label'))
            print(q.cypher())
            phones = q.all()

            # Remove duplicates to get phone set
            phones = sorted(set(x['label'] for x in phones))
            print(phones)

        return Response(phones)

    @detail_route(methods=['get'])
    def word_set(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        with CorpusContext(corpus.config) as c:
            q = c.query_lexicon(c.lexicon_word).columns(c.lexicon_word.label.column_name('label'))
            print(q.cypher())
            words = q.all()

            # Remove duplicates to get phone set
            words = sorted(set(x['label'] for x in words))
            print(words)

        return Response(words)

    @detail_route(methods=['get'])
    def hierarchy(self, request, pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = self.get_object()
        if corpus.database.status != 'R':
            return Response('Database is not running', status=status.HTTP_400_BAD_REQUEST)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        try:
            with CorpusContext(corpus.config) as c:
                hierarchy = c.hierarchy
                data = serializers.HierarchySerializer(hierarchy).data
        except neo4j_exceptions.ServiceUnavailable:
            corpus.database.status = 'S'
            corpus.database.neo4j_pid = None
            corpus.database.influxdb_pid = None
            corpus.database.save()
            return Response('Database is not running', status=status.HTTP_400_BAD_REQUEST)
        return Response(data)

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
            time_stamp = c.update_utterance_pitch_track(id, track)
            print(time_stamp)
        return Response({'success': True, 'time_stamp': time_stamp})


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
            data.append({'name':'name', 'options': c.discourses})
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
            data.append({'name':'name', 'options': c.speakers})
            for p in props:
                data.append({'name': p, 'options': c.query_metadata(c.speaker).levels(getattr(c.speaker, p))})
        return Response(data)


class SubannotationViewSet(viewsets.ViewSet):
    def create(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        a_type = request.data.pop('annotation_type')
        a_id = request.data.pop('annotation_id')
        s_type = request.data.pop('subannotation_type')
        data = request.data['subannotation']
        with CorpusContext(corpus.config) as c:
            att = getattr(c, a_type)
            q = c.query_graph(att).filter(getattr(att, 'id') == a_id)
            res = q.all()[0]
            res.add_subannotation(s_type, **data)
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
        with CorpusContext(corpus.config) as c:
            statement = '''MATCH (s:{corpus_name}) WHERE s.id = {{s_id}} RETURN s'''.format(corpus_name=c.cypher_safe_name)
            res = c.execute_cypher(statement, s_id=s_id)
            for r in res:
                for x in r['s'].labels:
                    if x in c.hierarchy.subannotation_properties:
                        s_type = x
            for k, v in data.items():
                props.append(prop_template % (k, k))
                if c.hierarchy.has_subannotation_property(s_type, k):
                    for name, t in c.hierarchy.subannotation_properties[s_type]:
                        if name == k:
                            data[k] = t(v)
            set_props = ',\n'.join(props)
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
        return Response(serializers.EnrichmentSerializer(enrichments, many=True).data)

    def create(self, request, corpus_pk=None, *args, **kwargs):
        log.info("Creating an enrichment.")
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        print(request.data)
        if not request.data.get('name', ''):
            return Response(
                'A name for this enrichment must be specified.',
                status=status.HTTP_400_BAD_REQUEST)
        if request.data['enrichment_type'] in ['pitch', 'formants', 'sibilant_script']:
            q = models.Enrichment.objects.filter(corpus=corpus).all()
            for r in q:
                if r.config['enrichment_type'] == request.data['enrichment_type']:
                    return Response(
                        'There already exists a {} enrichment for this corpus.'.format(request.data['enrichment_type']),
                        status=status.HTTP_409_CONFLICT)
            if not request.data.get('source', ''):
                return Response(
                    'A program to use for this enrichment must be specified.',
                    status=status.HTTP_400_BAD_REQUEST)

        # Subset validation
        elif request.data['enrichment_type'] in ['subset']:
            #q = models.Enrichment.objects.filter(corpus=corpus).all()
            #for r in q:
            r = request.data
            if 'subset_label' not in r or not r['subset_label']:
                return Response(
                    str(r) + 'The subset must have a name.',
                    status=status.HTTP_400_BAD_REQUEST)
            if 'annotation_labels' not in r or not r['annotation_labels']:
                return Response(
                    str(r) + 'The subset cannot be empty.',
                    status=status.HTTP_400_BAD_REQUEST)

        #Stress pattern validation
        elif request.data['enrichment_type'] in ['patterned_stress']:
            #q = models.Enrichment.objects.filter(corpus=corpus).all()
            #for r in q:
            r = request.data
            if 'word_property' not in r or r['word_property'] is None:
                return Response(
                    'There must be a word property.',
                    status=status.HTTP_400_BAD_REQUEST)

        # Hierarchical property validation
        elif request.data['enrichment_type'] in ['hierarchical_property']:
            r = request.data
            if 'property_label' not in r or not r['property_label']:
                return Response(
                    str(r) + 'The hierarchical property must have a name.',
                    status=status.HTTP_400_BAD_REQUEST)
            if (r['higher_annotation'] == 'utterance' and r['lower_annotation'] not in ['word', 'syllable', 'phone']) or (r['higher_annotation'] == 'word' and r['lower_annotation'] not in ['syllable', 'phone']) or (r['higher_annotation'] == 'syllable' and r['lower_annotation'] != 'phone'):
                return Response(
                    str(r) + 'The lower annotation level must be lower than the higher annotation level.',
                    status=status.HTTP_400_BAD_REQUEST)

        # Formant validation
        elif request.data['enrichment_type'] == 'refined_formant_points':
            if request.data['duration_threshold'] is not None or request.data['duration_threshold'] != "":
                try:
                    float(request.data['duration_threshold'])
                except ValueError:
                    return Response(
                        'The duration threshold must be either blank or a float',
                        status=status.HTTP_400_BAD_REQUEST)
            try:
                int(request.data['number_of_iterations'])
            except ValueError:
                return Response(
                    'The duration threshold must be an integer',
                    status=status.HTTP_400_BAD_REQUEST)
        enrichment = models.Enrichment.objects.create(name=request.data['name'], corpus=corpus)
        enrichment.config = request.data
        return Response(serializers.EnrichmentSerializer(enrichment).data)

    @detail_route(methods=["post"])
    def create_file(self, request, pk=None, corpus_pk=None, *args, **kwargs):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        enrichment = models.Enrichment.objects.filter(pk=pk, corpus=corpus).get()
        if not request.data.get('text', ''):
            return Response(
                'A file must be included.',
                status=status.HTTP_400_BAD_REQUEST)
        if not request.data.get('file_name', ''):
            return Response(
                'The file must have a name.',
                status=status.HTTP_400_BAD_REQUEST)
        file_path = os.path.join(enrichment.directory, request.data["file_name"])
        with open(file_path, "w") as f:
            f.write(request.data["text"])
        enrichment.config = {**enrichment.config,
                             **{'path': str(file_path)}}
        return Response(True)

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
        if enrichment.runnable != 'runnable':
            return Response(
                    'The enrichment is not runnable',
                    status=status.HTTP_400_BAD_REQUEST)

        if not enrichment.corpus.database.is_running:
            return Response("Database is not running, cannot run enrichment", 
                    status=status.HTTP_400_BAD_REQUEST)
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
        if not enrichment.corpus.database.is_running:
            return Response("Database is not running, cannot reset enrichment", 
                    status=status.HTTP_400_BAD_REQUEST)
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

        enrichment = models.Enrichment.objects.filter(pk=pk, corpus=corpus).get()
        if enrichment is None:
            return Response(None, status=status.HTTP_400_BAD_REQUEST)
        if not enrichment.corpus.database.is_running:
            return Response("Database is not running, cannot update enrichment", 
                    status=status.HTTP_400_BAD_REQUEST)
        enrichment.name = request.data.get('name')
        enrichment.config = request.data
        enrichment.save()
        return Response(serializers.EnrichmentSerializer(enrichment).data)

    def destroy(self, request, pk=None, corpus_pk=None):
        if request.auth is None:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
        enrichment = models.Enrichment.objects.filter(pk=pk, corpus=corpus).get()
        if not enrichment.corpus.database.is_running:
            return Response("Database is not running, cannot delete enrichment", 
                    status=status.HTTP_400_BAD_REQUEST)
        delete_enrichment_task.delay(enrichment.pk)
        time.sleep(1)
        return Response(True)


class QueryViewSet(viewsets.ModelViewSet):
    model = models.Query
    serializer_class = serializers.QuerySerializer

    def get_queryset(self):
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
        if not corpus.database.is_running:
            return Response("Database is not running, cannot create query", 
                    status=status.HTTP_400_BAD_REQUEST)
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
        if not corpus.database.is_running:
            return Response("Database is not running, cannot update query", 
                    status=status.HTTP_400_BAD_REQUEST)
        print(request.data)
        query = models.Query.objects.filter(pk=pk, corpus=corpus).get()
        if query is None:
            return Response(None, status=status.HTTP_400_BAD_REQUEST)
        refresh = request.data.pop('refresh', False)
        query.name = request.data.get('name')
        do_run = refresh or query.config['filters'] != request.data['filters'] or \
                 query.config['positions'] != request.data['positions']
        c = query.config
        c.update(request.data)
        query.config = c
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
            queries = models.Query.objects.filter(user=request.user, corpus=corpus,annotation_type='U').filter(~Q(name='Bestiary query')).all()
        else:
            queries = models.Query.objects.filter(annotation_type='U', corpus=corpus).filter(~Q(name='Bestiary query')).all()
        return Response(serializers.QuerySerializer(queries, many=True).data)

    @list_route(methods=['GET'])
    def word(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
            queries = models.Query.objects.filter(user=request.user,annotation_type='W', corpus=corpus).all()
        else:
            queries = models.Query.objects.filter(annotation_type='W', corpus=corpus).all()
        return Response(serializers.QuerySerializer(queries, many=True).data)

    @list_route(methods=['GET'])
    def syllable(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
            queries = models.Query.objects.filter(user=request.user,annotation_type='S', corpus=corpus).all()
        else:
            queries = models.Query.objects.filter(annotation_type='S', corpus=corpus).all()
        return Response(serializers.QuerySerializer(queries, many=True).data)

    @list_route(methods=['GET'])
    def phone(self, request, corpus_pk=None):
        corpus = models.Corpus.objects.get(pk=corpus_pk)
        if not request.user.is_superuser:
            permissions = corpus.user_permissions.filter(user=request.user).all()
            if not len(permissions):
                return Response(status=status.HTTP_401_UNAUTHORIZED)
            queries = models.Query.objects.filter(user=request.user,annotation_type='P', corpus=corpus).all()
        else:
            queries = models.Query.objects.filter(annotation_type='P', corpus=corpus).all()
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
        if not query.running and query.result_count is None:
            run_query_task.delay(query.pk)
            time.sleep(1)

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
        resp = {'data': results, 'count': query.result_count}
        return Response(resp)

    @detail_route(methods=['put'])
    def ordering(self, request, pk=None, corpus_pk=None, index=None):
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
        config = query.config
        config['ordering'] = request.data.get('ordering')
        query.resort(config['ordering'])
        query.config = config

        return Response(serializers.QuerySerializer(query).data)

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

        with_waveform = request.query_params.get('with_waveform', False)
        with_spectrogram = request.query_params.get('with_spectrogram', False)
        with_subannotations = request.query_params.get('with_subannotations', True)
        result = query.get_results(ordering, limit, offset)[0]
        utterance_id = result['utterance']['current']['id']
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
                        if t in c.hierarchy.subannotations:
                            for s in c.hierarchy.subannotations[t]:
                                if t == 'utterance':
                                    q = q.preload(getattr(c.utterance, s))
                                else:
                                    q = q.preload(getattr(getattr(c.utterance, t), s))
                acoustic_columns = c.hierarchy.acoustics
                acoustic_column_names = []
                for a_column in acoustic_columns:
                    acoustic = getattr(c.utterance, a_column)
                    acoustic.relative = True
                    acoustic = acoustic.track
                    q = q.preload_acoustics(acoustic)
                    acoustic_column_names.append(a_column)

                utterances = q.all()
                if utterances is None:
                    data['utterance'] = None
                else:

                    serializer = serializers.serializer_factory(c.hierarchy, 'utterance',
                                                                acoustic_columns=acoustic_columns,
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
        if not corpus.database.is_running:
            return Response("Database is not running, cannot export", 
                    status=status.HTTP_400_BAD_REQUEST)
        query = models.Query.objects.filter(pk=pk, corpus=corpus).get()
        if query is None:
            return Response(None, status=status.HTTP_400_BAD_REQUEST)
        if query.running:
            return Response(None, status=status.HTTP_423_LOCKED)
        print(corpus)
        do_run = query.config['filters'] != request.data['filters'] or \
                 query.config['positions'] != request.data['positions']
        query.config = request.data
        response['Content-Disposition'] = 'attachment; filename="{}_query_export.csv"'.format(
            query.get_annotation_type_display())
        print(query.config)
        begin = time.time()
        with CorpusContext(corpus.config) as c:
            q = query.generate_query_for_export(c)
            print('GENERATED QUERY')
            writer = csv.writer(response)
            q.to_csv(writer)
        print('DONE WRITING', time.time() - begin)
        return response
