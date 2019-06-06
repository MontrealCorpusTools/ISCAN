from django.conf.urls import url, include
from rest_framework_nested import routers
from . import api


app_name = 'annotator'
api_router = routers.SimpleRouter()
api_router.register(r'annotations', api.AnnotationViewSet, basename='annotations')


urlpatterns = [
    url('^api/', include(api_router.urls)),
]