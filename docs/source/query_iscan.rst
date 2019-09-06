.. _query_iscan:

**********
Query View
**********

In this view, the user constructs queries by specifying a particular set of data of interest, and exports a CSV file of relevant linguistic information. For example uses of this page, please see the :ref:`tutorials_iscan`.

From the :ref:`summary_iscan`, the user selects a Linguistic Unit over which to query. A linguistic unit can be an utterance, word, syllable, or phone. By selecting a linguistic unit, the user is specifying the set of elements over which the query is to be made. For example, selecting “phones” will cause the program to look for phones with properties specified by the user (if “words” were selected, then the program would look for words, etc.) Go to :ref:`summary_iscan` for more information about linguistic units.

Building Queries
================

The user builds queries by specifying filters, subsets, and/or alignments for some linguistic unit. The user can specify particular properties for target units, as well as the units preceding and following the targets. Filters, alignments, and subsets may be specified on any linguistic type at or higher than the linguistic unit of interest. For example, if a user is querying words, filters may be specified over properties of words, over the properties of the utterances those words appear in, over the properties of the sound files in which the words appear, and over the speakers who produced the words. These can be added by selecting the linguistic type of interest in the top bar of the Query View.

.. image:: query01-lingtype.png

Filters
*******

Filters are statements that limit the data returned to a specific set. Each filter added provides another constraint on the data. A filter can be specified by choosing the 'ADD FILTER' button. The filters a dropdown menu for *Property* and *Operator*, as well as a space to type in a *Value*.

Property
--------

The first dropdown menu when creating a filter is used to target a property.


Operator
--------

The second dropdown menu when creating a filter selects an operator.

#. **==** means 'equals'. The property selected must match the value specified.
#. **!=** means 'does not equal'. The property selected must *not* match the value specified.
#. **in** (for lists of values) The property selected must appear in the specified subset of Values. For example, in a filter on *Speaker Properties*, over the property *name*, operator *in*, selecting a subset of the names in the *Value* dropdown menu will force the query only to output results for which the speaker name is one of those selected. 
#. **not in** (for lists of values) The property selected must *not* appear in the specified subset of Values.
#. **<** (for numeric values) The property selected must be less than the specified value. For example, with this operator you may specify that the *duration* of a *word* be less than 100 ms.
#. **>** (for numeric values) The property selected must be greater than the specified value.
#. **<=** (for numeric values) The property selected must be less than or equal to the specified value.
#. **>=** (for numeric values) The property selected must be greater than or equal to the specified value.

Subsets
*******



Alignments
**********


Exporting Queries
=================
