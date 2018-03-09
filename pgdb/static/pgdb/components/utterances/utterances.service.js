angular.module('pgdb.utterances')
    .service('Utterances', function ($http, $location, __env) {
        var base_url = __env.apiUrl + 'corpora/';
        var Utterances = {};

        Utterances.sound_file_url = function(corpus_id, id){
            return base_url + corpus_id + '/utterances/' + id + '/sound_file/';
        };

        Utterances.export_pitch_tracks = function(corpus_id){
            return __env.apiUrl + corpus_id + '/export_pitch/';

        };


        Utterances.subset = function(corpus_id, offset, ordering, with_pitch, params){
            params = Object.assign({}, params, {with_pitch: with_pitch,
                offset: offset, ordering: ordering});
            return $http.get(base_url + corpus_id + '/utterances/', {params: params});
        };

        Utterances.all = function (corpus_id, offset, ordering, with_pitch, query) {
            query_params = {};
            for (i=0;i<query.utterance.length; i++){
                if (query.utterance[i]['property'] === ''){
                    continue
                }
                if (query.utterance[i]['value'] === ''){
                    continue
                }
                query_params[query.utterance[i]['property']] = query.utterance[i]['value']
            }

            for (i=0;i<query.speaker.length; i++){
                if (query.speaker[i]['property'] === ''){
                    continue
                }
                if (query.speaker[i]['value'] === ''){
                    continue
                }
                query_params['speaker__' + query.speaker[i]['property']] = query.speaker[i]['value']
            }

            for (i=0;i<query.discourse.length; i++){
                if (query.discourse[i]['property'] === ''){
                    continue
                }
                if (query.discourse[i]['value'] === ''){
                    continue
                }
                query_params['discourse__' + query.discourse[i]['property']] = query.discourse[i]['value']
            }
            query_params.ordering = ordering;
            query_params.offset = offset;
            query_params.with_pitch = with_pitch;
            return $http.get(base_url + corpus_id + '/utterances/', {params: query_params});
        };

        Utterances.one = function (corpus_id, id, with_pitch, with_waveform, with_spectrogram) {
            return $http.get(base_url + corpus_id + '/utterances/' + id + '/', {
                params: {
                    with_pitch: with_pitch,
                    with_waveform: with_waveform,
                    with_spectrogram: with_spectrogram
                }
            });
        };
        Utterances.generate_pitch_track = function (corpus_id, id, newPitchSetings) {
            newPitchSetings.utterance_id = id;
            return $http.get(base_url + corpus_id + '/utterance_pitch_track/', {
                params: newPitchSetings
            });
        };

        Utterances.save_pitch_track = function(corpus_id, id, new_track){
            return $http.post(__env.apiUrl + corpus_id + '/save/pitch/' + id + '/', new_track);

        };

        Utterances.get_next = function(corpus_id, id) {
            return $http.get(base_url + corpus_id + '/utterances/' + id + '/next/');
        };

        Utterances.get_previous = function(corpus_id, id) {
            return $http.get(base_url + corpus_id + '/utterances/' + id + '/previous/');
        };

        return Utterances;
    });
