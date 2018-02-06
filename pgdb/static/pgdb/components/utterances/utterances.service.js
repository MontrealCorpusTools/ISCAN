angular.module('pgdb.utterances')
    .service('Utterances', function ($http, $location, __env) {
        var base_url = __env.apiUrl + 'corpora/';
        var Utterances = {};

        Utterances.sound_file_url = function(corpus_id, id){
            return __env.apiUrl + corpus_id + '/wav_file/' + id + '/';
        };

        Utterances.export_pitch_tracks = function(corpus_id){
            return __env.apiUrl + corpus_id + '/export_pitch/';

        };


        Utterances.subset = function(corpus_id, offset, ordering, with_pitch, params){
            params = Object.assign({}, params, {with_pitch: with_pitch,
                offset: offset, ordering: ordering});
            return $http.get(base_url + corpus_id + '/utterances/', {params: params});
        };

        Utterances.all = function (corpus_id, offset, ordering, with_pitch) {
            return $http.get(base_url + corpus_id + '/utterances/', {params: {with_pitch: with_pitch,
                offset: offset, ordering: ordering}});
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
            return $http.get(__env.apiUrl + corpus_id + '/get_next_utterance/' + id + '/');
        };

        Utterances.get_previous = function(corpus_id, id) {
            return $http.get(__env.apiUrl + corpus_id + '/get_previous_utterance/' + id + '/');
        };

        return Utterances;
    });
