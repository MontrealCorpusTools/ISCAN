from django.apps import AppConfig

import logging
log = logging.getLogger(__name__)


class PgdbConfig(AppConfig):
    name = 'iscan'
