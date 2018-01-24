from rest_framework import serializers
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
    name = serializers.CharField()


class DiscourseSerializer(serializers.Serializer):
    name = serializers.CharField()
    item = serializers.CharField()
    context = serializers.CharField()

class PitchPointSerializer(serializers.Serializer):
    time = serializers.FloatField()
    F0 = serializers.FloatField()


class UtteranceSerializer(serializers.Serializer):
    id = serializers.CharField()
    begin = serializers.FloatField()
    end = serializers.FloatField()
    discourse = DiscourseSerializer()
    speaker = SpeakerSerializer()
    pitch_track = PitchPointSerializer(many=True)
    pitch_last_edited = serializers.CharField()
    # discourse =serializers.CharField()