from celery import shared_task

from .models import Corpus, Query, Enrichment


@shared_task
def import_corpus_task(corpus_pk):
    corpus = Corpus.objects.get(pk=corpus_pk)
    corpus.import_corpus()

@shared_task
def run_query_task(query_id):
    query = Query.objects.get(pk=query_id)
    query.run_query()


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
		enrichment.reset_enrichment()
	except:
		print("No resetting needed.")
	# Then properly delete
	print("Deleting enrichment...")
	enrichment.delete()