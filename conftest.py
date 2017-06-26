import pytest
import os

from pgdb.models import Database, Corpus
from polyglot_server.celery import app
from polyglot_server.settings import SOURCE_DATA_DIRECTORY, POLYGLOT_DATA_DIRECTORY


@pytest.fixture(scope='session')
def django_db_setup(django_db_setup, django_db_blocker):
    with django_db_blocker.unblock():
        db = Database(name='test_database', neo4j_http_port=7400, neo4j_https_port=7401, neo4j_bolt_port=7402,
                      neo4j_admin_port=7403,
                      influxdb_http_port=8400, influxdb_udp_port=8401, influxdb_admin_port=8402)
        db.save()
        db.start()

        c = Corpus(name='test_corpus', source_directory=os.path.join(SOURCE_DATA_DIRECTORY, 'acoustic'),
                   database=db, input_format='M')
        c.save()
        c.import_corpus()
        db.stop()


@pytest.fixture(scope='module')
def celery_app(request):
    app.conf.update(CELERY_ALWAYS_EAGER=True)
    return app


@pytest.fixture(scope='module')
def pg_data_directory():
    return POLYGLOT_DATA_DIRECTORY
