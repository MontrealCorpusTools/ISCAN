from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from iscan.models import Database
from iscan.api import DatabaseViewSet

class DatabaseAPI(APITestCase):
    def setUp(self):
        self.database = Database.objects.create(
        name='new_database', neo4j_http_port=7404, neo4j_https_port=7400, neo4j_bolt_port=7401, neo4j_admin_port=7402, influxdb_http_port=8404, influxdb_meta_port=8400, influxdb_udp_port=8406, influxdb_admin_port=8401)
        self.database.install()
        self.client.post(reverse('iscan:databases-start'),
                {'name': 'test_database'},
                format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(Database.objects.count(), 1)
        self.assertEqual(Database.objects.get().name, 'test_database')


    def tearDown(self):
        self.database.delete()

    def test_sdfdf(self):
        pass
