import pytest
import os
import time
import json
from rest_framework.test import APIClient
from rest_framework import status
from django.core.urlresolvers import reverse

from pgdb.models import Database, Corpus
from django.test import override_settings


# Create your tests here.

@pytest.mark.django_db
def test_hierarchy():
    from polyglotdb.structure import Hierarchy
    client = APIClient()

    # Set up
    response = client.post(
        reverse('pgdb:start_database_api'),
        {'name': 'test_database'},
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED
    try:
        response = client.get(
            reverse('pgdb:hierarchy_api', args=['test_corpus']),
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        h = Hierarchy()
        h.from_json(json.loads(response.content))
        assert h['phone'] == 'word'

    except:
        raise
    finally:
        # Clean up
        response = client.post(
            reverse('pgdb:stop_database_api'),
            {'name': 'test_database'},
            format="json")
        assert response.status_code == status.HTTP_202_ACCEPTED


@pytest.mark.django_db
def test_query():
    from polyglotdb.structure import Hierarchy
    from polyglotdb.query.annotations import GraphQuery
    client = APIClient()

    c = Corpus.objects.get(name='test_corpus')
    assert c.status == 'I'
    assert c.database.status == 'S'

    query_data = {}
    response = client.post(
        reverse('pgdb:query_api', args=['test_notacorpus']),
        query_data,
        format='json'
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    response = client.post(
        reverse('pgdb:query_api', args=['test_corpus']),
        query_data,
        format='json'
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

    # Set up
    response = client.post(
        reverse('pgdb:start_database_api'),
        {'name': 'test_database'},
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED
    try:
        response = client.get(
            reverse('pgdb:hierarchy_api', args=['test_corpus']),
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        h = Hierarchy()
        h.from_json(json.loads(response.content))
        q = GraphQuery(h, h.phone)
        q.filter(h.phone.label == 'aa')
        q.columns(h.phone.label.column_name('label'),
                  h.phone.begin.column_name('begin'),
                  h.phone.end.column_name('end'))
        query_data = q.to_json()
        query_data['blocking'] = True

        response = client.post(
            reverse('pgdb:query_api', args=['test_corpus']),
            query_data,
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        results = json.loads(response.content)
        assert len(results) > 0
        for line in results:
            assert 'label' in line
            assert 'begin' in line
            assert 'end' in line
            assert line['label'] == 'aa'
    except:
        raise
    finally:
        # Clean up
        response = client.post(
            reverse('pgdb:stop_database_api'),
            {'name': 'test_database'},
            format="json")
        assert response.status_code == status.HTTP_202_ACCEPTED


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
    response = client.delete(
        reverse('pgdb:database_api', args=[data['name']]),
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED


@pytest.mark.django_db
def test_ports():
    client = APIClient()

    response = client.get(
        reverse('pgdb:database_ports_api', args=['test_database']),
        format="json")
    print(response.content)
    assert response.status_code == status.HTTP_200_OK
    r = json.loads(response.content)
    assert r == {'graph_http_port': 7400, 'graph_bolt_port': 7402,
                 'acoustic_http_port': 8400}


@pytest.mark.django_db
def test_database_directory(pg_data_directory):
    client = APIClient()

    response = client.get(
        reverse('pgdb:database_directory_api', args=['test_database']),
        format="json")
    print(response.content)
    assert response.status_code == status.HTTP_200_OK
    r = json.loads(response.content)
    assert r['data'] == os.path.join(pg_data_directory, 'test_database')


@pytest.mark.django_db
def test_start_stop_database():
    client = APIClient()
    data = {'name': 'test_database'}

    response = client.post(
        reverse('pgdb:start_database_api'),
        data,
        format="json")
    print(response.content)
    assert response.status_code == status.HTTP_202_ACCEPTED

    db = Database.objects.get(name='test_database')
    assert db.status == 'R'

    response = client.post(
        reverse('pgdb:start_database_api'),
        data,
        format="json")
    print(response.content)
    assert response.status_code == status.HTTP_423_LOCKED

    db = Database.objects.get(name='test_database')
    assert db.status == 'R'

    response = client.post(
        reverse('pgdb:stop_database_api'),
        data,
        format="json")
    print(response.content)
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
    r = json.loads(response.content)
    assert r == {"data": ["acoustic"]}


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
@pytest.mark.django_db
def test_import(celery_app):
    client = APIClient()
    data = {'name': 'test_database'}

    response = client.post(
        reverse('pgdb:start_database_api'),
        data,
        format="json")
    print(response.content)
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
    # response = client.get(
    #    reverse('pgdb:corpus_status_api',args=['test']),
    #    format="json")
    # print(reverse('pgdb:corpus_status_api',args=['test']))
    # print(response.content)
    c = Corpus.objects.get(name='test')
    assert c.status == 'I'
    data = {'name': 'test_database'}

    response = client.post(
        reverse('pgdb:stop_database_api'),
        data,
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED


@pytest.mark.django_db
def test_database_api():
    client = APIClient()

    response = client.get(
        reverse('pgdb:database_api', args=['test_database']),
        format="json")
    assert response.status_code == status.HTTP_200_OK
    r = json.loads(response.content)
    assert r == {'data': 'Stopped'}

    response = client.get(
        reverse('pgdb:database_api', args=['test_notadatabase']),
        format="json")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_corpus_api():
    client = APIClient()
    data = {'name': 'test_database'}

    response = client.post(
        reverse('pgdb:start_database_api'),
        data,
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED
    try:
        c = Corpus.objects.get(name='test_corpus')
        assert c.status == 'I'

        response = client.get(
            reverse('pgdb:corpus_api', args=['test_corpus']),
            format="json")
        assert response.status_code == status.HTTP_200_OK
        r = json.loads(response.content)
        assert r == {'data': 'Imported'}

        response = client.get(
            reverse('pgdb:corpus_api'),
            format="json")
        assert response.status_code == status.HTTP_200_OK
        r = json.loads(response.content)
        assert r == {'test_corpus': 'Imported'}
    except:
        raise
    finally:
        # Clean up
        response = client.post(
            reverse('pgdb:stop_database_api'),
            {'name': 'test_database'},
            format="json")
        assert response.status_code == status.HTTP_202_ACCEPTED


@pytest.mark.django_db
def test_enrich():
    client = APIClient()

    c = Corpus.objects.get(name='test_corpus')
    assert c.status == 'I'
    assert c.database.status == 'S'

    pause_data = {'type': 'pause', 'pause_words': ['<SIL>'], 'blocking': True}
    response = client.post(
        reverse('pgdb:enrichment_api', args=['test_notacorpus']),
        pause_data,
        format='json'
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    response = client.post(
        reverse('pgdb:enrichment_api', args=['test_corpus']),
        pause_data,
        format='json'
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

    # Set up
    response = client.post(
        reverse('pgdb:start_database_api'),
        {'name': 'test_database'},
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED
    try:
        response = client.post(
            reverse('pgdb:enrichment_api', args=['test_corpus']),
            pause_data,
            format='json'
        )
        print(response.content)
        assert response.status_code == status.HTTP_202_ACCEPTED

        c = Corpus.objects.get(name='test_corpus')
        assert c.status == 'I'
        assert c.has_pauses

        utterance_data = {'type': 'utterance', 'blocking': True}

        response = client.post(
            reverse('pgdb:enrichment_api', args=['test_corpus']),
            utterance_data,
            format='json'
        )
        print(response.content)
        assert response.status_code == status.HTTP_202_ACCEPTED

        c = Corpus.objects.get(name='test_corpus')
        assert c.status == 'I'
        assert c.has_utterances

        syllabics_data = {'type': 'syllabic', 'phones': ['aa', 'ih', 'iy'], 'blocking': True}

        response = client.post(
            reverse('pgdb:enrichment_api', args=['test_corpus']),
            syllabics_data,
            format='json'
        )
        print(response.content)
        assert response.status_code == status.HTTP_202_ACCEPTED

        c = Corpus.objects.get(name='test_corpus')
        assert c.status == 'I'
        assert c.has_syllabics

        syllables_data = {'type': 'syllable', 'blocking': True}

        response = client.post(
            reverse('pgdb:enrichment_api', args=['test_corpus']),
            syllables_data,
            format='json'
        )
        print(response.content)
        assert response.status_code == status.HTTP_202_ACCEPTED

        c = Corpus.objects.get(name='test_corpus')
        assert c.status == 'I'
        assert c.has_syllables
    except:
        raise
    finally:
        # Clean up
        response = client.post(
            reverse('pgdb:stop_database_api'),
            {'name': 'test_database'},
            format="json")
        assert response.status_code == status.HTTP_202_ACCEPTED


@pytest.mark.django_db
def test_delete():
    client = APIClient()
    data = {'name': 'test_database'}
    response = client.delete(
        reverse('pgdb:database_api', args=[data['name']]),
        format="json")
    assert response.status_code == status.HTTP_202_ACCEPTED

    response = client.delete(
        reverse('pgdb:database_api', args=['notacorpus']),
        format="json")
    assert response.status_code == status.HTTP_404_NOT_FOUND
