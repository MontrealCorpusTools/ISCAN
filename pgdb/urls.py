from django.conf.urls import url, include
from rest_framework_nested import routers
from rest_framework.authtoken.views import obtain_auth_token
from . import api
from . import views


app_name = 'pgdb'
api_router = routers.SimpleRouter()
api_router.register(r'databases', api.DatabaseViewSet, base_name='databases')
api_router.register(r'corpora', api.CorpusViewSet, base_name='corpora')
api_router.register(r'source_directories', api.SourceChoiceViewSet, base_name='source_directories')
corpora_router = routers.NestedSimpleRouter(api_router, r'corpora', lookup='corpus')
corpora_router.register(r'query', api.QueryViewSet, base_name='corpus-query')
corpora_router.register(r'enrichment', api.EnrichmentViewSet, base_name='corpus-enrichment')
corpora_router.register(r'annotations', api.AnnotationViewSet, base_name='corpus-annotations')
corpora_router.register(r'subannotations', api.SubannotationViewSet, base_name='corpus-subannotations')
corpora_router.register(r'bestiary-utterances', api.BestiaryViewSet, base_name='bestiary-utterances')
corpora_router.register(r'discourses', api.DiscourseViewSet, base_name='corpus-discourses')
corpora_router.register(r'speakers', api.SpeakerViewSet, base_name='corpus-speakers')
#api_router.register(r'corpora', api.CorpusViewSet, base_name='corpora')

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^api/api-token-auth/', obtain_auth_token),
    url(r'^api/api-auth/', views.AuthView.as_view()),
    url(r'^api/check-auth/', views.CheckAuthView.as_view()),
    url(r'^api/(?P<corpus>\w+)/save/pitch/(?P<utterance_id>[-\w]+)/$', views.save_pitch_track, name='save_pitch'),
    url(r'^api/(?P<corpus>\d+)/export_pitch/$', views.export_pitch_tracks, name='export_pitch'),
    url('^api/', include(api_router.urls)),
    url('^api/', include(corpora_router.urls)),

]
