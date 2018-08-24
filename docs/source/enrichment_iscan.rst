.. _enrichment_iscan:

****************
Enrichment View
****************

Databases can be enriched by encoding various elements. Usually, the database starts off with just words and phones, but by adding enrichments a diverse range of information will become available to the user for searching with the Query View later. All enrichments are added in the Enrichment View. Here are some details about this View.

#. **Actions** Once an enrichment has been saved, a number of possible actions will become available for it. The actions buttons are available as a column in the table visible at the top of the Enrichment View

   #. *Run* If the enrichment is runnable, the user may run it to apply this enrichment to the corpus
   #. *Reset* The user may reset an enrichment to remove changes added to the corpus by running that enrichment. The state of the database will be as it was before running this enrichment
   #. *Edit* The user may make changes to the saved enrichment. For the changes to be applied to the corpus, hit *Run* again after editing
   #. *Delete* This has the same effect as *Reset* but also removes this enrichment from the Enrichment View. To re-run a deleted enrichment, the user must start over and create a new enrichment
     
#. **Phone subset** Here the user may encode a subset of phones, such as vowels, stops, or sibilants, by selecting from the table which phone labels to include. All phones belonging to this subset will be labeled as such in the corpus

#. **Hierarchical property** This section allows the user to encode properties involving two levels, such as number of syllables in each utterance, or rate of syllables per second

   #. *Higher annotation* Upper level property in hierarchy 
   #. *Lower annotation* Lower level property in hierarchy
   #. *Property type* target property such as rate, count, or position


   *Example*:
   To encode the number of phones per word, set *Higher annotation* to **word**, *Lower annotation* to **phones**, and *Property type* to **count**.

#. **Stress from word property** Enriches syllables with stress information ('stressed' or 'unstressed', coded as '1' or '0') via a listing for each *word* in the lexical enrichment CSV

#. **Properties from a CSV** Here the user can import information to the corpus using CSV files saved locally

   #. *Lexicon CSV* Allows the user to assign certain properties to specific words using a CSV file. For example the user might want to encode word frequency. This can be done by having words in one column and corresponding frequencies in the other column of a column-delimited text file.
   #. *Speaker CSV* Allows the user to enrich speakers with information by adding speaker metadata, such as sex and age, from a CSV
   #. *Phone CSV* Allows the user to add certain helpful features to phonological properties. For example, adding 'fricative' to 'manner_of_articulation' for some phones
   #. *Sound File CSV* Sound file properties may include notes about noise, recording environment, etc. Not relevant for ISCAN
   
   
#. **Acoustics** Here the user may encode pitch, formants, intensity, FAVE-style point formants, and more into the corpus. Custom praat scripts may be imported here to perform other types of analyses 

#. **Pauses** This allows the user to specify for a given database what segments should count as pauses instead of speech. These are typically among the most common words in a corpus, so top 25 words are provided (25 word default may be changed). If not found, custom pause labels may also be entered in the search bar

#. **Utterances** Define utterances here as segments of speech separated by a gap of a specified length (typically between .15-.5 seconds)

#. **Syllables** If the user has encoded syllabic segments, syllables can now be encoded using a syllabification algorithm (e.g. maximum attested onset)


