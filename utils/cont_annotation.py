import os
import csv

import sys
PGDB_REPO_PATH = r'D:\Dev\GitHub\PolyglotDB'
AS_REPO_PATH = r'D:\Dev\GitHub\python-acoustic-similarity'

sys.path.insert(0, AS_REPO_PATH)
sys.path.insert(0, PGDB_REPO_PATH)

from polyglotdb import CorpusContext
from polyglotdb.config import CorpusConfig

name = 'cont'

config = CorpusConfig(name, **graph_db)

out_path = r'D:\Data\Cont\annotations.csv'

in_path = r'D:\Dropbox\cont\contour_responses_Fix.txt'

discourse_info_path = r'D:\Data\Cont\discourse.txt'
speaker_info_path = r'D:\Data\Cont\speaker.txt'

speaker_data = {}

discourse_data = {}

tunes = ["fall","fall with upstep","risefallrise","contradiction","inredulity",
        "yesnoRise","continuation","otherContour","unclear","problematic"]
prominences = ["subject","verb","object","unclear"]

with CorpusContext(config) as c:
    q = c.query_graph(c.utterance).columns(c.utterance.id.column_name('id'), c.utterance.discourse.name.column_name('discourse'))
    utterances = q.all()

with open(in_path, 'r') as f, open(out_path, 'w', newline='') as outf:
    reader = csv.DictReader(f, delimiter='\t')
    reader = csv.DictReader(f, ['id',])
    for line in reader:
        print(line)
        discourse = os.path.splitext(line['recordedFile'])[0]
        gender = line['Gender']
        amanda_tune = line['Amanda_tune']
        amanda_prominence = line['Amanda_prominence']
        michael_tune = line['Michael_tune']
        michael_prominence = line['Michael_prominence']
        dan_tune = line['Dan_tune']
        dan_prominence = line['Dan_prominence']
        item = line['item']
        condition = line['condition']
        participant = 'contour_' + line['participant']
        country = line['Country']
        province = line['Province']
        contour = line['Contour']
        context = line['Context']
        born = line['Born']

        if discourse not in discourse_data:
            discourse_data[discourse] = {'item':item, 'condition': condition,
                                        'contour': contour, 'context': context}
        if participant not in speaker_data:
            speaker_data[participant] = {'gender': gender, 'country': country,
                                        'province':province, 'born': born}

with open(discourse_info_path, 'w', newline='') as f:
    writer = csv.DictWriter(f, ['discourse', 'item', 'condition', 'contour', 'context'])
    writer.writeheader()
    for k, v in discourse_data.items():
        v['discourse'] = k
        writer.writerow(v)

with open(speaker_info_path, 'w', newline='') as f:
    writer = csv.DictWriter(f, ['speaker', 'gender', 'country', 'province', 'born'])
    writer.writeheader()
    for k, v in speaker_data.items():
        v['speaker'] = k
        writer.writerow(v)
