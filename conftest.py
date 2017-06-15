import pytest


from pgdb.models import Database
from polyglot_server.celery import app


@pytest.fixture(scope='session')
def django_db_setup(django_db_setup, django_db_blocker):
    with django_db_blocker.unblock():
        db = Database(name='test_database', neo4j_http_port=7400, neo4j_https_port=7401, neo4j_bolt_port=7402,
                      neo4j_admin_port=7403,
                      influxdb_http_port=8400, influxdb_udp_port=8401, influxdb_admin_port=8402)
        db.save()


@pytest.fixture(scope='module')
def celery_app(request):
    app.conf.update(CELERY_ALWAYS_EAGER=True)
    return app