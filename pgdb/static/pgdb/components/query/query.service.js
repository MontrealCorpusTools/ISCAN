angular.module('pgdb.query')
    .service('Query', function ($http, $location, __env) {
        var base_url = __env.apiUrl + 'corpora/';
        var Query = {};
        Query.state = {
                currentQueryId: 0,
                currentPage: 1,
                resultsPerPage: 100,
                offset: 0,
                numPages: 0,
                pages: [],
                queryRunning: false,
                queryText: 'Save query',
                exportText: 'Export to csv'};
        Query.reset_state = function(id){
            if (id != Query.state.currentQueryId){
                Query.state = {
                currentQueryId: id,
                currentPage: 1,
                resultsPerPage: 100,
                offset: 0,
                numPages: 0,
                pages: [],
                queryRunning: false,
                queryText: 'Save query',
                exportText: 'Export to csv'}
            }
        };
        Query.annotation_types = ['phone', 'syllable', 'word', 'utterance'];

        Query.sound_file_url = function (corpus_id, id) {
            return base_url + corpus_id + '/annotations/' + id + '/sound_file/';
        };

        Query.one = function (corpus_id, id) {
            return $http.get(base_url + corpus_id + '/query/' + id + '/');
        };

        Query.update = function (corpus_id, id, queryData) {
            return $http.put(base_url + corpus_id + '/query/' + id + '/', queryData);
        };

        Query.all = function (corpus_id) {
            return $http.get(base_url + corpus_id + '/query/');
        };

        Query.type_queries = function (corpus_id, type) {
            return $http.get(base_url + corpus_id + '/query/'+ type +'/');
        };

        Query.create = function (corpus_id, queryData) {
            return $http.post(base_url + corpus_id + '/query/', queryData)
        };

        Query.delete = function (corpus_id, id) {
            return $http.delete(base_url + corpus_id + '/query/' + id + '/');
        };

        Query.getResults = function(corpus_id, id, offset, ordering, limit){
            return $http.get(base_url + corpus_id + '/query/' + id + '/results/', {
                params: {
                    offset: offset,
                    ordering: ordering,
                    limit: limit
                }
            });

        };

        Query.oneAnnotation = function (corpus_id, query_id, index, ordering, with_pitch, with_waveform, with_spectrogram) {
            return $http.get(base_url + corpus_id + '/query/' + query_id + '/result/', {
                params: {
                    index: index,
                    ordering: ordering,
                    with_pitch: with_pitch,
                    with_waveform: with_waveform,
                    with_spectrogram: with_spectrogram
                }
            });
        };
        Query.generate_pitch_track = function (corpus_id, id, newPitchSetings) {
            newPitchSetings.utterance_id = id;
            return $http.get(base_url + corpus_id + '/utterance_pitch_track/', {
                params: newPitchSetings
            });
        };

        Query.save_pitch_track = function (corpus_id, id, new_track) {
            var data = {id: id, track:new_track};
            return $http.post(__env.apiUrl + 'corpora/' + corpus_id + '/save_utterance_pitch_track/', data);

        };

        Query.getExportLink = function(corpus_id, id){
            return base_url + corpus_id + '/query/' + id + '/export/';
        };

        Query.export = function (corpus_id, id, query_data) {

            return $http.post(base_url + corpus_id + '/query/' + id + '/export/', query_data);
        };

        return Query;
    });