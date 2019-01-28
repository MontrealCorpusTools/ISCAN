.. iscan-server documentation master file, created by
   sphinx-quickstart on Fri Jul 28 12:50:43 2017.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.


.. _`PolyglotDB`: https://github.com/MontrealCorpusTools/PolyglotDB
.. _`Docker`: https://www.docker.com/what-docker
.. _`Angular`: https://angular.io/
.. _`PostgreSQL`: https://www.postgresql.org/
.. _`RabbitMQ`: https://www.rabbitmq.com/
.. _`Celery`: http://www.celeryproject.org/
.. _`Django`: https://www.djangoproject.com/

.. _administration:

*******************************
Administration and installation
*******************************

.. note ::

   At the moment, iscan-server is only supported on Ubuntu.

.. warning::

   Running analyses via script currently do not work with the docker installation.  If you plan on writing/running
   automated scripts, rather than interacting with the data via the web interface, use the non-Dockerized version.

Much of this documentation is meant to be more technical and is geared towards advanced users interested in setting up their own
ISCAN servers, either on a desktop computer for local use or on a dedicated server for communal use. Please see the :ref:`tutorials_iscan`
section for more information and a walk-through on how to use ISCAN once it has been set up.

Moving parts
============

The ISCAN server uses several components, which are all managed by `Docker`_ (see :ref:`installation_via_docker` and :ref:`use_via_docker` for more information). The components are:

* A web interface, with which the user can manage and analyze corpora, written in `Angular`_
* A Python API, `PolyglotDB`_, which communicates between the web interface and the back-end web framework, using `Django`_
* A relational database, which manages metadata about Polyglot databases, using `PostgreSQL`_
* Message and job queues for working with asynchronous tasks, using `RabbitMQ`_ and `Celery`_

.. toctree::
   :maxdepth: 2
   :caption: Contents:

   installation_via_docker.rst
   use_via_docker.rst
   installation_without_docker.rst
   administration.rst
