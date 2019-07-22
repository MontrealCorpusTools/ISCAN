from celery import shared_task, current_task
from celery.app.task import Task
from .models import Corpus, Query, Enrichment, BackgroundTask

import logging

log = logging.getLogger(__name__)


class LoggingTask(Task):
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        kwargs = {}
        task = BackgroundTask.objects.get(pk=task_id)
        task.running = False
        task.failed = True
        task.save()
        if log.isEnabledFor(logging.INFO):
            kwargs['exc_info'] = exc
        log.error('Task % failed to execute', task_id, **kwargs)
        super().on_failure(exc, task_id, args, kwargs, einfo)

@shared_task
def import_corpus_task(corpus_pk):
    corpus = Corpus.objects.get(pk=corpus_pk)
    task = BackgroundTask.objects.create(task_id=current_task.request.id,
        corpus = corpus,
        name = "Import corpus {}".format(corpus.name)
        )
    corpus.import_corpus()
    task.running = False
    task.save()


@shared_task
def run_query_task(query_id):
    query = Query.objects.get(pk=query_id)
    task = BackgroundTask.objects.create(task_id=current_task.request.id,
        corpus = query.corpus,
        name = "Run query {}".format(query.name)
        )
    query.run_query()
    task.running = False
    task.save()


@shared_task
def run_query_export_task(query_id):
    query = Query.objects.get(pk=query_id)
    task = BackgroundTask.objects.create(task_id=current_task.request.id,
        corpus = query.corpus,
        name = "Export query {}".format(query.name)
        )
    query.export_query()
    task.running = False
    task.save()

@shared_task
def run_query_generate_subset_task(query_id):
    query = Query.objects.get(pk=query_id)
    task = BackgroundTask.objects.create(task_id=current_task.request.id,
        corpus = query.corpus,
        name = "Generate query {} subset".format(query.name)
        )
    query.generate_subset()
    task.running = False
    task.save()

@shared_task
def run_enrichment_task(enrichment_id):
    enrichment = Enrichment.objects.get(pk=enrichment_id)
    task = BackgroundTask.objects.create(task_id=current_task.request.id,
        corpus = enrichment.corpus,
        name = "Run enrichment {}".format(enrichment.name)
        )
    enrichment.run_enrichment()
    task.running = False
    task.save()


@shared_task
def reset_enrichment_task(enrichment_id):
    enrichment = Enrichment.objects.get(pk=enrichment_id)
    task = BackgroundTask.objects.create(task_id=current_task.request.id,
        corpus = enrichment.corpus,
        name = "Reset enrichment {}".format(enrichment.name)
        )
    enrichment.reset_enrichment()
    task.running = False
    task.save()


@shared_task
def delete_enrichment_task(enrichment_id):
    enrichment = Enrichment.objects.get(pk=enrichment_id)
    task = BackgroundTask.objects.create(task_id=current_task.request.id,
        corpus = enrichment.corpus,
        name = "Delete enrichment {}".format(enrichment.name)
        )
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
    task.running = False
    task.save()
