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
    class Meta:
        model = models.Corpus
        fields = '__all__'


class QueryResultsSerializer(object):
    def __init__(self, query):
        self.query = query

    @property
    def data(self):
        return list(self.query.all().to_json())
