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

Polyglot servers are a way to manage and analyze corpora on a single server, with support for multiple clients who can enrich and query the corpora as needed.  

The Polyglot server contains tools to install/start/stop the databases that `PolyglotDB`_ (the Python API) uses. Additionally, the Polyglot server is used to manage multiple different Polyglot databases, so users can isolate corpora as needed, and start and stop databases as they need access to them.

Moving parts
============

The Polyglot server uses several components, which are all managed by `Docker`_ (see :ref:`installation_via_docker` and :ref:`use_via_docker` for more information). The components are:

* A web interface, with which the user can manage and analyze corpora, written in `Angular`_
* A Python API, `PolyglotDB`_, which communicates between the web interface and the back-end web framework, using `Django`_
* A relational database, which manages metadata about Polyglot databases, using `PostgreSQL`_
* Message and job queues for working with asynchronous tasks, using `RabbitMQ`_ and `Celery`_