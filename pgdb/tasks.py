from celery import shared_task
from celery.app.task import Task
from .models import Corpus, Query, Enrichment

import logging

log = logging.getLogger(__name__)


class LoggingTask(Task):
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        kwargs = {}
        if log.isEnabledFor(logging.INFO):
            kwargs['exc_info'] = exc
        log.error('Task % failed to execute', task_id, **kwargs)
        super().on_failure(exc, task_id, args, kwargs, einfo)


@shared_task
def import_corpus_task(corpus_pk):
    corpus = Corpus.objects.get(pk=corpus_pk)
    corpus.import_corpus()


@shared_task
def run_query_task(query_id):
    query = Query.objects.get(pk=query_id)
    query.run_query()


@shared_task
def run_query_export_task(query_id):
    query = Query.objects.get(pk=query_id)
    query.export_query()

@shared_task
def run_query_generate_subset_task(query_id):
    query = Query.objects.get(pk=query_id)
    query.generate_subset()

@shared_task
def run_enrichment_task(enrichment_id):
    enrichment = Enrichment.objects.get(pk=enrichment_id)
    enrichment.run_enrichment()


@shared_task
def reset_enrichment_task(enrichment_id):
    enrichment = Enrichment.objects.get(pk=enrichment_id)
    enrichment.reset_enrichment()


@shared_task
def delete_enrichment_task(enrichment_id):
    enrichment = Enrichment.objects.get(pk=enrichment_id)
    # First reset, to "de-encode", if it has been run
    try:
        print("Resetting enrichment to remove encoding...")
        if enrichment.completed:
            enrichment.reset_enrichment()
    except:
        print("No resetting needed.")
        enrichment.corpus.busy = False
    # Then properly delete
    print("Deleting enrichment...")
    enrichment.delete()
