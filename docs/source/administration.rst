
.. _Montreal Forced Aligner: https://montreal-forced-aligner.readthedocs.io/en/latest/

.. _FAVE align: https://github.com/JoFrhwld/FAVE/wiki/FAVE-align

.. _LaBB-CAT: http://labbcat.sourceforge.net/

.. _BAS Partitur: http://www.bas.uni-muenchen.de/forschung/publikationen/Granada-98-Partitur.pdf

.. _Buckeye Speech Corpus: https://buckeyecorpus.osu.edu/

.. _TIMIT: https://catalog.ldc.upenn.edu/LDC93S1

.. _GitHub issues page: https://github.com/MontrealCorpusTools/iscan-server/issues

.. _administration :

*********************
Server administration
*********************

This page is to be used a reference for common tasks in administration of an ISCAN server.  The workflow for many of these
are not currently as streamlined as they would ideally be.

Updating ISCAN and PolyglotDB
=============================

As ISCAN and PolyglotDB are both under active development, updating to the latest version is necessary to fix issues that
crop up.  To perform an update, run the command:

.. code-block:: bash

   docker-compose run app update

Which will then fetch the latest changes from the GitHub repositories of both packages.

Getting a tutorial corpus
=========================

At the moment, ISCAN hosted on https://roquefort.linguistics.mcgill.ca uses an aligned version of ICE-Canada corpus.
However, this tutorial corpus is not distributable currently, so we plan to make another one based on a subset of LibriSpeech
available in the near future.  For the purpose of adding tutorial corpora for each user to run through tutorials, any
smaller corpus aligned using the `Montreal Forced Aligner`_ will work once renamed to ``spade-tutorial`` and added to
the system.

Adding new corpora
==================

To add any new corpus, simply put its folder in the ``polyglot_source`` directory (see :ref:`mounted` for its location
in the Docker installation). When not using Docker, this is configuration setting in the ``local_settings.py`` of the Django
configuration (``SOURCE_DATA_DIRECTORY`` in the non-Docker :ref:`nondocker_installation`).


Once the corpus is in the directory, performing a reload on the home page of the ISCAN server will update ISCAN's records
of databases and corpora.  If the corpus does not use forced aligned TextGrids as transcripts, then the corpus format will
have to be changed in the admin page (i.e. go to https://hostname.com/admin/pgdb/corpus/, select the corpus and select
the appropriate supported format from the Input format dropdown).


Supported formats
-----------------

The primary supported format is the output TextGrids from commonly used forced aligners:

- `Montreal Forced Aligner`_
- `FAVE align`_

In addition, the following formats are supported as well:

- TextGrid output from `LaBB-Cat`_
- `BAS Partitur`_ formatted files
- `Buckeye Speech Corpus`_
- `TIMIT`_

In regards to how the corpus should be structured, where possible files should be divided into speaker directories.
If the force aligned TextGrid has speaker information (i.e., word and phone tiers for multiple speakers), this is not
necessary.


Creating new users
==================

User creation is currently the Django admin interface (i.e., https://hostname.com/admin/auth/user/).  In addition to
specifying their username and password, you can also make them superusers through this page (giving them access to the admin
site and all corpora/databases).

Modifying user permissions
==========================

More specific per-corpus permissions can be given to uses through the Django admin interface as well (i.e.,
https://hostname.com/admin/pgdb/corpuspermissions/).  When creating one of these, you can select the user, the corpus,
and whether to grant the following permissions:

- Can edit: allows the user to edit and correct aspects of the corpus data, such as acoustic measurements like pitch/formants/
  tracks or time boundaries of segments/words (this functionality is currently not implemented in ISCAN)
- Can annotate: allows the user to add their own annotations to linguistic items, within an annotation framework specified
  in the admin interface (this functionality isn't fully featured yet, and has primarily only been implemented for annotating
  utterances)
- Can view annotations: allow the user to see annotations in the corpus
- Can listen: allows the user to play audio on the corpus detail page
- Can view detail: allows the user access to the query detail view, otherwise the user can query but not see the full
  context of each result
- Can enrich: allows the user to create/run/reset/delete enrichments
- Can access database: allows the user to start/stop the database for this corpus


Reporting errors and issues
===========================

Some issues can be worked around in the admin interface.  For instance, running an enrichment locks the corpus as ``busy``,
which can cause issues with rare exceptions during their running to cause the corpus to become locked.  This ``busy`` status
can be fixed by changing this property on the admin page for that corpus object.

Additionally, databases can be reset to their original non-imported state by deleting the database on the admin page for
databases (i.e., https://hostname.com/admin/pgdb/database/).

If any issues are encountered, please post them along with the exception message found either in the runserver window
or the celery window to the `GitHub issues page`_.

