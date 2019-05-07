.. _troublehooting:

*****************************
Troubleshooting common issues
*****************************

Connection refused
==================

If you run into an error where a SPADE server returns the following connection error:

.. code-block:: bash

	Traceback (most recent call last):
  	File "/home/linguistics/XXX/miniconda3/lib/python3.6/site-packages/neobolt-1.7.0rc5-py3.6-linux-x86_64.egg/neobolt/direct.py", line 793, in _connect
    	s.connect(resolved_address)
	ConnectionRefusedError: [Errno 111] Connection refused

1. First check that your webserver is running. Assuming you are connecting via localhost, run:

.. code-block:: bash
	
	telnet localhost 8080

or

.. code-block:: bash

	netstat | grep 8080

And you should see that port 8080 is listening. If either of these are not working, run:

.. code-block:: bash
	
	python manage.py runserver 8080

from the root of your ``iscan-spade-server`` directory.

2. Check Neo4j is listening on the right ports. This can be checked at ``iscan-spade-server/polyglot_data/CORPUS/neo4j.log``. Specifically, ISCAN Neo4j should be using 7400 (compared to a default Neo4j install which uses 7474 and 7687).

In this case, the easiest thing to do is to reset the database. Inside your ``SPADE`` repository, run:

.. code-block:: bash
	
	python reset_database.py CORPUS

Where ``CORPUS`` refers to the particular corpus you are trying to use. Which will delete the database files from your polyglot_data directory. If you then run:

.. code-block:: bash

	python SPADE_SCRIPT CORPUS -r

This will rebuild your database from scratch.

Neo4j PID error on stopping
===========================

Sometimes there may be issues in how ISCAN tracks the Polyglot databases.  It does this by storing the PID from the system
for both Neo4j and InfluxDB.  Sometimes however, these can be empty but the database is started and the database processes
are running.  As a workaround for this issue, you can reset the database fully by doing the following:

#. Stop the Neo4j process (``kill -9 <pid>``, where ``<pid>`` can be gotten from a ``ps -l`` command or ``top -n 5`` command,
   the neo4j will be listed as ``java``)
#. Navigate to the ISCAN admin page (locally http://localhost:8080/admin/)
#. Log in with a superuser's credentials
#. Click on ``Databases`` under ``ISCAN``
#. Click on the database name that is having issues
#. Change the status to ``Stopped``
#. Retry whatever operation was having issues previously (either start the database again or run the script).