
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

At the moment, ISCAN hosted on https://roquefort.linguistics.mcgill.ca uses an aligned version of ICE-Canada corpus. However, this tutorial corpus is not distributable currently, so we plan to make another one based on a subset of LibriSpeech available in the near future.  For the purpose of adding tutorial corpora for each user to run through tutorials, any smaller corpus aligned using the `Montreal Forced Aligner`_ will work once renamed to ``spade-tutorial`` and added to the system.

For ISCAN hosted on https://roquefort.linguistics.mcgill.ca, site administrators can create tutorial corpora from the new *User View*, by going to *Users* in the navigation bar directly in ISCAN. 

Adding new corpora
==================

To add any new corpus, simply put its folder in the ``polyglot_source`` directory (see :ref:`mounted` for its location
in the Docker installation). When not using Docker, this is configuration setting in the ``local_settings.py`` of the Django
configuration (``SOURCE_DATA_DIRECTORY`` in the non-Docker :ref:`nondocker_installation`).


Once the corpus is in the directory, performing a reload on the home page of the ISCAN server will update ISCAN's records
of databases and corpora.  If the corpus does not use forced aligned TextGrids as transcripts, then the corpus format will
have to be changed in the admin page (i.e. go to https://hostname.com/admin/iscan/corpus/, select the corpus and select
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


Creating and Modifying Users
============================

User creation and permissions editing can be done in two ways. As previously, everything can be done throught the Django admin interface (i.e., https://hostname.com/admin/auth/user/). Alternatively, there is now a method for superusers to access this through ISCAN directly, by selecting the *Users* tab in the navigation bar.

In the Users View, a user with administrative permissions can choose the 'Add New User' button to add a user with any role (roles explained below).

User Permissions
----------------

When creating a new user, you can choose whether to grant the following permissions:

- *Can edit*: allows the user to edit and correct aspects of the corpus data, such as acoustic measurements like pitch/formants/
  tracks or time boundaries of segments/words (this functionality is currently not implemented in ISCAN)
- *Can annotate*: allows the user to add their own annotations to linguistic items, within an annotation framework specified
  in the admin interface (this functionality isn't fully featured yet, and has primarily only been implemented for annotating
  utterances)
- *Can view annotations*: allow the user to see annotations in the corpus
- *Can listen*: allows the user to play audio on the corpus detail page
- *Can view detail*: allows the user access to the query detail view, otherwise the user can query but not see the full
  context of each result
- *Can enrich*: allows the user to create/run/reset/delete enrichments
- *Can access database*: allows the user to start/stop the database for this corpus

User Roles
----------

Some predefined user types are available to easily create new users with the correct permissions. 

* **Guest** These users have permissions to query any public corpora. They have no other permissions, and they cannot query any restricted/private corpora.
* **Annotator** These users have permissions to query, view detail, listen, and add annotations to all public corpora. They *do not* have database access, permission to enrich corpora, edit, or view other annotations.
* **Researcher** These researchers have database access, permission to enrich and query all corpora. Additionally, for *public* corpora only, they can view detail, edit, listen, and view annotations. They do not have permission to add annotations.
* **Unlimited researcher** These users correspond to what we otherwise call *superusers*. They have all permissions for all corpora, as well as database access and administrative permissions. This is reserved for McGill internal team members.

In addition to these predefined roles, individual permissions can all be edited manually in the User View by finding the user and selecting the *Edit* button in the *Actions* column. More specific per-corpus permissions can be given to uses through the Django admin interface as well (i.e. https://hostname.com/admin/iscan/corpuspermissions/).

Reporting errors and issues
===========================

Some issues can be worked around in the admin interface.  For instance, running an enrichment locks the corpus as ``busy``,
which can cause issues with rare exceptions during their running to cause the corpus to become locked.  This ``busy`` status
can be fixed by changing this property on the admin page for that corpus object.

Additionally, databases can be reset to their original non-imported state by deleting the database on the admin page for
databases (i.e., https://hostname.com/admin/iscan/database/).

If any issues are encountered, please post them along with the exception message found either in the runserver window
or the celery window to the `GitHub issues page`_.

