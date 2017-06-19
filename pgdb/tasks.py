from celery import shared_task

from .models import Corpus


@shared_task
def import_corpus_task(corpus_pk):
    corpus = Corpus.objects.get(pk=corpus_pk)
    corpus.import_corpus()


@shared_task
def enrich_corpus_task(corpus_pk, enrichment_config):
    corpus = Corpus.objects.get(pk=corpus_pk)
    corpus.enrich_corpus(enrichment_config)


@shared_task
def query_corpus_task(corpus_pk, query_config):
    corpus = Corpus.objects.get(pk=corpus_pk)
    return corpus.query_corpus(query_config)