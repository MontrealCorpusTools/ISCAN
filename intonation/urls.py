from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.IntonationView.as_view(), name='bestiary'),
    url(r'^detail/(?P<discourse>\w+)/$', views.DetailView.as_view(), name='view_discourse'),
    url(r'^edit/pitch/(?P<discourse>\w+)/$', views.EditPitchView.as_view(), name='edit_pitch'),
    url(r'^generate/pitch/(?P<discourse>\w+)/$', views.generate_pitch_track, name='generate_pitch'),
    url(r'^wav_file/(?P<discourse>\w+)/$', views.sound_file, name='sound_file'),
    url(r'^annotate/(?P<discourse>\w+)$', views.DetailView.as_view(), name='annotate'),
]