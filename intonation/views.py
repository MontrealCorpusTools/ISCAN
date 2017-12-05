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
        corpus = self.kwargs.get('corpus', None)
        context['corpus'] = corpus
        discourse = self.request.GET.get('discourse', None)
        speaker = self.request.GET.get('speaker', None)
        relative_time = self.request.GET.get('relative_time', True)
        relative_time = True
        # corpus = self.request.session['corpus']
        corpus = Corpus.objects.get(name=corpus)
        context['time_series'], context['metadata'], context['extents'] = self.get_time_series(corpus, discourse,
                                                                                               speaker, relative_time)
        return context

    def get_time_series(self, corpus, discourse, speaker, relative_time):
        datasets = []

        with CorpusContext(corpus.config) as c:
            print(corpus.config.data_dir)
            print(c.hierarchy)
            c.config.pitch_source = 'reaper'
            q = c.query_graph(c.utterance)
            if discourse is not None:
                q = q.filter(c.utterance.discourse.name == discourse)
            if speaker is not None:
                q = q.filter(c.utterance.speaker.name == speaker)
            track_column = c.utterance.pitch.interpolated_track
            track_column.num_points = 100
            track_column.attribute.relative_time = relative_time
            q = q.columns(c.utterance.id.column_name('utterance_id'),
                c.utterance.discourse.name.column_name('discourse'),
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
                    y = value['F0']
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
                                 'utterance_id': r['utterance_id'],
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
        utterance_id = self.kwargs.get('utterance_id', None)
        # corpus = self.request.session['corpus']
        corpus = self.kwargs.get('corpus', None)
        corpus = Corpus.objects.get(name=corpus)
        context['utterance_id'] = utterance_id
        with CorpusContext(corpus.config) as c:
            q = c.query_graph(c.utterance).filter(c.utterance.id == utterance_id).columns(c.utterance.begin.column_name('begin'),
                                                                                          c.utterance.end.column_name('end'),
                                                                                          c.utterance.discourse.name.column_name('discourse'),
                                                                                          c.utterance.pitch.track)
            utterance_info = q.all()[0]

        context['waveform'] = self.get_time_series(corpus, utterance_info)
        context['specgram'] = self.get_spec_gram(corpus, utterance_info)
        context['pitch_track'] = self.get_pitch_track(utterance_info)
        context['begin'] = utterance_info['begin']
        context['end'] = utterance_info['end']
        context['annotation_options'] = ItemType.objects.prefetch_related('categories').prefetch_related(
            'categories__values').all()
        return context

    def get_pitch_track(self, utterance_info):
        track = []
        for k, v in utterance_info.track.items():
            track.append({'x': float(k), 'y': float(v['F0'])})
        return json.dumps(track)

    def get_time_series(self, corpus, utterance_info):
        with CorpusContext(corpus.config) as c:
            signal, sr = c.load_waveform(utterance_info['discourse'], 'vowel', begin=utterance_info['begin'], end=utterance_info['end'])
            step = 1 / sr
            data = [{'y': float(p), 'x': i * step + utterance_info['begin']} for i, p in enumerate(signal)]
        return json.dumps(data)

    def get_spec_gram(self, corpus, utterance_info):
        dataset = {}
        with CorpusContext(corpus.config) as c:
            data, time_step, freq_step = c.generate_spectrogram(utterance_info['discourse'], 'consonant', begin=utterance_info['begin'], end=utterance_info['end'])
            reshaped = []
            for i in range(data.shape[0]):
                for j in range(data.shape[1]):
                    reshaped.append({'time': j * time_step + utterance_info['begin'], 'frequency': i * freq_step, 'power': float(data[i, j])})
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
        utterance_id = self.kwargs.get('utterance_id', None)
        # corpus = self.request.session['corpus']
        corpus = 'cont'
        corpus = Corpus.objects.get(name=corpus)
        context['utterance_id'] = utterance_id
        with CorpusContext(corpus.config) as c:
            q = c.query_graph(c.utterance).filter(c.utterance.id == utterance_id).columns(c.utterance.begin.column_name('begin'),
                                                                                          c.utterance.end.column_name('end'),
                                                                                          c.utterance.discourse.name.column_name('discourse'),
                                                                                          c.utterance.pitch.track)
            utterance_info = q.all()[0]
        context['waveform'] = self.get_time_series(corpus, utterance_info)
        context['pitch_track'] = self.get_pitch_track(utterance_info)
        context['begin'] = utterance_info['begin']
        context['end'] = utterance_info['end']
        context['form'] = PitchAnalysisForm()
        return context


def generate_pitch_track(request, corpus, utterance_id):
    form = PitchAnalysisForm(request.POST)
    if form.is_valid():
        print(form.cleaned_data)
        corpus = Corpus.objects.get(name=corpus)
        with CorpusContext(corpus.config) as c:
            results, pulses = c.analyze_utterance_pitch(utterance_id, with_pulses=True, **form.cleaned_data)
        pitch_data = {}
        track = []
        for datapoint in results:
            v = datapoint['F0']
            k = datapoint['time']
            if v is None or v < 1:
                continue
            track.append({'x': k, 'y': v})
        pitch_data['pitch_track'] = track
        pitch_data['pulses'] = [{'x': x} for x in sorted(pulses)]
        #pitch_data['pulses'] = []
        return JsonResponse(pitch_data, safe=False)
    else:
        return JsonResponse(data=form.errors, status=status.HTTP_400_BAD_REQUEST)

def save_pitch_track(request, corpus, utterance_id):
    data = json.loads(request.body)
    corpus = Corpus.objects.get(name=corpus)
    with CorpusContext(corpus.config) as c:
        c.update_utterance_pitch_track(utterance_id, data)
    return JsonResponse(data={'success': True})

def sound_file(request, corpus, utterance_id):
    corpus = Corpus.objects.get(name=corpus)
    with CorpusContext(corpus.config) as c:
        q = c.query_graph(c.utterance).filter(c.utterance.id == utterance_id).columns(c.utterance.begin.column_name('begin'),
                                                                                      c.utterance.end.column_name('end'),
                                                                                      c.utterance.discourse.name.column_name('discourse'),
                                                                                      c.utterance.pitch.track)
        utterance_info = q.all()[0]
        fname = c.discourse_sound_file(utterance_info['discourse'])["consonant_file_path"]
    response = FileResponse(open(fname, "rb"))
    # response['Content-Type'] = 'audio/wav'
    # response['Content-Length'] = os.path.getsize(fname)
    return response
