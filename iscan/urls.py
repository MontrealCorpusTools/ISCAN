from django.conf.urls import url, include
from django.conf import settings
from rest_framework_nested import routers
from . import api
from . import views

import logging
log = logging.getLogger(__name__)

app_name = 'iscan'
api_router = routers.SimpleRouter()
api_router.register(r'databases', api.DatabaseViewSet, basename='databases')
api_router.register(r'corpora', api.CorpusViewSet, basename='corpora')
api_router.register(r'users', api.UserViewSet, basename='users')
api_router.register(r'roles', api.RoleChoiceViewSet, basename='roles')
api_router.register(r'apps', api.AppViewSet, basename='apps')
api_router.register(r'tasks', api.TaskViewSet, basename='tasks')
api_router.register(r'source_directories', api.SourceChoiceViewSet, basename='source_directories')
corpora_router = routers.NestedSimpleRouter(api_router, r'corpora', lookup='corpus')
corpora_router.register(r'query', api.QueryViewSet, basename='corpus-query')
corpora_router.register(r'enrichment', api.EnrichmentViewSet, basename='corpus-enrichment')
corpora_router.register(r'annotations', api.AnnotationViewSet, basename='corpus-annotations')
corpora_router.register(r'subannotations', api.SubannotationViewSet, basename='corpus-subannotations')
corpora_router.register(r'discourses', api.DiscourseViewSet, basename='corpus-discourses')
corpora_router.register(r'speakers', api.SpeakerViewSet, basename='corpus-speakers')

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^api/rest-auth/', include('rest_auth.urls')),
    url(r'^api/rest-auth/registration/', include('rest_auth.registration.urls')),
    url(r'^api/(?P<corpus>\w+)/save/pitch/(?P<utterance_id>[-\w]+)/$', views.save_pitch_track, name='save_pitch'),
    url(r'^api/(?P<corpus>\d+)/export_pitch/$', views.export_pitch_tracks, name='export_pitch'),
    url('^api/', include(api_router.urls)),
    url('^api/', include(corpora_router.urls)),

]

if 'iscan.intonation' in settings.INSTALLED_APPS:
    urlpatterns += [url('^intonation/', include('iscan.intonation.urls'))]
