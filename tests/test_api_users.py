from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APILiveServerTestCase
from iscan.models import Database, Profile, CorpusPermissions, Corpus
from iscan.api import DatabaseViewSet
from rest_framework.test import APIClient, APIRequestFactory
from django.test import TestCase, override_settings
from django.contrib.auth.models import Group, User
import pytest
import shutil
import os

factory = APIRequestFactory()


class CreateUserTest(APILiveServerTestCase):
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

    def testUserCreate(self):
        response = self.csrf_client.post(reverse('iscan:users-list'),
                                         {'username': 'new_user', 'password': 'somepassword',
                                          'user_type': Profile.GUEST},
                                         format='json')
        print(response, response.data)
        assert response.status_code == status.HTTP_201_CREATED
        u = User.objects.get(username='new_user')
        assert u.username == 'new_user'
        assert u.profile.user_type == Profile.GUEST


class CreateTutorialTest(APILiveServerTestCase):
    def setUp(self):
        from rest_framework.authtoken.models import Token

        from django.contrib.auth.models import Group, User
        self.user = User.objects.create_superuser(username='testuser', password='12345', email="fake@email.su")
        self.csrf_client = APIClient(enforce_csrf_checks=True)
        self.key = 'abcd1234'
        self.token = Token.objects.create(key=self.key, user=self.user)
        self.csrf_client = APIClient()
        self.csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.normal_user = User.objects.create(username='regular', password='12345')
        self.guest_user = User.objects.create(username='guest', password='12345')
        self.guest_user.profile.user_type = Profile.GUEST
        self.guest_user.save()
        self.annotator_user = User.objects.create(username='annotator', password='12345')
        self.annotator_user.profile.user_type = Profile.ANNOTATOR
        self.annotator_user.save()
        self.researcher_user = User.objects.create(username='researcher', password='12345')
        self.researcher_user.profile.user_type = Profile.RESEARCHER
        self.researcher_user.save()
        self.unlimited_user = User.objects.create(username='unlimited', password='12345')
        self.unlimited_user.profile.user_type = Profile.UNLIMITED
        self.unlimited_user.save()

    def tearDown(self):
        self.user.delete()
        self.guest_user.delete()
        self.annotator_user.delete()
        self.researcher_user.delete()
        self.unlimited_user.delete()
        for d in Database.objects.all():
            d.delete()
        from django.conf import settings
        shutil.rmtree(os.path.join(settings.SOURCE_DATA_DIRECTORY, 'tutorial-regular'))

    def testCreateGuestTutorialCorpus(self):
        response = self.csrf_client.post(reverse('iscan:users-create-tutorial-corpus',
                                                 args=[self.normal_user.id]),
                                         format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'tutorial-regular'

        response = self.csrf_client.post(reverse('iscan:users-create-tutorial-corpus',
                                                 args=[self.normal_user.id]),
                                         format='json')
        assert response.status_code == status.HTTP_304_NOT_MODIFIED
        assert response.data['name'] == 'tutorial-regular'
        c = Corpus.objects.get(name=response.data['name'])

        perm = CorpusPermissions.objects.get(user=self.user, corpus=c)
        assert perm.can_query
        assert perm.can_edit
        assert perm.can_annotate
        assert perm.can_view_annotations
        assert perm.can_listen
        assert perm.can_view_detail
        assert perm.can_enrich
        assert perm.can_access_database
        assert not perm.is_whitelist_exempt

        perm = CorpusPermissions.objects.get(user=self.annotator_user, corpus=c)
        assert not perm.can_query
        assert not perm.can_edit
        assert not perm.can_annotate
        assert not perm.can_view_annotations
        assert not perm.can_listen
        assert not perm.can_view_detail
        assert not perm.can_enrich
        assert not perm.can_access_database
        assert not perm.is_whitelist_exempt

        perm = CorpusPermissions.objects.get(user=self.researcher_user, corpus=c)
        assert not perm.can_query
        assert not perm.can_edit
        assert not perm.can_annotate
        assert not perm.can_view_annotations
        assert not perm.can_listen
        assert not perm.can_view_detail
        assert not perm.can_enrich
        assert not perm.can_access_database
        assert not perm.is_whitelist_exempt

        perm = CorpusPermissions.objects.get(user=self.unlimited_user, corpus=c)
        assert perm.can_query
        assert perm.can_edit
        assert perm.can_annotate
        assert perm.can_view_annotations
        assert perm.can_listen
        assert perm.can_view_detail
        assert perm.can_enrich
        assert perm.can_access_database
        assert not perm.is_whitelist_exempt


class DeleteUserTest(APILiveServerTestCase):
    def setUp(self):
        from rest_framework.authtoken.models import Token

        from django.contrib.auth.models import Group, User
        self.user = User.objects.create_superuser(username='testuser', password='12345', email="fake@email.su")
        self.csrf_client = APIClient(enforce_csrf_checks=True)
        self.key = 'abcd1234'
        self.token = Token.objects.create(key=self.key, user=self.user)
        self.csrf_client = APIClient()
        self.csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.normal_user = User.objects.create(username='regular', password='12345')

    def tearDown(self):
        self.user.delete()
        for d in Database.objects.all():
            d.delete()
        from django.conf import settings
        shutil.rmtree(os.path.join(settings.SOURCE_DATA_DIRECTORY, 'tutorial-regular'))

    def testDelete(self):
        response = self.csrf_client.post(reverse('iscan:users-create-tutorial-corpus',
                                                 args=[self.normal_user.id]),
                                         format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'tutorial-regular'

        response = self.csrf_client.delete(reverse('iscan:users-detail',
                                                 args=[self.normal_user.id]),
                                         format='json')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert User.objects.filter(username='regular').count() == 0
        assert Corpus.objects.filter(name='tutorial-regular').count() == 0


class UpdateUserTest(APILiveServerTestCase):
    def setUp(self):
        from rest_framework.authtoken.models import Token

        from django.contrib.auth.models import Group, User
        self.user = User.objects.create_superuser(username='testuser', password='12345', email="fake@email.su")
        self.csrf_client = APIClient(enforce_csrf_checks=True)
        self.key = 'abcd1234'
        self.token = Token.objects.create(key=self.key, user=self.user)
        self.csrf_client = APIClient()
        self.csrf_client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.normal_user = User.objects.create(username='regular', password='12345')
        response = self.csrf_client.post(reverse('iscan:databases-refresh-databases'),
                                         format='json')
        self.database = Database.objects.get(name='acoustic')
        self.corpus = Corpus.objects.get(name='acoustic')

    def tearDown(self):
        self.user.delete()
        self.normal_user.delete()
        for d in Database.objects.all():
            d.delete()

    def testUpdateUser(self):
        response = self.csrf_client.get(reverse('iscan:users-detail',
                                                 args=[self.normal_user.id]),
                                         format='json')
        print(response.data)
        assert response.status_code == status.HTTP_200_OK
        data = dict(response.data)
        assert data['username'] == 'regular'
        assert not data['corpus_permissions'][self.corpus.id]['can_query']
        assert not data['corpus_permissions'][self.corpus.id]['can_view_detail']

        data['corpus_permissions'][self.corpus.id]['can_query'] = True
        data['corpus_permissions'][self.corpus.id]['can_view_detail'] = True

        response = self.csrf_client.put(reverse('iscan:users-detail',
                                                 args=[self.normal_user.id]),
                                                data,
                                         format='json')
        print(response.data)
        assert data['username'] == 'regular'
        assert data['corpus_permissions'][self.corpus.id]['can_query']
        assert data['corpus_permissions'][self.corpus.id]['can_view_detail']

    def testChangeUserType(self):
        response = self.csrf_client.get(reverse('iscan:users-detail',
                                                 args=[self.normal_user.id]),
                                         format='json')
        print(response.data)
        assert response.status_code == status.HTTP_200_OK
        data = dict(response.data)
        assert data['username'] == 'regular'
        assert not data['corpus_permissions'][self.corpus.id]['can_query']
        assert not data['corpus_permissions'][self.corpus.id]['can_view_detail']
        assert data['user_type'] == 'G'

        data['user_type'] = 'U'

        response = self.csrf_client.put(reverse('iscan:users-detail',
                                                 args=[self.normal_user.id]),
                                                data,
                                         format='json')
        print(response.data)
        assert response.data['username'] == 'regular'
        assert response.data['corpus_permissions'][self.corpus.id]['can_query']
        assert response.data['corpus_permissions'][self.corpus.id]['can_view_detail']