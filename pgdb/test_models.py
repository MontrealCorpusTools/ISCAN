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
        self.database = Database.objects.create(
        name='new_database', neo4j_http_port=7404, neo4j_https_port=7400, neo4j_bolt_port=7401, neo4j_admin_port=7402, influxdb_http_port=8404, influxdb_meta_port=8400, influxdb_udp_port=8406, influxdb_admin_port=8401)
        self.database.install()
        assert self.database.start()
        self.database.save()

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
        self.database = Database.objects.create(
        name='new_database', neo4j_http_port=7404, neo4j_https_port=7400, neo4j_bolt_port=7401, neo4j_admin_port=7402, influxdb_http_port=8404, influxdb_meta_port=8400, influxdb_udp_port=8406, influxdb_admin_port=8401);
        self.database.install()
        self.database.start()
        self.corpus = Corpus.objects.create(name="acoustic", database=self.database)
        assert not self.corpus.imported
        print("importing corpus")
        self.corpus.import_corpus()
        assert self.corpus.imported

    def tearDown(self):
        self.corpus.delete()
        self.database.delete()

    def test_corpus(self):
        assert self.corpus.imported 
        assert not self.corpus.busy
        assert not self.corpus.has_pauses
        assert not self.corpus.has_utterances
        assert not self.corpus.has_syllabics
        assert not self.corpus.has_syllables

