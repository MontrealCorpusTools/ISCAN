.. _use_via_docker:

*************************
Use & workflow via Docker
*************************

Starting and stopping the server
================================

To start the server and its containers, run:

.. code-block:: bash

	docker-compose up

In your web browser, navigate to :code:`localhost:8080`. You should see the ISCAN web page.

To stop the server, press :code:`Ctrl+C` only once. The terminal should show a ``Gracefully stopping...`` message and then exit.

Mounted volumes
===============

This Docker instance is configured so that the contents of certain directories persist between runs of the server, and
so that contents are constant between the local directory and the directory in the container. These local directories,
located in the root of the repository, are:

* :code:`polyglot_source/` - the directory containing corpora to be loaded.
* :code:`polyglot_data/` - the directory where corpus metadata will be stored
* :code:`pgdb/` - the directory where the front-end code is stored
* :code:`polyglot_server/` - the directory containing the Django project for the server

Changes you make locally in these folders should persist into the container without needing to re-build the Docker image.

Cleaning
========

The :code:`docker-compose up` command usefully regenerates fresh containers each time it is run, but old containers can
take up space. To clean up containers on your machine, first stop all of them:

.. code-block:: bash

	docker stop $(docker ps -a -q)

Then, remove them:

.. code-block:: bash

	docker rm $(docker ps -a -q)