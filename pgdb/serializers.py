from rest_framework import serializers
from .models import Database


class DatabaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Database
        fields = ('id', 'name', 'neo4j_http_port', 'neo4j_https_port', 'neo4j_bolt_port', 'neo4j_admin_port',
                  'influxdb_http_port', 'influxdb_meta_port', 'influxdb_udp_port', 'influxdb_admin_port')
