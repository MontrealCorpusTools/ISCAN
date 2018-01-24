from django.conf.urls import url

from . import views

app_name = 'intonation'
urlpatterns = [

    url(r'^$', views.index, name='index'),
    url(r'^(?P<corpus>\w+)/$', views.IntonationView.as_view(), name='bestiary'),
    url(r'^(?P<corpus>\w+)/detail/(?P<utterance_id>[-\w]+)/$', views.DetailView.as_view(), name='view_utterance'),
    url(r'^(?P<corpus>\w+)/edit/pitch/(?P<utterance_id>[-\w]+)/$', views.EditPitchView.as_view(), name='edit_pitch'),
    url(r'^(?P<corpus>\w+)/generate/pitch/(?P<utterance_id>[-\w]+)/$', views.generate_pitch_track, name='generate_pitch'),
    url(r'^(?P<corpus>\w+)/save/pitch/(?P<utterance_id>[-\w]+)/$', views.save_pitch_track, name='save_pitch'),
    url(r'^(?P<corpus>\w+)/wav_file/(?P<utterance_id>[-\w]+)/$', views.sound_file, name='sound_file'),
    url(r'^(?P<corpus>\w+)/annotate/(?P<utterance_id>[-\w]+)/$', views.DetailView.as_view(), name='annotate'),
    url(r'^(?P<corpus>\d+)/export_pitch/$', views.export_pitch_tracks, name='export_pitch'),
    url(r'^(?P<corpus>\w+)/get_next_utterance/(?P<utterance_id>[-\w]+)/$', views.get_next_utterance, name='get_next_utterance'),
    url(r'^(?P<corpus>\w+)/get_previous_utterance/(?P<utterance_id>[-\w]+)/$', views.get_previous_utterance, name='get_previous_utterance'),

]