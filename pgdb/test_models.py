from django.test import TestCase
from django.conf import settings
from pgdb.models import Database, Corpus
from pgdb import serializers
from pgdb.utils import get_used_ports
import time
from rest_framework.test import APIClient
from rest_framework import status

class DatabaseTest(TestCase):
    def setUp(self):
        used_ports = get_used_ports()
        current_ports = []
        data_dict = {'name': 'new_database',
                     'neo4j_http_port': 7404,
                     'neo4j_https_port': None,
                     'neo4j_bolt_port': None,
                     'neo4j_admin_port': None,   
                     'influxdb_http_port': 8404,
                     'influxdb_meta_port': None,
                     'influxdb_udp_port': 8406,
                     'influxdb_admin_port': None}
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
        print(data_dict)
        assert serializer.is_valid()
        self.database = serializer.save()
        self.database.install()
        #self.database = Database.objects.create
        self.database.start()
        time.sleep(1)

    def tearDown(self):
        self.database.delete()

    def test_database_params(self):
        assert self.database.name =="new_database"
        assert self.database.neo4j_http_port == 7404

    def test_database_is_running(self):
        assert self.database.is_running
        assert self.database.status == "R"

    def test_stop_start_database(self):
        self.database.stop()
        assert self.database.status == "S"
        self.database.start()
        assert self.database.status == "R"

    
class CorpusTest(TestCase):
    def setUp(self):
        used_ports = get_used_ports()
        current_ports = []
        data_dict = {'name': 'new_database',
                     'neo4j_http_port': 7404,
                     'neo4j_https_port': None,
                     'neo4j_bolt_port': None,
                     'neo4j_admin_port': None,   
                     'influxdb_http_port': 8404,
                     'influxdb_meta_port': None,
                     'influxdb_udp_port': 8406,
                     'influxdb_admin_port': None}
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
        assert serializer.is_valid()
        self.database = serializer.save()
        self.database.install()
        self.database.start()
        self.corpus = Corpus.objects.create(name="acoustic", database=self.database)
        print(self.corpus.name)

    def tearDown(self):
        self.corpus.delete()
        self.database.delete()

    def test_corpus(self):
        pass
