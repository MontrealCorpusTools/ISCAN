# polyglot-server

[![Build Status](https://travis-ci.org/MontrealCorpusTools/polyglot-server.svg?branch=master)](https://travis-ci.org/MontrealCorpusTools/polyglot-server)
[![Coverage Status](https://coveralls.io/repos/github/MontrealCorpusTools/polyglot-server/badge.svg?branch=master)](https://coveralls.io/github/MontrealCorpusTools/polyglot-server?branch=master)

## Introduction

Polyglot servers are a way to manage and analyze corpora on a single server with support for multiple clients enriching and querying
the corpora as needed.  The Polyglot server contains tools to install/start/stop the databases that PolyglotDB (the Python API) uses.
Additionally, the Polyglot server is used to manage multiple different Polyglot databases, so users can isolate corpora as needed,
and start and stop databases as they need access to them.

**Note**: At the moment, polyglot-server is only supported on Ubuntu.

## Prerequisites
Polyglot-server uses [Docker](https://www.docker.com/what-docker). This containerization means that the only dependency the user must install is Docker itself.

### Preparing Docker
* Install [Docker for Ubuntu](https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-docker-ce). It is easiest to install using the *Install from repository* method.
* Complete the [post-installation instructions](https://docs.docker.com/install/linux/linux-postinstall/) for Docker for Ubuntu. This will make it unnecessary to prepend Docker commands with `sudo`.
* Install [Docker Compose](https://docs.docker.com/compose/install/), the tool for defining and running multi-container Docker applications.

## Installation

First, clone the polyglot-server repository to your machine:

``git clone https://github.com/MontrealCorpusTools/polyglot-server.git``

Included are a `Dockerfile` and a `docker-compose.yml`. In order to build a Docker image from these files, navigate to the root of the repository and run:

``docker-compose build``

Then, run the Docker image by running:

``docker-compose up``

In your web browser, navigate to `localhost:8080`. You should see the I-SCAN web page.

### Superuser creation
The first time you use polyglot-server, you will need to set up a username and password to log in with. Press `Ctrl+C` to end the current server run, and run:

``docker-compose run app python3 manage.py createsuperuser``

This will start the containers and begin a prompt that asks you for a username, email address, and password. Once you have filled them out, the containers will close.

Then, run:

``docker-compose up``

and log in with your credentials. You should only need to perform this step once; from now on, whenever you start the server, you should be able to log in with your defined username and password. When finished, press `Ctrl+C` to end the current server run.

## Use and workflow

### Starting the server
To start the server and its containers, run:

``docker-compose start``

This will start the existing containers containing the services defined in `docker-compose.yml`, which were created when we first ran `docker-compose up`.

### Mounted volumes

This Docker instance is configured so that the contents of certain directories persist between runs of the server, and so that contents are constant between the local directory and the directory in the container. These local directories, located in the root of the repository, are:

* `polyglot_source/` - the directory containing corpora to be loaded
* `polyglot_data/` - the directory where corpus metadata will be stored
* `pgdb/` - the directory where the front-end code is stored
* `polyglot_server/` - the directory containing the Django project for the server

Changes you make locally in these folders should persist into the container without needing to re-build the Docker image.

### Stopping the server

To stop the server, run:

``docker-compose stop``

This will stop the existing containers.
