import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.core.urlresolvers import reverse

from pgdb.models import Database


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
