import pytest
import time
from rest_framework.test import APIClient
from rest_framework import status
from django.core.urlresolvers import reverse

from pgdb.models import Database, Corpus
from django.test import override_settings


# Create your tests here.


@pytest.mark.django_db
def test_create_database():
    client = APIClient()
    data = {'name': 'first_database'}
    response = client.post(
        reverse('pgdb:create_database_api'),
        data,
        format="json")
    assert response.status_code == status.HTTP_201_CREATED
    res = Database.objects.all()
    assert len(res) == 2
    db = Database.objects.get(name='first_database')
    assert db.neo4j_http_port == 7404
    assert db.influxdb_http_port == 8403
    assert db.influxdb_udp_port == 8404
    time.sleep(10)
    response = client.delete(
        reverse('pgdb:database_api', args=[data['name']]),
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED


@pytest.mark.django_db
def test_start_stop_database():
    client = APIClient()
    data = {'name': 'test_database'}

    response = client.post(
        reverse('pgdb:start_database_api'),
        data,
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED

    db = Database.objects.get(name='test_database')
    assert db.status == 'R'

    response = client.post(
        reverse('pgdb:start_database_api'),
        data,
        format="json")
    assert response.status_code == status.HTTP_423_LOCKED

    db = Database.objects.get(name='test_database')
    assert db.status == 'R'

    response = client.post(
        reverse('pgdb:stop_database_api'),
        data,
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED

    db = Database.objects.get(name='test_database')
    assert db.status == 'S'

    response = client.post(
        reverse('pgdb:stop_database_api'),
        data,
        format="json")
    assert response.status_code == status.HTTP_423_LOCKED

    db = Database.objects.get(name='test_database')
    assert db.status == 'S'


@pytest.mark.django_db
def test_choices():
    client = APIClient()

    response = client.get(
        reverse('pgdb:source_choices'),
        format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.content == b'{"data": ["acoustic"]}'


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
@pytest.mark.django_db
def test_import(celery_app):
    client = APIClient()
    data = {'name': 'test_database'}

    response = client.post(
        reverse('pgdb:start_database_api'),
        data,
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED

    data = {'name': 'test',
            'database_name': 'test_database',
            'source_directory': "acoustic",
            'format': 'M',
            'blocking': True}
    response = client.post(
        reverse('pgdb:import_corpus_api'),
        data,
        format="json")
    print(response.content)
    assert response.status_code == status.HTTP_202_ACCEPTED
    #response = client.get(
    #    reverse('pgdb:corpus_status_api',args=['test']),
    #    format="json")
    #print(reverse('pgdb:corpus_status_api',args=['test']))
    #print(response.content)
    c = Corpus.objects.get(name='test')
    assert c.status == 'I'
    data = {'name': 'test_database'}

    response = client.post(
        reverse('pgdb:stop_database_api'),
        data,
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED


@pytest.mark.django_db
def test_delete():
    time.sleep(10)
    client = APIClient()
    data = {'name': 'test_database'}
    response = client.delete(
        reverse('pgdb:database_api', args=[data['name']]),
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED

