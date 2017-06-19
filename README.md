# polyglot-server
Polyglot server

[![Build Status](https://travis-ci.org/MontrealCorpusTools/polyglot-server.svg?branch=master)](https://travis-ci.org/MontrealCorpusTools/polyglot-server)
[![Coverage Status](https://coveralls.io/repos/github/MontrealCorpusTools/polyglot-server/badge.svg?branch=master)](https://coveralls.io/github/MontrealCorpusTools/polyglot-server?branch=master)


This is mostly notes from Michael to himself for how to set up a Polyglot server, and will form the basis for later documentation.
Ubuntu is currently the only officially supported platform for Polyglot servers (and by extension Bash on Windows).

Polyglot servers are a way to manage and analyze corpora on single server with support for multiple clients enriching and querying
the corpora as needed.  The Polyglot server contains tools to install/start/stop the databases that PolyglotDB (the Python API) uses.
This is the only software that a user should have to install on a server (i.e., installation of Neo4j and InfluxDB are handled as needed).
Additionally, the Polyglot server is used to manage multiple different Polyglot databases, so users can isolate corpora as needed,
and start and stop databases as they need access to them.

Prerequisites
=============

1. Java 8
2. RabbitMQ server set up and running

Installation
============

We recommend using a separate virtual environment for running the server, since the packages it depends on are idiosyncratic
to the server (i.e., latest dev version of py2neo, not the most current celery, etc.)

1. `pip install -r requirements.txt -U`

Edit settings
=============

1. Edit polyglot_server/settings.py
2. Change SOURCE_DATA_DIRECTORY to point to directory where corpora to be imported are
3. Optionally change POLYGLOT_DATA_DIRECTORY to point to a directory where you want the databases to be installed/stored
4. Eventually we'll have instructions for changing the server's relational database backend and other web server config details

From the root directory run:

`python manage.py migrate --run-syncdb`


Running development server
==========================

From the root directory run both:

`celery -A polyglot_server worker --loglevel=INFO`

`python manage.py runserver`

Testing
=======

Testing is done by running `pytest` in the root directory.

Notes on synchronous requests
=============================

Requests that start an asynchronous task (at the moment: import and enrichment; in the future: acoustics and queries exported to csv)
can be run synchronously by supplying `'blocking': True` to the request.  This does not depend on a celery worker to process
the task, but will block the request until it's fully run, so use with caution, primarily for development and testing where
datasets are much smaller than in production.
