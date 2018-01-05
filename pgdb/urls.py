from django.conf.urls import url, include
from rest_framework import routers
from . import api
from . import views

app_name = 'pgdb'
api_router = routers.DefaultRouter()
api_router.register(r'databases', api.DatabaseViewSet, base_name='databases')
api_router.register(r'corpora', api.CorpusViewSet, base_name='corpora')

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url('^api/', include(api_router.urls)),
]
