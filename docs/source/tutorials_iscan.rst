.. _`Montreal Forced Aligner`: https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner
.. _`here`: http://spade.glasgow.ac.uk/wp-content/uploads/2018/07/speaker_info.csv
.. _`Lexicon CSV`: http://spade.glasgow.ac.uk/wp-content/uploads/2018/07/can_comparison.csv


.. _tutorials_iscan:

***************
ISCAN Tutorials
***************

Some stuff here introducing the tutorial page.


Tutorial 1: Polysyllabic shortening
===================================


Motivation
----------

Polysyllabic shortening refers to the "same" rhymic unit (syllable or vowel) becoming shorter as the size of the containing domain (word or prosodic domain) increases. Two classic examples:

English: stick, sticky, stickiness (Lehiste, 1972)
French: pâte, pâté, pâtisserie (Grammont, 1914)

Polysyllabic shortening is often – but not always – defined as being restricted to accented syllables. (As in the English, but not the French example.) Using ISCAN, we can check whether a couple simple versions of polysyllabic shortening holds in the ICE-CAN corpus:

* Considering all utterance-final words, does the initial syllable duration decrease as word length increases?
* Considering just utterance-final words with primary stress on the initial syllable, does the initial syllable duration decrease as word length increases?

This tutorial will walk through all of the necessary steps for using ISCAN to generate and produce a CSV, ready for analysis. These steps involve

1. **Import the corpus into ISCAN**
	Result: a structured database of linguistic objects (words, phones, discourses).
2. **Enrich the database**
	Result: Further linguistic objects (utterances, syllables), and information about objects (e.g. speech rate, word frequencies).
3. **Query the database**
	Result: A set of linguistic objects of interest (e.g. utterance-final word-initial syllables),
4. **Export the results**
	Result: A CSV file containing information about the set of objects of interest


Step 1: Import
--------------

For this tutorial, we will be using the ICE-CAN corpus, which ADD INFO. The subset of this data was subset using the `Montreal Forced Aligner`_, and MORE. The result of this is one Praat TextGrid per sound file, aligned with word and phone boundaries.

The first step of this analysis is to create a *Polyglot DB* object of the corpus which is suitable for analysis. This is performed in two steps:

+ *Importing* the dataset using ISCAN, using the phone, word, and speaker information contained in the corpus
+ *Enriching* the dataset to include additional information about (e.g., syllables, utterances), as well as properties about these objects (e.g., speech rate)

To import the corpus into ISCAN, select 'ICE-CAN' corpus from the dropdown menu under the 'Corpora' tab in the navigation bar. Next, click the 'Import' button. This will import the corpus into ISCAN and return a structured database of objects: words, phones, and discourses), that will be interacted with in the following steps.


Step 2: Enrichment
------------------

Now that the corpus has been imported as a database, it is now necessary to *enrich* the database with information about linguistic objects, such as word frequency, speech rate, syllable duration, and so on. See *HERE* for more information about enrichment.

First, select the ICE-CAN under the 'Corpora' menu, which presents all of the current information available for this specific corpus. To start enrichment, click the 'create, edit, and run enrichments' button from this page. This page is referred to as the *Enrichment view*. At first, this page will contain an empty table - as enrichments are added, this table will be populated to include each of these enrichment objects. On the right hand side of the page are a list of new enrichments that can be created for this database.

Here, we will walk through each enrichment in turn necessary for examining vowel duration.

**Syllablics**

Begin by pressing the 'Phone Subset' button under the 'Create New Enrichments' header. On this page, it is possible to select subsets of phones to be enriched in the database. For this particular example, we are interested in syllables, collecting information about syllabic phones is necessary. With this, select the 'Select Syllabics' preset option, name the enrichment 'syllabics', and finally click 'Save subset'. This will return you to the Enrichment view page. Here, press the 'Run' button listed under 'Actions'.

**Speakers**

To enrich the database with speaker information, select the 'Properties from a CSV' option. Here local files can be uploaded and used to add properties like speaker or word information. Add the name 'speaker info' and select 'Speaker CSV' from the 'Analysis' dropdown menu. For the CSV, upload the ICE-CAN 'speaker_info.csv' file from your local machine. Normally this file would be available from the SPADE Git repository; for this tutorial, however, the CSV is available `here`_. As with the syllabics case, click 'Save Enrichment', and then 'Run' from the Enrichment view.

**Lexicon**

As with the speaker information, lexical information can be uploaded in an analogous way. Using the `Lexicon CSV`_, select 'Lexicon CSV' from the dropdown menu, save the enrichment, and run it.

**Utterances**

For our purposes, we define an utterance as a stretch of speech separated by pauses. So now we will specify minimum duration of pause that separates utterances (150ms is typically a good default). From the Enrichment View, under the ‘Annotation levels’ header, select ‘utterances’. From here, name the new addition ‘utterance’ and type 150 in the box next to ‘Utterance gap(ms)’, then hit ‘Save enrichment’ and ‘Run’ in the Enrichment view.

**Syllables**

Again under the ‘Annotation levels’ header, press the ‘Syllables’ button. Similar to the last two, simply name the new enrichment ‘Syllables’, select *Max Onset* from the Algorithm dropdown menu, and Syllabics from the Phone Subset menu, and then hit ‘Save enrichment’. As usual, upon return to the Enrichment view, hit ‘Run’ on the new addition to the table.

**Speech rate**

To encode speech rate information, select 'Hierarchical property' from the Enrichment view. This mode allows you to encode rates, counts or positions, based on certain hierarchical properties (e.g., utterances, words). Here select the following attributes:

1. From the Higher annotation menu, select *utterance*
2. From the Lower annotation menu, select *syllable*
3. From the Property type menu, select *rate*

And then, as with previous enrichments, select 'Save enrichment' and then run.

**Stress**

Finally, to encode the stress position within each word, select 'Stress from word property' from the Enrichment view menu. From the 'wordproperty' dropdown box, select 'stresspattern'. As usual, select 'Save enrichment' and run the enrichment in the Enrichment view.


Step 3: Query profile
---------------------

Now that the database has been enriched with all of the properties necessary for analysis, it is not necessary to construct a **query**. Queries enable us to search the database for particular set of linguistic objects of interest.

First, return to the Corpus Summary view by selecting 'spade-ICECAN' from the top navigation header. In this view, there is a series of property categories which you can navigate through to add filters to your search.

In this case, we want to make a query for:

* Word-initial syllables
* only in words at the end of utterances (fixed prosodic position)

Here, find the selection titled 'Syllables' and select 'New Query'. To make sure we select the correctly positioned syllables, apply the following filters:

Under syllable properties:

Left aligned with: *word*
Right aligned with: *utterance*

Provide a name for this query (e.g., 'syllable_duration') and select 'Save and run query'.

Step 4: Export profile
---------------------

This query has found all word-initial stressed syllables for words in utterance-final position. We now want to export information about these linguistic objects to a CSV file. We want it to contain everything we need to examine how syllable duration (in seconds) depends on word length. Here we may check all boxes which will be relevant to our later analysis to add these columns to our CSV file. The preview at the bottom of the page will be updated as we select new boxes:

1. Under the **SYLLABLE** label, select:
	* label
	* duration

2. Under the **WORD** label, select:
	* label
	* begin
	* end
	* num_syllables
	* stresspattern

3. Under the **UTTERANCE** label, select:
	* label

4. Under the **SPEAKER** label, select:
	* label

Once you have checked all relevant boxes, select ‘Export to CSV’. Your results will be exported to a CSV file on your computer. The name will be the one you chose to save plus “export.csv”. In our case, the resulting file will be called “syllable_duration export.csv”.