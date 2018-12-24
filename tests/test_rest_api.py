from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APILiveServerTestCase
from iscan.models import Database
from iscan.api import DatabaseViewSet
from rest_framework.test import APIClient, APIRequestFactory
from django.test import TestCase, override_settings
from django.contrib.auth.models import Group, User
import pytest

factory = APIRequestFactory()


class AuthTest(APILiveServerTestCase):
    """Basic authentication"""

    def setUp(self):
        self.csrf_client = APIClient(enforce_csrf_checks=True)
        self.username = 'john'
        self.email = 'lennon@thebeatles.com'
        self.password = 'password'
        self.user = User.objects.create_user(
            self.username, self.email, self.password
        )

    def test_auth(self):
        response = self.csrf_client.post('/api/rest-auth/login/',
                                         {'username': self.username, 'password': self.password})
        assert response.status_code == status.HTTP_200_OK
        assert 'key' in response.data


class DatabaseAPI(APILiveServerTestCase):
    def setUp(self):
        from rest_framework.authtoken.models import Token

        from django.contrib.auth.models import Group, User
        self.user = User.objects.create_superuser(username='testuser', password='12345', email="fake@email.su")
        self.csrf_client = APIClient(enforce_csrf_checks=True)
        self.key = 'abcd1234'
        self.token = Token.objects.create(key=self.key, user=self.user)
        self.csrf_client = APIClient()
        self.csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.database_id = None

    def tearDown(self):
        pass
        # self.user.delete()

    def test_a_database_create(self):
        response = self.csrf_client.post(reverse('iscan:databases-list'),
                                         {'name': 'new_database'},
                                         HTTP_AUTHORIZATION='Token ' + self.token.key,
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_200_OK
        d = Database.objects.get(name='new_database')
        self.database_id = d.id
        assert d.status == 'S'

    def test_b_database_start_stop(self):
        database = Database.objects.create(
        name='test_database', neo4j_http_port=7404, neo4j_https_port=7400, neo4j_bolt_port=7401, neo4j_admin_port=7402, influxdb_http_port=8404, influxdb_meta_port=8400, influxdb_udp_port=8406, influxdb_admin_port=8401)
        database.install()
        response = self.csrf_client.post(reverse('iscan:databases-start', args=[database.id]),
                                         HTTP_AUTHORIZATION='Token ' + self.token.key,
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_200_OK
        d = Database.objects.get(name='test_database')
        assert d.status == 'R'

        response = self.csrf_client.post(reverse('iscan:databases-stop', args=[database.id]),
                                         HTTP_AUTHORIZATION='Token ' + self.token.key,
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_200_OK
        d = Database.objects.get(name='test_database')
        assert d.status == 'S'
        d.delete()

    def test_d_database_delete(self):
        database = Database.objects.create(
        name='test_database', neo4j_http_port=7404, neo4j_https_port=7400, neo4j_bolt_port=7401, neo4j_admin_port=7402, influxdb_http_port=8404, influxdb_meta_port=8400, influxdb_udp_port=8406, influxdb_admin_port=8401)
        database.install()
        response = self.csrf_client.delete(reverse('iscan:databases-detail', args=[database.id]),
                                         HTTP_AUTHORIZATION='Token ' + self.token.key,
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        c = Database.objects.filter(name='test_database').count()
        assert c == 0
