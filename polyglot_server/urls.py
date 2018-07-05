"""polyglot_server URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url
from django.contrib import admin
#from polyglot_server.apps.runit.views import RunItView

"""urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^$', RunItView.as_view(), name="home")
]"""
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
                  path('admin/', admin.site.urls),
                  path('', include('pgdb.urls')),
                  path('intonation/', include('intonation.urls')),
                  path('annotator/', include('annotator.urls')),
              ] + static('/static/', document_root=settings.STATIC_ROOT)