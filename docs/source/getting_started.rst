.. _`install the Linux subsystem`: https://msdn.microsoft.com/en-us/commandline/wsl/install_guide

.. _getting_started:

***************
Getting started
***************

.. note::

   Currently only Ubuntu is a supported and tested system.  We hope to support other operating systems in the future, but
   please bear in mind that things may not work.  If you are on Windows 10, you can `install the Linux subsystem`_.
   Polyglot servers are known to run using the Bash shell in Windows 10.

Prerequisites
=============

Polyglot servers have a couple of prerequisites.

1. Java 8
2. Praat (optional)
3. Reaper (optional)

Java 8
------

To install Java on Ubuntu, you can install the oracle version via:

.. code-block:: bash

   sudo add-apt-repository ppa:webupd8team/java
   sudo apt-get update
   sudo apt-get install oracle-java8-installer

Praat
-----

Polyglot requires the barren version of the Praat executable to run its acoustic analysis scripts (no graphical interface).

You can get this from http://www.fon.hum.uva.nl/praat/download_linux.html.

Once you extract it, make sure that the command :code:`praat` points to this executable (either through an alias or renaming
:code:`praat_barren` and making sure the parent directory is included in :code:`$PATH`)

Reaper
------

Reaper is a program for pitch analysis, so you'll only need to install it if you want to use Reaper's pitch estimation in
place of Praat's.

Follow the instructions on Reaper's GitHub repository (https://github.com/google/REAPER) to install it and put the resulting
executable somewhere on the system path so that Polyglot can find it easily.


Installation
============

Start by cloning the GitHub repository somewhere

.. code-block:: bash

   git clone https://github.com/MontrealCorpusTools/polyglot-server.git

Once there, look in the polyglot-server/polyglot_server directory and create a file named local_settings.py.

Add the following to it, replacing any paths with relevant paths for your system:

.. code-block:: python

   SOURCE_DATA_DIRECTORY = '/path/for/where/corpora/should/be/loaded/from'

   POLYGLOT_DATA_DIRECTORY = '/path/to/store/all/polyglot/data'


From the root of the server directory, install all of the server's dependencies:

.. code-block:: bash

   pip install -r requirements.txt

Then set up the server's database:

.. code-block:: bash

   python manage.py makemigrations
   python manage.py migrate

Finally, run the server:

.. code-block:: bash

   python manage.py runserver