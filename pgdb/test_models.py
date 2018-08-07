from django.test import TestCase
from django.conf import settings
from pgdb.models import Database, Corpus
from pgdb import serializers
from pgdb.utils import get_used_ports
import shutil
import time
from rest_framework.test import APIClient
from rest_framework import status

class DatabaseTest(TestCase):
    def setUp(self):
        self.assertEqual(settings.SOURCE_DATA_DIRECTORY, "test_data/source")
        self.assertEqual(settings.POLYGLOT_DATA_DIRECTORY, "test_data/data")
        self.database = Database.objects.create(
        name='new_database', neo4j_http_port=1234, influxdb_http_port=8404)
        self.database.install()
        self.assertTrue(self.database.start())
        self.database.save()

    def tearDown(self):
        self.database.delete()

    def test_database_params(self):
        assert self.database.name =="new_database"
        assert self.database.neo4j_http_port == 1234

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
                name='new_database', neo4j_http_port=1234, influxdb_http_port=8404)
        self.database.install()
        self.database.start()
        self.database.save()
        self.corpus = Corpus.objects.create(name="acoustic", database=self.database)
        assert not self.corpus.imported
        self.corpus.import_corpus()
        assert self.corpus.imported

    def tearDown(self):
        self.corpus.delete()
        self.database.delete()

    def test_corpus(self):
        assert self.corpus.imported 
        assert not self.corpus.busy

