from django.conf.urls import url, include
from rest_framework_nested import routers

from . import views
from . import api

app_name = 'intonation'
api_router = routers.SimpleRouter()
api_router.register(r'corpora', api.BestiaryCorpusViewSet, base_name='corpora')
urlpatterns = [
    url('^api/', include(api_router.urls)),
]