.. _`PolyglotDB`: https://github.com/MontrealCorpusTools/PolyglotDB
.. _`Docker`: https://www.docker.com/what-docker
.. _`Angular`: https://angular.io/
.. _`PostgreSQL`: https://www.postgresql.org/
.. _`RabbitMQ`: https://www.rabbitmq.com/
.. _`Celery`: http://www.celeryproject.org/
.. _`Django`: https://www.djangoproject.com/

.. _introduction:

************
Introduction
************

**If you are a new ISCAN user, please go directly to**  :ref:`tutorials_iscan`.

ISCAN (Integrated Speech Corpus ANalysis) is a tool to manage and analyze corpora on a single server with support for
multiple clients enriching and querying the corpora as needed.  The ISCAN server contains tools to install/start/stop
the databases that `PolyglotDB`_ (the Python API) uses.

Additionally, the ISCAN server is used to manage multiple different Polyglot databases, so users can isolate corpora as
needed, and start and stop databases as they need access to them.
