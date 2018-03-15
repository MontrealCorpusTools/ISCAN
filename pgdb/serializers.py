from rest_framework import serializers
from django.contrib.auth.models import Group, User
from . import models


class DatabaseSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    num_corpora = serializers.ReadOnlyField()

    class Meta:
        model = models.Database
        fields = ('id', 'name', 'status', 'num_corpora', 'neo4j_http_port', 'influxdb_admin_port')

    def get_status(self, obj):
        return obj.get_status_display()


class CorpusSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = models.Corpus
        fields = '__all__'

    def get_status(self, obj):
        return obj.get_status_display()


class QueryResultsSerializer(object):
    def __init__(self, query):
        self.query = query

    @property
    def data(self):
        return list(self.query.all().to_json())


class SpeakerSerializer(serializers.Serializer):
    pass


class DiscourseSerializer(serializers.Serializer):
    pass

class SubannotationSerializer(serializers.Serializer):
    pass


class PitchPointSerializer(serializers.Serializer):
    time = serializers.FloatField()
    F0 = serializers.FloatField()


class AnnotationSerializer(serializers.Serializer):
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

def serializer_factory(hierarchy, a_type, exclude=None, with_pitch=False, with_waveform=False, with_spectrogram=False, with_higher_annotations=False,with_lower_annotations=False, top_level=False, detail=False, with_subannotations=False):
    parent = (object,)
    class_name = 'Serializer'
    if exclude is None:
        exclude = []
    attrs = {}
    if a_type == 'discourse':
        base = DiscourseSerializer
        for prop, t in hierarchy.discourse_properties:
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
        if with_pitch:
            a_attrs['pitch_track'] = PitchPointSerializer(many=True)
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
                attrs[a_type] = type(base)(class_name, (base,), a_attrs)()
            attrs['speaker'] = serializer_factory(hierarchy, 'speaker')()
            attrs['discourse'] = serializer_factory(hierarchy, 'discourse', exclude=['duration', "vowel_file_path", "file_path", "consonant_file_path", "low_freq_file_path"])()

        else:
            attrs = a_attrs
        if with_higher_annotations:
            supertype = hierarchy[a_type]
            while supertype is not None:
                attrs[supertype] =serializer_factory(hierarchy, supertype, with_subannotations=with_subannotations)()
                supertype = hierarchy[supertype]
        if with_lower_annotations:
            subs = hierarchy.contains(a_type)

            for s in subs:
                attrs[s] = serializer_factory(hierarchy, s, with_subannotations=with_subannotations)(many=True)
    return type(base)(class_name, (base,), attrs)