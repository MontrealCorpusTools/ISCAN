from django.conf.urls import url, include
from rest_framework_nested import routers
from . import api
from . import views

app_name = 'pgdb'
api_router = routers.SimpleRouter()
api_router.register(r'databases', api.DatabaseViewSet, base_name='databases')
api_router.register(r'corpora', api.CorpusViewSet, base_name='corpora')
api_router.register(r'source_directories', api.SourceChoiceViewSet, base_name='source_directories')
corpora_router = routers.NestedSimpleRouter(api_router, r'corpora', lookup='corpus')
corpora_router.register(r'utterances', api.UtteranceViewSet, base_name='corpus-utterances')
corpora_router.register(r'discourses', api.DiscourseViewSet, base_name='corpus-discourses')
#api_router.register(r'corpora', api.CorpusViewSet, base_name='corpora')

urlpatterns = [
    url(r'^$', views.index, name='index'),

    url('^api/', include(api_router.urls)),
    url('^api/', include(corpora_router.urls)),
]
