from rest_framework import serializers
from django.contrib.auth.models import Group, User
from . import models

from polyglotdb.exceptions import GraphQueryError

import logging
log = logging.getLogger(__name__)


class DatabaseSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    num_corpora = serializers.ReadOnlyField()

    class Meta:
        model = models.Database
        fields = ('id', 'name', 'status', 'num_corpora', 'neo4j_http_port', 'influxdb_admin_port')

    def get_status(self, obj):
        return obj.get_status_display()


class CorpusSerializer(serializers.ModelSerializer):
    database_running = serializers.SerializerMethodField()

    class Meta:
        model = models.Corpus
        fields = ('id', 'name', 'input_format', 'imported', 'busy', 'database_running', 'database')

    def get_database_running(self, obj):
        return obj.database.status == 'R' # database.is_running is too slow


class QueryResultsSerializer(object):
    def __init__(self, query):
        self.query = query

    @property
    def data(self):
        return list(self.query.all().to_json())

class HierarchySerializer(serializers.Serializer):
    annotation_types = serializers.SerializerMethodField()
    type_properties = serializers.SerializerMethodField()
    token_properties = serializers.SerializerMethodField()
    speaker_properties = serializers.SerializerMethodField()
    discourse_properties = serializers.SerializerMethodField()
    subset_types = serializers.SerializerMethodField()
    subset_tokens = serializers.SerializerMethodField()
    has_pitch_tracks = serializers.SerializerMethodField()
    has_formant_tracks = serializers.SerializerMethodField()
    has_intensity_tracks = serializers.SerializerMethodField()

    def get_annotation_types(self, obj):
        return obj.lowest_to_highest

    def get_type_properties(self, obj):
        return {k: sorted((name, t()) for name, t in v if name != 'id') for k, v in obj.type_properties.items()}

    def get_token_properties(self, obj):
        return {k: sorted((name, t()) for name, t in v if name != 'id') for k, v in obj.token_properties.items()}

    def get_speaker_properties(self, obj):
        return [(name, t()) for name, t  in obj.speaker_properties if 'file_path' not in name]

    def get_discourse_properties(self, obj):
        return [(name, t()) for name, t  in obj.discourse_properties if 'file_path' not in name]

    def get_subset_types(self, obj):
        return{k: sorted(v) for k, v in obj.subset_types.items()}

    def get_subset_tokens(self, obj):
        return {k: sorted(v) for k, v in obj.subset_tokens.items()}

    def get_subannotations(self, obj):
        return {k: sorted(v) for k, v in obj.subannotations.items()}

    def get_subannotation_properties(self, obj):
        return {k: sorted((name, t()) for name, t in v) for k, v in
                                            obj.subannotation_properties.items()}

    def get_has_pitch_tracks(self, obj):
        try:
            return 'pitch' in obj.acoustics
        except GraphQueryError:
            return False

    def get_has_formant_tracks(self, obj):
        try:
            return 'formants' in obj.acoustics
        except GraphQueryError:
            return False

    def get_has_intensity_tracks(self, obj):
        try:
            return 'intensity' in obj.acoustics
        except GraphQueryError:
            return False

class SpeakerSerializer(serializers.Serializer):
    pass


class DiscourseSerializer(serializers.Serializer):
    pass

class SubannotationSerializer(serializers.Serializer):
    pass


class PitchPointSerializer(serializers.Serializer):
    time = serializers.FloatField()
    F0 = serializers.FloatField()

class FormantPointSerializer(serializers.Serializer):
    time = serializers.FloatField()
    F1 = serializers.FloatField()
    F2 = serializers.FloatField()
    F3 = serializers.FloatField()

class AnnotationSerializer(serializers.Serializer):
    pass


class PositionalSerializer(serializers.Serializer):
    pass
# AUTH

class CorpusPermissionsSerializer(serializers.ModelSerializer):
    #corpus = CorpusSerializer()

    class Meta:
        model = models.CorpusPermissions
        fields = ('corpus', 'can_edit', 'can_listen', 'can_view_detail', 'can_view_annotations', 'can_annotate')


class UserWithFullGroupsSerializer(serializers.ModelSerializer):
    corpus_permissions = CorpusPermissionsSerializer(many=True)

    class Meta:
        model = User
        depth = 2
        fields = ('id', 'first_name', 'last_name', 'username', 'is_superuser',
                  'corpus_permissions')


class UnauthorizedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        depth = 2
        fields = ('id', 'first_name', 'last_name', 'username', 'is_superuser')

def serializer_factory(hierarchy, a_type, positions=None, exclude=None, acoustic_columns=None,
                       with_waveform=False, with_spectrogram=False, with_higher_annotations=False,
                       with_lower_annotations=False, top_level=False, detail=False, with_subannotations=False):
    parent = (object,)
    if acoustic_columns is None:
        acoustic_columns = []
    class_name = 'Serializer'
    if exclude is None:
        exclude = []
    attrs = {}
    if a_type == 'discourse':
        base = DiscourseSerializer
        for prop, t in hierarchy.discourse_properties:
            if 'file_path' in prop:
                continue
            if prop in exclude:
                continue
            if t == str:
                field = serializers.CharField()
            elif t == float:
                field = serializers.FloatField()
            elif t == int:
                field = serializers.IntegerField()
            elif t == bool:
                field = serializers.BooleanField()
            attrs[prop] = field
    elif a_type == 'speaker':
        base = SpeakerSerializer
        for prop, t in hierarchy.speaker_properties:
            if prop in exclude:
                continue
            if t == str:
                field = serializers.CharField()
            elif t == float:
                field = serializers.FloatField()
            elif t == int:
                field = serializers.IntegerField()
            elif t == bool:
                field = serializers.BooleanField()
            attrs[prop] = field
    else:
        a_attrs = {}
        for prop, t in hierarchy.type_properties[a_type]:
            if prop in exclude:
                continue
            if t == str:
                field = serializers.CharField()
            elif t == float:
                field = serializers.FloatField()
            elif t == int:
                field = serializers.IntegerField()
            elif t == bool:
                field = serializers.BooleanField()
            a_attrs[prop] = field
        for prop, t in hierarchy.token_properties[a_type]:
            if prop in exclude:
                continue
            if t == str:
                field = serializers.CharField()
            elif t == float:
                field = serializers.FloatField()
            elif t == int:
                field = serializers.IntegerField()
            elif t == bool:
                field = serializers.BooleanField()
            a_attrs[prop] = field
        for a_column in acoustic_columns:
            if a_column == 'pitch':
                a_attrs['pitch_track'] = PitchPointSerializer(many=True)
            elif a_column == 'formants':
                a_attrs['formant_track'] = FormantPointSerializer(many=True)
        if with_waveform:
            a_attrs['waveform'] = serializers.ListField()
        if with_spectrogram:
            a_attrs['spectrogram'] = serializers.DictField()
        if with_subannotations and a_type in hierarchy.subannotations:
            base = SubannotationSerializer
            for s in hierarchy.subannotations[a_type]:
                s_attrs = {}
                for prop, t in hierarchy.subannotation_properties[s]:
                    if t == str:
                        field = serializers.CharField()
                    elif t == float:
                        field = serializers.FloatField()
                    elif t == int:
                        field = serializers.IntegerField()
                    elif t == bool:
                        field = serializers.BooleanField()
                    s_attrs[prop] = field
                s_attrs['id'] = serializers.CharField()
                a_attrs[s] = type(base)(class_name, (base,), s_attrs)(many=True)
        base = AnnotationSerializer
        if top_level:
            if detail:
                attrs = a_attrs
            else:
                if positions is not None:
                    base = PositionalSerializer
                    mapping = {}
                    s = type(base)(class_name, (base,), a_attrs)
                    for p in positions[a_type]:
                        mapping[p] = s()
                    attrs[a_type] = type(base)(class_name, (base,), mapping)()
                else:
                    attrs[a_type] = type(base)(class_name, (base,), a_attrs)()
            attrs['speaker'] = serializer_factory(hierarchy, 'speaker')()
            attrs['discourse'] = serializer_factory(hierarchy, 'discourse', exclude=['duration', "vowel_file_path", "file_path", "consonant_file_path", "low_freq_file_path"])()

        else:
            if positions is not None:
                print(positions)
                base = PositionalSerializer
                attrs = {}
                s = type(base)(class_name, (base,), a_attrs)
                for p in positions[a_type]:
                    attrs[p] = s()
            else:
                attrs = a_attrs
        if with_higher_annotations:
            supertype = hierarchy[a_type]
            while supertype is not None:
                attrs[supertype] = serializer_factory(hierarchy, supertype, positions=positions, with_subannotations=with_subannotations)()
                supertype = hierarchy[supertype]
        if with_lower_annotations:
            subs = hierarchy.contains(a_type)

            for s in subs:
                attrs[s] = serializer_factory(hierarchy, s, with_subannotations=with_subannotations)(many=True)
    return type(base)(class_name, (base,), attrs)


class EnrichmentSerializer(serializers.ModelSerializer):
    enrichment_type = serializers.SerializerMethodField()
    runnable = serializers.SerializerMethodField()
    config = serializers.SerializerMethodField()
    class Meta:
        model = models.Enrichment
        fields = ('id', 'name', 'corpus', 'enrichment_type', 'running', 'last_run', 'completed', 'runnable', 'config')

    def get_enrichment_type(self, obj):
        return obj.config.get('enrichment_type', '')#['enrichment_type']

    def get_runnable(self, obj):
        return obj.runnable

    def get_config(self, obj):
        return obj.config


class QuerySerializer(serializers.ModelSerializer):
    annotation_type = serializers.SerializerMethodField()
    filters = serializers.SerializerMethodField()
    columns = serializers.SerializerMethodField()
    column_names = serializers.SerializerMethodField()
    acoustic_columns = serializers.SerializerMethodField()
    ordering = serializers.SerializerMethodField()
    positions = serializers.SerializerMethodField()

    class Meta:
        model = models.Query
        fields = ('id', 'name', 'user', 'corpus', 'annotation_type', 'result_count', 'running', 'filters',
                  'positions',
                  'columns', 'column_names', 'acoustic_columns', 'ordering')

    def get_annotation_type(self, obj):
        return obj.get_annotation_type_display()

    def get_positions(self, obj):
        return obj.config['positions']

    def get_filters(self, obj):
        return obj.config['filters']

    def get_columns(self, obj):
        return obj.config['columns']

    def get_column_names(self, obj):
        return obj.config.get('column_names', {x: {} for x in ['phone', 'syllable', 'word', 'utterance', 'discourse', 'speaker']})

    def get_acoustic_columns(self, obj):
        return obj.config.get('acoustic_columns', {})

    def get_ordering(self, obj):
        return obj.config.get('ordering', '')
