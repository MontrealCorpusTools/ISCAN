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


class CreateDatabaseTest(APILiveServerTestCase):
    def setUp(self):
        from rest_framework.authtoken.models import Token

        from django.contrib.auth.models import Group, User
        self.user = User.objects.create_superuser(username='testuser', password='12345', email="fake@email.su")
        self.csrf_client = APIClient(enforce_csrf_checks=True)
        self.key = 'abcd1234'
        self.token = Token.objects.create(key=self.key, user=self.user)
        self.csrf_client = APIClient()
        self.csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def tearDown(self):
        self.user.delete()
        for d in Database.objects.all():
            d.delete()

    def testDatabaseCreate(self):
        response = self.csrf_client.post(reverse('iscan:databases-list'),
                                         {'name': 'new_database'},
                                         HTTP_AUTHORIZATION='Token ' + self.token.key,
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_201_CREATED
        d = Database.objects.get(name='new_database')
        assert d.status == 'S'


class StartStopDatabaseTest(APILiveServerTestCase):
    def setUp(self):
        from rest_framework.authtoken.models import Token

        from django.contrib.auth.models import Group, User
        self.user = User.objects.create_superuser(username='testuser', password='12345', email="fake@email.su")
        self.csrf_client = APIClient(enforce_csrf_checks=True)
        self.key = 'abcd1234'
        self.token = Token.objects.create(key=self.key, user=self.user)
        self.csrf_client = APIClient()
        self.csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.database = Database.objects.create(
        name='test_database', neo4j_http_port=7404, neo4j_https_port=7400, neo4j_bolt_port=7401, neo4j_admin_port=7402, influxdb_http_port=8404, influxdb_meta_port=8400, influxdb_udp_port=8406, influxdb_admin_port=8401)
        self.database.install()

    def tearDown(self):
        self.user.delete()
        self.database.delete()

    def testDatabaseStartStop(self):
        response = self.csrf_client.post(reverse('iscan:databases-start', args=[self.database.id]),
                                         HTTP_AUTHORIZATION='Token ' + self.token.key,
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_200_OK
        d = Database.objects.get(name='test_database')
        assert d.status == 'R'

        response = self.csrf_client.post(reverse('iscan:databases-stop', args=[self.database.id]),
                                         HTTP_AUTHORIZATION='Token ' + self.token.key,
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_200_OK
        d = Database.objects.get(name='test_database')
        assert d.status == 'S'


class DeleteDatabaseTest(APILiveServerTestCase):
    def setUp(self):
        from rest_framework.authtoken.models import Token

        from django.contrib.auth.models import Group, User
        self.user = User.objects.create_superuser(username='testuser', password='12345', email="fake@email.su")
        self.csrf_client = APIClient(enforce_csrf_checks=True)
        self.key = 'abcd1234'
        self.token = Token.objects.create(key=self.key, user=self.user)
        self.csrf_client = APIClient()
        self.csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.database = Database.objects.create(
        name='test_database', neo4j_http_port=7404, neo4j_https_port=7400, neo4j_bolt_port=7401, neo4j_admin_port=7402, influxdb_http_port=8404, influxdb_meta_port=8400, influxdb_udp_port=8406, influxdb_admin_port=8401)
        self.database.install()

    def tearDown(self):
        self.user.delete()

    def testDatabaseDelete(self):
        response = self.csrf_client.delete(reverse('iscan:databases-detail', args=[self.database.id]),
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        c = Database.objects.filter(name='test_database').count()
        assert c == 0


class RefreshDatabasesTest(APILiveServerTestCase):
    def setUp(self):
        from rest_framework.authtoken.models import Token

        from django.contrib.auth.models import Group, User
        self.user = User.objects.create_superuser(username='testuser', password='12345', email="fake@email.su")
        self.csrf_client = APIClient(enforce_csrf_checks=True)
        self.key = 'abcd1234'
        self.token = Token.objects.create(key=self.key, user=self.user)
        self.csrf_client = APIClient()
        self.csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

    def tearDown(self):
        for d in Database.objects.all():
            d.delete()

    def testRefreshDatabases(self):
        response = self.csrf_client.post(reverse('iscan:databases-refresh-databases'),
                                         format='json')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        assert response.data[0]['name'] == 'acoustic'
        databases = Database.objects.all()
        assert len(databases) == 2
        assert databases[0].name == 'acoustic'

        # Make sure running it again has no changes
        response = self.csrf_client.post(reverse('iscan:databases-refresh-databases'),
                                         format='json')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        assert response.data[0]['name'] == 'acoustic'
        databases = Database.objects.all()
        assert len(databases) == 2
        assert databases[0].name == 'acoustic'