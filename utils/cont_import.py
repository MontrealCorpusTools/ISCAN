import sys

PGDB_REPO_PATH = r'/mnt/d/Dev/GitHub/PolyglotDB'
AS_REPO_PATH = r'/mnt/d/Dev/GitHub/python-acoustic-similarity'

sys.path.insert(0, AS_REPO_PATH)
sys.path.insert(0, PGDB_REPO_PATH)
import os
import time
import logging

import polyglotdb.io as pgio

from polyglotdb import CorpusContext
from polyglotdb.config import CorpusConfig

from polyglotdb.io.enrichment import enrich_discourses_from_csv, enrich_speakers_from_csv

graph_db = {
    'host': 'localhost',
    'acoustic_http_port': 8200,
    'graph_http_port': 7200,
    'graph_bolt_port': 7202}

data_dir = '/mnt/d/Data/PolyglotData/cont'

discourse_info_path = r'/mnt/d/Data/Cont/discourse.txt'
speaker_info_path = r'/mnt/d/Data/Cont/speaker.txt'

name = 'cont'

config = CorpusConfig(name, data_dir='/mnt/d/bestiary-data/bestiary',**graph_db)
config.pitch_source = 'reaper'
config.pitch_algorithm = 'base'
config.formant_source = 'praat'
config.intensity_source = 'praat'

fileh = logging.FileHandler('loading.log', 'a')
logger = logging.getLogger('cont')
logger.setLevel(logging.DEBUG)
logger.addHandler(fileh)

syllabics = ['AA1', 'AE1', 'IY1', 'IH1', 'EY1', 'EH1', 'AH1', 'AO1',
             'AW1', 'AY1', 'OW1', 'OY1', 'UH1', 'UW1', 'ER1',
             'AA2', 'AE2', 'IY2', 'IH2', 'EY2', 'EH2', 'AH2', 'AO2',
             'AW2', 'AY2', 'OW2', 'OY2', 'UH2', 'UW2', 'ER2',
             'AA0', 'AE0', 'IY0', 'IH0', 'EY0', 'EH0', 'AH0', 'AO0',
             'AW0', 'AY0', 'OW0', 'OY0', 'UH0', 'UW0', 'ER0']


def call_back(*args):
    args = [x for x in args if isinstance(x, str)]
    if args:
        print(' '.join(args))


def loading():
    print('hi')
    with CorpusContext(config) as c:
        c.reset()
        print('reset')
        parser = pgio.inspect_mfa(data_dir)
        parser.call_back = call_back
        beg = time.time()
        c.load(parser, data_dir)
        end = time.time()
        logger.info('Loading took: {}'.format(end - beg))


def enrichment():
    with CorpusContext(config) as g:
        if not 'utterance' in g.annotation_types:
            print('encoding utterances')
            begin = time.time()
            g.encode_pauses('^<SIL>$', call_back=call_back)
            g.encode_utterances(min_pause_length=10, call_back=call_back)
            # g.encode_utterances(min_pause_length = 0.5, call_back = call_back)
            logger.info('Utterance enrichment took: {}'.format(time.time() - begin))

        if not 'syllable' in g.annotation_types:
            begin = time.time()
            g.encode_syllabic_segments(syllabics)
            g.encode_syllables('maxonset', call_back=call_back)
            logger.info('Syllable enrichment took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_token_property('utterance', 'speech_rate'):
            begin = time.time()
            g.encode_rate('utterance', 'syllable', 'speech_rate')
            logger.info('Speech rate encoding took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_token_property('utterance', 'num_words'):
            begin = time.time()
            g.encode_count('utterance', 'word', 'num_words')
            logger.info('Word count encoding took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_token_property('syllable', 'position_in_word'):
            begin = time.time()
            g.encode_position('word', 'syllable', 'position_in_word')
            logger.info('Syllable position encoding took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_token_property('word', 'position_in_utterance'):
            begin = time.time()
            g.encode_position('utterance', 'word', 'position_in_utterance')
            logger.info('Utterance position encoding took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_token_property('syllable', 'num_phones'):
            begin = time.time()
            g.encode_count('syllable', 'phone', 'num_phones')
            logger.info('Phone count encoding took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_token_property('word', 'num_syllables'):
            begin = time.time()
            g.encode_count('word', 'syllable', 'num_syllables')
            logger.info('Syllable count encoding took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_speaker_property('gender'):
            begin = time.time()
            enrich_speakers_from_csv(g, speaker_info_path)
            logger.info('Speaker enrichment took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_type_property('word', 'baseline_duration'):
            begin = time.time()
            g.encode_baseline('word', 'duration', by_speaker=False)
            logger.info('Word baseline duration enrichment took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_type_property('word', 'baseline_duration_by_speaker'):
            begin = time.time()
            g.encode_baseline('word', 'duration', by_speaker=True)
            logger.info('Word baseline duration by speaker enrichment took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_type_property('syllable', 'baseline_duration'):
            begin = time.time()
            g.encode_baseline('syllable', 'duration', by_speaker=False)
            logger.info('Syllable baseline duration enrichment took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_type_property('syllable', 'baseline_duration_by_speaker'):
            begin = time.time()
            g.encode_baseline('syllable', 'duration', by_speaker=True)
            logger.info('Syllable baseline duration by speaker enrichment took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_type_property('word', 'relativized_duration'):
            begin = time.time()
            g.encode_relativized('word', 'duration', by_speaker=False)
            logger.info('Word relativized duration enrichment took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_type_property('word', 'baseline_duration_by_speaker'):
            begin = time.time()
            g.encode_relativized('word', 'duration', by_speaker=True)
            logger.info('Word relativized duration by speaker enrichment took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_type_property('syllable', 'baseline_duration'):
            begin = time.time()
            g.encode_relativized('syllable', 'duration', by_speaker=False)
            logger.info('Syllable relativized duration enrichment took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_type_property('syllable', 'baseline_duration_by_speaker'):
            begin = time.time()
            g.encode_relativized('syllable', 'duration', by_speaker=True)
            logger.info('Syllable relativized duration by speaker enrichment took: {}'.format(time.time() - begin))

        if not g.hierarchy.has_discourse_property('context'):
            enrich_discourses_from_csv(g, discourse_info_path)

        if not g.hierarchy.has_speaker_property('gender'):
            enrich_speakers_from_csv(g, speaker_info_path)

        g.refresh_hierarchy()
        g.hierarchy.add_type_properties(g, 'word', [('transcription', str)])
        g.encode_hierarchy()


def acoustics():
    print('hi')
    fileh = logging.FileHandler('acoustics.log', 'a')
    logger = logging.getLogger('three-dimensions')
    logger.setLevel(logging.DEBUG)
    logger.addHandler(fileh)
    with CorpusContext(config) as c:
        c.reset_acoustics()
        beg = time.time()
        c.analyze_pitch()
        end = time.time()
        logger.info('Pitch took: {}'.format(end - beg))

        beg = time.time()
        c.relativize_pitch()
        end = time.time()
        logger.info('Relativizing pitch took: {}'.format(end - beg))

        # beg = time.time()
        # c.analyze_acoustics(pitch=False, formants=True, intensity=False)
        # end = time.time()
        # logger.info('Formants took: {}'.format(end - beg))


#        beg = time.time()
#        c.relativize_formants()
#        end = time.time()
#        logger.info('Relativizing formants took: {}'.format(end - beg))

#        beg = time.time()
#        c.analyze_acoustics(pitch=False, formants=False, intensity=True)
#        end = time.time()
#        logger.info('Intensity took: {}'.format(end - beg))

#        beg = time.time()
#        c.relativize_intensity()
#        end = time.time()
#        logger.info('Relativizing intensity took: {}'.format(end - beg))

if __name__ == '__main__':
    logger.info('Begin processing: {}'.format(name))
    print('hello')
    loading()
    enrichment()
    acoustics()
