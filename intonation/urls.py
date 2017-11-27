from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^(?P<corpus>\w+)/$', views.IntonationView.as_view(), name='bestiary'),
    url(r'^(?P<corpus>\w+)/detail/(?P<discourse>\w+)/$', views.DetailView.as_view(), name='view_discourse'),
    url(r'^(?P<corpus>\w+)/edit/pitch/(?P<discourse>\w+)/$', views.EditPitchView.as_view(), name='edit_pitch'),
    url(r'^(?P<corpus>\w+)/generate/pitch/(?P<discourse>\w+)/$', views.generate_pitch_track, name='generate_pitch'),
    url(r'^(?P<corpus>\w+)/save/pitch/(?P<discourse>\w+)/$', views.save_pitch_track, name='save_pitch'),
    url(r'^(?P<corpus>\w+)/wav_file/(?P<discourse>\w+)/$', views.sound_file, name='sound_file'),
    url(r'^(?P<corpus>\w+)/annotate/(?P<discourse>\w+)$', views.DetailView.as_view(), name='annotate'),
]