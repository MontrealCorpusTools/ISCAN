angular.module('pgdb.utterances')
    .service('Utterances', function ($http, BASE_URL, INTONATION_URL) {
        var base_url = BASE_URL + 'corpora/';
        var Utterances = {};

        Utterances.sound_file_url = function(corpus_id, id){
            return INTONATION_URL + corpus_id + '/wav_file/' + id + '/';
        };

        Utterances.all = function (corpus_id, with_pitch) {
            return $http.get(base_url + corpus_id + '/utterances/', {params: {with_pitch: with_pitch}});
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
            return $http.post(INTONATION_URL + corpus_id + '/save/pitch/' + id + '/', new_track);

        };

        return Utterances;
    });
