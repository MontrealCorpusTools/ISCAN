from django.shortcuts import render
# Create your views here.
import os
import time
from django.views.generic import TemplateView
from django.http import HttpResponse, JsonResponse, FileResponse
import json
from polyglotdb import CorpusContext
from pgdb.models import Corpus
from .forms import PitchAnalysisForm

from .models import ItemType

from rest_framework import status

class IntonationView(TemplateView):
    template_name = 'intonation/bestiary_plot.html'

    def get_context_data(self, **kwargs):
        context = super(IntonationView, self).get_context_data(**kwargs)
        discourse = self.request.GET.get('discourse', None)
        speaker = self.request.GET.get('speaker', None)
        relative_time = self.request.GET.get('relative_time', True)
        relative_time = True
        # corpus = self.request.session['corpus']
        corpus = 'cont'
        corpus = Corpus.objects.get(name=corpus)
        context['time_series'], context['metadata'], context['extents'] = self.get_time_series(corpus, discourse,
                                                                                               speaker, relative_time)
        return context

    def get_time_series(self, corpus, discourse, speaker, relative_time):
        datasets = []

        with CorpusContext(corpus.config) as c:
            c.config.pitch_source = 'reaper'
            q = c.query_graph(c.utterance)
            if discourse is not None:
                q = q.filter(c.utterance.discourse.name == discourse)
            if speaker is not None:
                q = q.filter(c.utterance.speaker.name == speaker)
            track_column = c.utterance.pitch_relative.interpolated_track
            track_column.num_points = 100
            track_column.attribute.relative_time = relative_time
            q = q.columns(c.utterance.discourse.name.column_name('discourse'),
                          c.utterance.speaker.name.column_name('speaker'),
                          c.utterance.discourse.context.column_name('context'),
                          c.utterance.discourse.item.column_name('item'),
                          track_column)
            extents = {'min_x': None, 'max_x': None,
                       'min_y': None, 'max_y': None}
            metadata = {'speaker': set(), 'context': set(), 'item': set()}
            for r in q.all():
                if r['context'] is None or r['item'] is None:
                    continue
                data = []
                for time, value in r.track.items():
                    x = float(time)
                    if x > 1:
                        print('time error')
                    y = value['F0_relative']
                    if x is not None:
                        if extents['min_x'] is None or x < extents['min_x']:
                            extents['min_x'] = x
                        if extents['max_x'] is None or x > extents['max_x']:
                            extents['max_x'] = x
                    if y is not None:
                        if extents['min_y'] is None or y < extents['min_y']:
                            extents['min_y'] = y
                        if extents['max_y'] is None or y > extents['max_y']:
                            extents['max_y'] = y
                    data.append({'x': x, 'y': y})
                item = str(r['item']).replace('.', '_')
                context = r['context'].replace(' ', '_')
                metadata['speaker'].add(r['speaker'])
                metadata['item'].add(item)
                metadata['context'].add(context)
                datasets.append({'discourse': r['discourse'],
                                 'values': data,
                                 'speaker': r['speaker'],
                                 'context': context,
                                 'item': item})
        metadata = [{'key': k, 'values': sorted(v)} for k, v in metadata.items()]
        return json.dumps(datasets), metadata, extents


class DetailView(TemplateView):
    template_name = 'intonation/detail_plot.html'

    def get_context_data(self, **kwargs):
        context = super(DetailView, self).get_context_data(**kwargs)
        discourse = self.kwargs.get('discourse', None)
        # corpus = self.request.session['corpus']
        corpus = 'cont'
        corpus = Corpus.objects.get(name=corpus)
        context['discourse'] = discourse

        context['waveform'] = self.get_time_series(corpus, discourse)
        context['specgram'] = self.get_spec_gram(corpus, discourse)
        context['pitch_track'] = self.get_pitch_track(corpus, discourse)
        context['duration'] = self.get_duration(corpus, discourse)
        context['annotation_options'] = ItemType.objects.prefetch_related('categories').prefetch_related(
            'categories__values').all()
        return context

    def get_pitch_track(self, corpus, discourse):
        track = []
        with CorpusContext(corpus.config) as c:
            q = c.query_graph(c.utterance).filter(c.utterance.discourse.name == discourse)
            q = q.columns(c.utterance.label, c.utterance.pitch.track)
            results = q.all()
        for r in results:
            for k, v in r.track.items():
                track.append({'x': float(k), 'y': float(v['F0'])})
        return json.dumps(track)

    def get_duration(self, corpus, discourse):

        with CorpusContext(corpus.config) as c:
            duration = c.discourse_sound_file(discourse)['duration']
        return duration

    def get_time_series(self, corpus, discourse):
        with CorpusContext(corpus.config) as c:
            c.config.pitch_source = 'praat'
            signal, sr = c.load_waveform(discourse, 'vowel')
            step = 1 / sr
            data = [{'y': float(p), 'x': i * step} for i, p in enumerate(signal)]
        return json.dumps(data)

    def get_spec_gram(self, corpus, discourse):
        dataset = {}
        with CorpusContext(corpus.config) as c:
            data, time_step, freq_step = c.generate_spectrogram(discourse, 'consonant')
            reshaped = []
            for i in range(data.shape[0]):
                for j in range(data.shape[1]):
                    reshaped.append({'time': j * time_step, 'frequency': i * freq_step, 'power': float(data[i, j])})
        dataset['values'] = reshaped
        dataset['time_step'] = time_step
        dataset['freq_step'] = freq_step
        dataset['num_time_bins'] = data.shape[1]
        dataset['num_freq_bins'] = data.shape[0]
        return json.dumps(dataset)


class EditPitchView(DetailView):
    template_name = 'intonation/pitch_plot.html'

    def get_context_data(self, **kwargs):
        context = super(EditPitchView, self).get_context_data(**kwargs)
        discourse = self.kwargs.get('discourse', None)
        # corpus = self.request.session['corpus']
        corpus = 'cont'
        corpus = Corpus.objects.get(name=corpus)
        context['discourse'] = discourse
        context['waveform'] = self.get_time_series(corpus, discourse)
        context['pitch_track'] = self.get_pitch_track(corpus, discourse)
        context['duration'] = self.get_duration(corpus, discourse)
        context['form'] = PitchAnalysisForm()
        return context


def generate_pitch_track(request, discourse):
    form = PitchAnalysisForm(request.POST)
    if form.is_valid():
        print(form.cleaned_data)
        corpus = 'cont'
        corpus = Corpus.objects.get(name=corpus)
        with CorpusContext(corpus.config) as c:
            results, pulses = c.analyze_discourse_pitch(discourse, **form.cleaned_data)
        pitch_data = {}
        track = []
        for k, v in sorted(results.items()):
            if isinstance(v, dict):
                v = v['F0']
            if v < 1:
                continue
            track.append({'x': k, 'y': v})
        pitch_data['pitch_track'] = track
        pitch_data['pulses'] = [{'x': x} for x in pulses]
        print(pitch_data)
        return JsonResponse(pitch_data, safe=False)
    else:
        return JsonResponse(data=form.errors, status=status.HTTP_400_BAD_REQUEST)


def sound_file(request, discourse):
    corpus = 'cont'
    corpus = Corpus.objects.get(name=corpus)
    with CorpusContext(corpus.config) as c:
        fname = c.discourse_sound_file(discourse)["consonant_filepath"]
    response = FileResponse(open(fname, "rb"))
    # response['Content-Type'] = 'audio/wav'
    # response['Content-Length'] = os.path.getsize(fname)
    return response
