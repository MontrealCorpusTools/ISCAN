import sys

PGDB_REPO_PATH = r'/mnt/d/Dev/GitHub/PolyglotDB'
AS_REPO_PATH = r'/mnt/d/Dev/GitHub/python-acoustic-similarity'

sys.path.insert(0, AS_REPO_PATH)
sys.path.insert(0, PGDB_REPO_PATH)
import time
from polyglotdb import CorpusContext
from polyglotdb.config import CorpusConfig


graph_db = {
    'host': 'localhost',
    'acoustic_http_port': 8200,
    'graph_http_port': 7200,
    'graph_bolt_port': 7202}

name = 'cont'

config = CorpusConfig(name, data_dir='/mnt/d/bestiary-data/bestiary',**graph_db)
config.pitch_source = 'reaper'
config.pitch_algorithm = 'base'
config.formant_source = 'praat'
config.intensity_source = 'praat'

with CorpusContext(config) as c:
    begin = time.time()
    results = c.execute_cypher('''MATCH
            path = (c:Corpus)<-[:contained_by*]-(n)-[:is_a]->(nt),
            (c)-[:spoken_by]->(s:Speaker),
            (c)-[:spoken_in]->(d:Discourse)
            where c.name = {corpus_name}
            WITH n, nt, path, s, d
            OPTIONAL MATCH (n)<-[:annotates]-(subs)
            return n,nt, path, collect(subs) as subs, s, d
            order by size(nodes(path))''', corpus_name=c.corpus_name)
    for r in results:
        print(r)
    print('done query', time.time()-begin)
    discourse = 'contour_1543_1_1'
    begin = time.time()
    fname = c.get_discourse_sound_file(discourse, "consonant")
    print(time.time()-begin)
