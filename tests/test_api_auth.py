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

    def tearDown(self):
        self.user.delete()


class CurrentUserTest(APILiveServerTestCase):
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

    def test_current_user(self):
        response = self.csrf_client.get(reverse('iscan:users-current-user'),
                                         format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'
        assert response.data['user_type'] == 'U'
        assert response.data['is_superuser']


