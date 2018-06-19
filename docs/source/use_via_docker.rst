.. _use_via_docker:

*************************
Use & workflow via Docker
*************************

Starting the server
===================

To start the server and its containers, run:

.. code-block:: bash

	docker-compose start

This will start the existing containers containing the services defined in :code:`docker-compose.yml`, which were created when we first ran :code:`docker-compose up`.

Mounted volumes
===============

This Docker instance is configured so that the contents of certain directories persist between runs of the server, and so that contents are constant between the local directory and the directory in the container. These local directories, located in the root of the repository, are:

* :code:`polyglot_source/` - the directory containing corpora to be loaded
* :code:`polyglot_data/` - the directory where corpus metadata will be stored
* :code:`pgdb/` - the directory where the front-end code is stored
* :code:`polyglot_server/` - the directory containing the Django project for the server

Changes you make locally in these folders should persist into the container without needing to re-build the Docker image.

Stopping the server
===================

To stop the server, run:

.. code-block:: bash

	docker-compose stop

This will stop the existing containers.