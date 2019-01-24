.. _`install the Linux subsystem`: https://msdn.microsoft.com/en-us/commandline/wsl/install_guide

.. _installation_without_docker:

*********************************
Installation without using Docker
*********************************

.. note::

   Currently only Ubuntu is a supported and tested system.  We hope to support other operating systems in the future, but
   please bear in mind that things may not work.  If you are on Windows 10, you can `install the Linux subsystem`_.
   ISCAN servers are known to run using the Bash shell in Windows 10.  Also note that ``sudo`` ability is required for installation
   and running services that ISCAN depends upon.

Prerequisites
=============

ISCAN servers have the following prerequisites.:

1. Python 3
2. Java 8
3. RabbitMQ
4. SQL database (PostGreSQL recommended)
5. NodeJS and NPM
6. Praat
7. Reaper (optional)

Java 8
------

To install Java 8 on Ubuntu, you can install the Oracle version via:

.. code-block:: bash

   sudo add-apt-repository ppa:webupd8team/java
   sudo apt-get update
   sudo apt-get install oracle-java8-installer


RabbitMQ
--------

For working with asynchronous tasks, a message queue is needed, RabbitMQ is the default, installed as follows

.. code-block:: bash

   sudo apt-get install rabbitmq-server
   sudo service rabbitmq-server start

See https://simpleisbetterthancomplex.com/tutorial/2017/08/20/how-to-use-celery-with-django.html#installing-rabbitmq-on-ubuntu-1604
for more details.

Relational Database
-------------------

ISCAN server can use a SQLite database, but in general a PostGreSQL database is recommended.  It can be installed via:

.. code-block:: bash

   sudo apt-get install postgresql postgresql-contrib libpq-dev
   sudo service postgresql start

The database will have to be set up with a user/password as well, see https://www.digitalocean.com/community/tutorials/how-to-use-postgresql-with-your-django-application-on-ubuntu-14-04
for more instructions.


Praat
-----

ISCAN requires the barren version of the Praat executable to run its acoustic analysis scripts (no graphical interface).

You can get this from http://www.fon.hum.uva.nl/praat/download_linux.html.

Once you extract it, make sure that the command :code:`praat` points to this executable (either through an alias or renaming
:code:`praat_barren` and making sure the parent directory is included in :code:`$PATH`)

Reaper
------

Reaper is a program for pitch analysis, so you'll only need to install it if you want to use Reaper's pitch estimation in
place of Praat's.

Follow the instructions on Reaper's GitHub repository (https://github.com/google/REAPER) to install it and put the resulting
executable somewhere on the system path so that Polyglot can find it easily.


NodeJS
------

Installation of the front end JavaScript and dependencies is handled by NPM, which is installed as follows:

.. code-block:: bash

   sudo apt-get install nodejs npm

.. _nondocker_installation:

Installation
============

Start by cloning the GitHub repository

.. code-block:: bash

   git clone https://github.com/MontrealCorpusTools/iscan-server.git

Once there, look in the ``iscan-server/iscan_server/settings`` directory and create a file named ``local_settings.py``.

Add the following to it, replacing any paths with relevant paths for your system,
as well as information for the PostGreSQL database:

.. code-block:: python

   SOURCE_DATA_DIRECTORY = '/path/for/where/corpora/should/be/loaded/from'

   POLYGLOT_DATA_DIRECTORY = '/path/to/store/all/polyglot/data'

   DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql_psycopg2',
            'NAME': 'database_name',
            'USER': 'user_name',
            'PASSWORD': 'password',
            'HOST': 'localhost',
            'PORT': '5433',
        }
   }


From the root of the server directory, install all of the server's dependencies:

.. code-block:: bash

   pip install -r requirements.txt

For development, getting the latest version of PolyglotDB is recommended via:

.. code-block:: bash

   pip install https://github.com/MontrealCorpusTools/PolyglotDB/archive/master.zip

Then set up the server's database:

.. code-block:: bash

   python manage.py migrate

To install all of the JavaScript dependencies for the front end, run:

.. code-block:: bash

   npm install

To generate a superuser admin account for the server:

.. code-block:: bash

   python manage.py createsuperuser

In a separate terminal, start the celery process (from the root of the iscan-server repository):

.. code-block:: bash

   celery -A iscan_server worker -l info

Finally, run the server:

.. code-block:: bash

   python manage.py runserver 8080