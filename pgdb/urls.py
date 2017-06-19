from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^api/database/$', views.create_database, name='create_database_api'),
    url(r'^api/start/$', views.start_database, name='start_database_api'),
    url(r'^api/stop/$', views.stop_database, name='stop_database_api'),
    url(r'^api/corpus_status/$', views.get_corpus_status, name='corpus_status_api'),
    url(r'^api/corpus_status/(?P<name>\w+)/$', views.get_corpus_status, name='corpus_status_api'),

    url(r'^api/corpus/$', views.corpus_api, name='corpus_api'),
    url(r'^api/database/(?P<name>\w+)/$', views.database_api, name='database_api'),
    url(r'^api/corpus/(?P<name>\w+)/$', views.corpus_api, name='corpus_api'),
    url(r'^api/import_corpus/$', views.import_corpus_api, name='import_corpus_api'),
    url(r'^api/source_directories/$', views.get_source_choices_api, name='source_choices'),

    url(r'^api/corpus/(?P<name>\w+)/hierarchy/$', views.corpus_hierarchy_api, name='hierarchy_api'),
    url(r'^api/corpus/(?P<name>\w+)/query/$', views.corpus_query_api, name='query_api'),
    url(r'^api/corpus/(?P<name>\w+)/enrich$', views.corpus_enrichment_api, name='enrichment_api'),


    url(r'^database_status/$', views.DatabaseStatusView.as_view(), name='database_status'),
    url(r'^corpus_status/$', views.CorpusStatusView.as_view(), name='corpus_status'),
    url(r'^import_corpus/$', views.import_corpus_view, name='import_corpus'),
    url(r'^change_database_status/$', views.change_database_status, name='change_database_status'),
]
