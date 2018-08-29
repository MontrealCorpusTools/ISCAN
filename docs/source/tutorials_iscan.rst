.. _`Montreal Forced Aligner`: https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner
.. _`here`: http://spade.glasgow.ac.uk/wp-content/uploads/2018/07/speaker_info.csv
.. _`Lexicon CSV`: http://spade.glasgow.ac.uk/wp-content/uploads/2018/07/can_comparison.csv
.. _`Enrichment`: https://polyglot-server.readthedocs.io/en/latest/enrichment_iscan.html
.. _`Enriching`: https://polyglot-server.readthedocs.io/en/latest/enrichment_iscan.html


.. _tutorials_iscan:

***************
ISCAN Tutorials
***************

The ISCAN system is a system for going from a raw speech corpus to a data file (CSV) ready for further analysis (e.g. in R), which conceptually consists of a pipeline of four steps:

1. **Importing the corpus into ISCAN**
	Result: a structured database of linguistic objects (words, phones, sound files).
2. **`Enriching`_ the database**
	Result: Further linguistic objects (utterances, syllables), and information about objects (e.g. speech rate, word frequencies).
3. **Querying the database**
	Result: A set of linguistic objects of interest (e.g. utterance-final word-initial syllables),
4. **Exporting the results**
	Result: A CSV file containing information about the set of objects of interest


Preliminaries
=============


Access
------

Before you can begin the tutorial, you will need access to log in to the ISCAN server via your web browser. To use ISCAN you need to get a username and password from whoever the administrator for the server is. For now, the only ISCAN server is at McGill, so the first step is to contact Vanna (On Slack in the #iscan-help channel or email to savanna.willerton@mail.mcgill.ca) to request access, who will provide you with a username and password.

To log in to the McGill ISCAN server via your web browser visit https://roquefort.linguistics.mcgill.ca, press the ‘Log in’ button on the top right of the screen and enter the username and password provided by Vanna.


Questions, Bugs, Suggestions
----------------------------

If at any point while using ISCAN you get stuck, have a question, encounter a bug (like a button which doesn’t work), or you see some way in which you believe the user interface could be improved to make usage more clear/smooth/straightforward/etc, then please see ISCAN – Getting Help and Giving Feedback (link TODO).


Tutorial 1: Polysyllabic shortening
===================================


Motivation
----------

Polysyllabic shortening refers to the "same" rhymic unit (syllable or vowel) becoming shorter as the size of the containing domain (word or prosodic domain) increases. Two classic examples:

* English: stick, sticky, stickiness (Lehiste, 1972)
* French: pâte, pâté, pâtisserie (Grammont, 1914)

Polysyllabic shortening is often – but not always – defined as being restricted to accented syllables. (As in the English, but not the French example.) Using ISCAN, we can check whether a simple version of polysyllabic shortening holds in the ICE-CAN corpus, namely:

* Considering all utterance-final words, does the initial vowel duration decrease as word length increases?


Step 1: Import
--------------

This tutorial will use the tutorial corpus available for you, available under the title 'spade-username'. The data for this corpus was parsed using the `Montreal Forced Aligner`_, with the result being one Praat TextGrid per sound file, aligned with word and phone boundaries. These files are stored on a remote server, and so do not require you to upload any audio or TextGrid files.

The first step of this analysis is to create a *Polyglot DB* object of the corpus which is suitable for analysis. This is performed in two steps:

+ *Importing* the dataset using ISCAN, using the phone, word, and speaker information contained in the corpus
+ *Enriching* the dataset to include additional information about (e.g., syllables, utterances), as well as properties about these objects (e.g., speech rate)

To import the corpus into ISCAN, select 'spade-username' corpus from the dropdown menu under the 'Corpora' tab in the navigation bar. Next, click the 'Import' button. This will import the corpus into ISCAN and return a structured database of objects: words, phones, and sound files), that will be interacted with in the following steps.


Step 2: Enrichment
------------------

Now that the corpus has been imported as a database, it is now necessary to *enrich* the database with information about linguistic objects, such as word frequency, speech rate, vowel duration, and so on. See the `Enrichment`_ page for more details

First, select the 'tutorial-username' under the 'Corpora' menu, which presents all of the current information available for this specific corpus. To start enrichment, click the 'create, edit, and run enrichments' button from this page. This page is referred to as the *Enrichment view*. At first, this page will contain an empty table - as enrichments are added, this table will be populated to include each of these enrichment objects. On the right hand side of the page are a list of new enrichments that can be created for this database.

Here, we will walk through each enrichment in turn necessary for examining vowel duration.


**Syllables**

Syllables are encoded in two steps. First, the set of syllabic segments in the phonological inventory have to be specified. To encode the syllablic segments:

1. Select 'Phone Subset' button under the 'Create New Enrichments' header
2. Select the 'Select Syllabics' preset option
3. Name the environment 'syllabics'
4. Select 'Save subset'

This will return you to the Enrichment view page. Here, press the 'Run' button listed under 'Actions'. Once syllabic segments have been encoded as such, you can encode the syllables themselves.

1. Under the ‘Annotation levels’ header, press the ‘Syllables’ button
2. Select *Max Onset* from the Algorithm dropdown menu
3. Select *syllabics* from the Phone Subset menu
4. Name the enrichment 'syllables'
5. Select 'Save enrichment'

Upon return to the Enrichment view, hit ‘Run’ on the new addition to the table.

**Speakers**

To enrich the database with speaker information:

1. Select the 'Properties from a CSV' option
2. Select 'Speaker CSV' from the 'Analysis' dropdown menu. Normally this file would be available from the SPADE Git repository; for this tutorial, however, the CSV is available `here`_. 
3. Upload the ICE-CAN 'speaker_info.csv' file from your local machine.
4. Add the name 'speaker info'
5. Select 'Save Enrichment' and then 'Run' from the Enrichment view.


**Lexicon**

As with the speaker information, lexical information can be uploaded in an analogous way. Using the `Lexicon CSV`_, select 'Lexicon CSV' from the dropdown menu, save the enrichment, and run it.

**Utterances**

For our purposes, we define an utterance as a stretch of speech separated by pauses. So now we will specify minimum duration of pause that separates utterances (150ms is typically a good default).


1. Under the ‘Annotation levels’ header, select ‘utterances’.
2. Name the new addition ‘utterance’
3. Enter *150* in the box next to ‘Utterance gap(ms)’
4. Select ‘Save enrichment’, and then ‘Run’ in the Enrichment view.


**Speech rate**

To encode speech rate information, select 'Hierarchical property' from the Enrichment view. This mode allows you to encode rates, counts or positions, based on certain hierarchical properties (e.g., utterances, words). Here select the following attributes:

1. From the Higher annotation menu, select *utterance*
2. From the Lower annotation menu, select *syllable*
3. From the Property type menu, select *rate*

And then, as with previous enrichments, select 'Save enrichment' and then run.

**Stress**

Finally, to encode the stress position within each word:

* Select 'Stress from word property' from the Enrichment view menu. 
* From the 'wordproperty' dropdown box, select 'stresspattern'.
* Select 'Save enrichment' and run the enrichment in the Enrichment view.


Step 3: Query
---------------------

Now that the database has been enriched with all of the properties necessary for analysis, it is not necessary to construct a **query**. Queries enable us to search the database for particular set of linguistic objects of interest.

First, return to the Corpus Summary view by selecting 'tutorial-username' from the top navigation header. In this view, there is a series of property categories which you can navigate through to add filters to your search.

In this case, we want to make a query for:

* Word-initial syllables
* only in words at the end of utterances (fixed prosodic position)

Here, find the selection titled 'Syllables' and select 'New Query'. To make sure we select the correctly positioned syllables, apply the following filters:

Under **syllable** properties:

* Left aligned with: *word*
* Select 'add' filter, select 'stress' in the drop-down box, and enter '1' in the text box

Under **word** properties:

* Right aligned with: *utterance*

Provide a name for this query (e.g., 'syllable_duration') and select 'Save and run query'.

Step 4: Export
---------------------

This query has found all word-initial stressed syllables for words in utterance-final position. We now want to export information about these linguistic objects to a CSV file. We want it to contain everything we need to examine how vowel duration (in seconds) depends on word length. Here we may check all boxes which will be relevant to our later analysis to add these columns to our CSV file. The preview at the bottom of the page will be updated as we select new boxes:

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
	* name

Once you have checked all relevant boxes, select 'Export to CSV'. Your results will be exported to a CSV file on your computer. The name will be the one you chose to save plus "export.csv". In our case, the resulting file will be called "syllable_duration export.csv".


Examining & analysing the data
------------------------------

In **R**, load the data as follows:

.. code-block:: R

	library(tidyverse)
	df <- read.csv('syllable_duration export.csv')

First, by checking how many words there are for each number of syllables in the CSV, we can see that only 1 word has 5 syllables:

.. code-block:: R
	group_by(df, word_num_syllables) %>% summarise(n_distinct(word_label))

	#   word_num_syllables `n_distinct(word_label)`
	#                <int>                    <int>
	# 1                  1                      236
	# 2                  2                      119
	# 3                  3                       35
	# 4                  4                        9
	# 5                  5                        1

And so the word with 5 syllables should be removed:

.. code-block:: R

	df <- filter(df, word_num_syllables < 5)

Similarly, it is worth checking the distribution of syllable durations to see if there are any extreme values:

.. code-block:: R

	ggplot(df, aes(x = syllable_duration)) + 
	geom_histogram() +
	xlab("Syllable duration")

.. image:: images/syll_hist_plot.png
	:width: 400

As we can see here, there are a handful of extremely long syllables, which perhaps are the result of pragmatic lengthening or alignment error. To exclude these cases from analysis:

.. code-block:: R

	df <- filter(df, syllable_duration < 1.5)

Plot of the duration of the initial stressed syllable as a function of word duration (in syllables):

.. code-block:: R

	ggplot(df, aes(x = factor(word_num_syllables), y = syllable_duration)) +
	geom_boxplot() +
	xlab("Duration of word-initial syllable") + ylab("Syllable duration") +
	scale_y_sqrt()

.. image:: images/syll_dur_plot.png
	:width: 400

Here it's possible to see some polysyllabic shortening effect between 1 and 2 syllables; this effect seems much smaller between 2+ syllables, though the effect continues in the expected (negative) direction.