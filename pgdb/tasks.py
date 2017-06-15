from celery import shared_task

from polyglotdb import CorpusContext
import polyglotdb.io as pgio
from .models import Corpus


@shared_task
def import_corpus_task(corpus_pk):
    corpus = Corpus.objects.get(pk=corpus_pk)
    with CorpusContext(corpus.config) as c:
        c.reset()
        if corpus.input_format == 'B':
            parser = pgio.inspect_buckeye(corpus.source_directory)
        elif corpus.input_format == 'F':
            parser = pgio.inspect_fave(corpus.source_directory)
        elif corpus.input_format == 'M':
            parser = pgio.inspect_mfa(corpus.source_directory)
        elif corpus.input_format == 'L':
            parser = pgio.inspect_labbcat(corpus.source_directory)
        elif corpus.input_format == 'T':
            parser = pgio.inspect_timit(corpus.source_directory)
        elif corpus.input_format == 'P':
            parser = pgio.inspect_partitur(corpus.source_directory)
        else:
            return False
        c.load(parser, corpus.source_directory)
    corpus.status = 'I'
    corpus.save()
