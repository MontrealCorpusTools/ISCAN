.. _`install the Linux subsystem`: https://msdn.microsoft.com/en-us/commandline/wsl/install_guide
.. _`Docker`: https://www.docker.com/what-docker
.. _`Docker for Ubuntu`: https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-docker-ce
.. _`postinstallation instructions`: https://docs.docker.com/install/linux/linux-postinstall/
.. _`Docker Compose`: https://docs.docker.com/compose/install/

.. _installation_via_docker:

***********************
Installation via Docker
***********************

.. note::

   Currently only Ubuntu is a supported and tested system.  We hope to support other operating systems in the future, but
   please bear in mind that things may not work.  If you are on Windows 10, you can `install the Linux subsystem`_.
   Polyglot servers are known to run using the Bash shell in Windows 10.

Introduction
============

Polyglot servers are a way to manage and analyze corpora on a single server with support for multiple clients enriching and querying the corpora as needed.  The Polyglot server contains tools to install/start/stop the databases that PolyglotDB (the Python API) uses. Additionally, the Polyglot server is used to manage multiple different Polyglot databases, so users can isolate corpora as needed, and start and stop databases as they need access to them.

Prerequisites
=============

Polyglot-server uses `Docker`_. This containerization means that the only dependency the user must install is Docker itself.

Preparing Docker
----------------

First, install `Docker for Ubuntu`_. It is easiest to install using the *Install from repository* method.

Next, complete Docker for Ubuntu's  `postinstallation instructions`_. This will make it unnecessary to prepend Docker commands with :code:`sudo`.

Then, install `Docker Compose`_, the tool for defining and running multi-container Docker applications.

Installation
============

First, clone the polyglot-server repository to your machine:

.. code-block:: bash
	
	git clone https://github.com/MontrealCorpusTools/polyglot-server.git

Included are a :code:`Dockerfile` and a `docker-compose.yml`. In order to build a Docker image from these files, navigate to the root of the repository and run:

.. code-block:: bash
	
	docker-compose build

Then, run:

.. code-block:: bash

	docker-compose up

This will launch the containers.



Initial migrations
------------------

The first time you use polyglot-server, you will need to make database migrations. In another terminal, while the containers are up, run:

.. code-block:: bash

	docker-compose run app init

The needed migrations to perform will be detected and made.

Superuser creation
------------------

The first time you use polyglot-server, you will need to set up a username and password to log in with. In another terminal, while the containers are up, run:

.. code-block:: bash

	docker-compose run app python3 manage.py createsuperuser

This will begin a prompt that asks you for a username, email address, and password. Once you have filled them out, the prompt will close.

Then, you should be able to log in with your credentials. You should only need to perform this step once; from now on, whenever you start the server, you should be able to log in with your defined username and password. When finished, press :code:`Ctrl+C` to end the current server run.