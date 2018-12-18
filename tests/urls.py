
from django.conf.urls import url

from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
                  path('', include('iscan.urls')),
                  path('intonation/', include('iscan.intonation.urls')),
                  path('annotator/', include('iscan.annotator.urls')),
              ] + static('/static/', document_root=settings.STATIC_ROOT)