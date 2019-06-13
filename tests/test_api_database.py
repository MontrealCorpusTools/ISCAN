from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APILiveServerTestCase
from iscan.models import Database, Profile, Corpus, CorpusPermissions
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

        self.guest_user = User.objects.create(username='guest', password='12345')
        self.guest_user.profile.user_type = Profile.GUEST
        self.guest_user.save()
        self.guest_token = Token.objects.create(key='guest_key', user=self.guest_user)
        self.guest_csrf_client = APIClient()
        self.guest_csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.guest_token.key)

    def tearDown(self):
        self.user.delete()
        self.guest_user.delete()
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

    def testGuestDatabaseCreate(self):
        response = self.guest_csrf_client.post(reverse('iscan:databases-list'),
                                         {'name': 'new_guest_database'},
                                         HTTP_AUTHORIZATION='Token ' + self.token.key,
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert Database.objects.filter(name='new_guest_database').count() == 0


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

        self.guest_user = User.objects.create(username='guest', password='12345')
        self.guest_user.profile.user_type = Profile.GUEST
        self.guest_user.save()
        self.guest_token = Token.objects.create(key='guest_key', user=self.guest_user)
        self.guest_csrf_client = APIClient()
        self.guest_csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.guest_token.key)

        self.allowed_user = User.objects.create(username='allowed', password='12345')
        self.allowed_user.profile.user_type = Profile.GUEST
        self.allowed_user.save()
        self.allowed_token = Token.objects.create(key='allowed_key', user=self.allowed_user)
        self.allowed_csrf_client = APIClient()
        self.allowed_csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.allowed_token.key)

        self.corpus = Corpus.objects.create(name='test_corpus', database=self.database)
        perm = CorpusPermissions.objects.create(user=self.allowed_user, corpus=self.corpus, can_access_database=True)

    def tearDown(self):
        self.user.delete()
        self.guest_user.delete()
        self.allowed_user.delete()
        self.database.delete()

    def testDatabaseStartStop(self):
        response = self.csrf_client.post(reverse('iscan:databases-start', args=[self.database.id]),
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_200_OK
        d = Database.objects.get(name='test_database')
        assert d.status == 'R'

        response = self.csrf_client.post(reverse('iscan:databases-stop', args=[self.database.id]),
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_200_OK
        d = Database.objects.get(name='test_database')
        assert d.status == 'S'

    def testGuestDatabaseStartStop(self):
        response = self.guest_csrf_client.post(reverse('iscan:databases-start', args=[self.database.id]),
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        d = Database.objects.get(name='test_database')
        assert d.status == 'S'

        response = self.guest_csrf_client.post(reverse('iscan:databases-stop', args=[self.database.id]),
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        d = Database.objects.get(name='test_database')
        assert d.status == 'S'

    def testAllowedDatabaseStartStop(self):
        response = self.allowed_csrf_client.post(reverse('iscan:databases-start', args=[self.database.id]),
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_200_OK
        d = Database.objects.get(name='test_database')
        assert d.status == 'R'

        response = self.allowed_csrf_client.post(reverse('iscan:databases-stop', args=[self.database.id]),
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

        self.guest_user = User.objects.create(username='guest', password='12345')
        self.guest_user.profile.user_type = Profile.GUEST
        self.guest_user.save()
        self.guest_token = Token.objects.create(key='guest_key', user=self.guest_user)
        self.guest_csrf_client = APIClient()
        self.guest_csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.guest_token.key)

        self.allowed_user = User.objects.create(username='allowed', password='12345')
        self.allowed_user.profile.user_type = Profile.GUEST
        self.allowed_user.save()
        self.allowed_token = Token.objects.create(key='allowed_key', user=self.allowed_user)
        self.allowed_csrf_client = APIClient()
        self.allowed_csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.allowed_token.key)

    def tearDown(self):
        self.user.delete()
        self.guest_user.delete()
        self.allowed_user.delete()

    def testDatabaseDelete(self):
        database = Database.objects.create(
        name='test_database', neo4j_http_port=7404, neo4j_https_port=7400, neo4j_bolt_port=7401, neo4j_admin_port=7402, influxdb_http_port=8404, influxdb_meta_port=8400, influxdb_udp_port=8406, influxdb_admin_port=8401)
        database.install()
        response = self.csrf_client.delete(reverse('iscan:databases-detail', args=[database.id]),
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        c = Database.objects.filter(name='test_database').count()
        assert c == 0

    def testGuestDatabaseDelete(self):
        database = Database.objects.create(
        name='test_database', neo4j_http_port=7404, neo4j_https_port=7400, neo4j_bolt_port=7401, neo4j_admin_port=7402, influxdb_http_port=8404, influxdb_meta_port=8400, influxdb_udp_port=8406, influxdb_admin_port=8401)
        database.install()
        response = self.guest_csrf_client.delete(reverse('iscan:databases-detail', args=[database.id]),
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        c = Database.objects.filter(name='test_database').count()
        assert c == 1
        database.delete()

    def testAllowedDatabaseDelete(self):
        database = Database.objects.create(
        name='test_database', neo4j_http_port=7404, neo4j_https_port=7400, neo4j_bolt_port=7401, neo4j_admin_port=7402, influxdb_http_port=8404, influxdb_meta_port=8400, influxdb_udp_port=8406, influxdb_admin_port=8401)
        database.install()

        corpus = Corpus.objects.create(name='test_corpus', database=database)
        perm = CorpusPermissions.objects.create(user=self.allowed_user, corpus=corpus, can_access_database=True)
        response = self.guest_csrf_client.delete(reverse('iscan:databases-detail', args=[database.id]),
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        c = Database.objects.filter(name='test_database').count()
        assert c == 1
        database.delete()


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

        self.guest_user = User.objects.create(username='guest', password='12345')
        self.guest_user.profile.user_type = Profile.GUEST
        self.guest_user.save()
        self.guest_token = Token.objects.create(key='guest_key', user=self.guest_user)
        self.guest_csrf_client = APIClient()
        self.guest_csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.guest_token.key)

    def tearDown(self):
        self.user.delete()
        self.guest_user.delete()
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

    def testGuestRefreshDatabases(self):
        response = self.guest_csrf_client.post(reverse('iscan:databases-refresh-databases'),
                                         format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        databases = Database.objects.all()
        assert len(databases) == 0