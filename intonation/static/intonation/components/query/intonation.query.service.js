angular.module('intonation.query')
    .service('BestiaryQuery', function ($http, $location, __env) {
    var base_url = __env.apiUrl + 'corpora/';
    var intonation_url = __env.intontationUrl + 'api/corpora/';
        var Query = {};
        Query.state = {
                currentQueryId: 0,
                queryRunning: false,
                exportText: 'Export to csv'};
        Query.reset_state = function(id){
            if (id != Query.state.currentQueryId){
                Query.state = {
                currentQueryId: id,
                exportText: 'Export to csv'}
            }
        };
        Query.annotation_types = ['phone', 'syllable', 'word', 'utterance'];

        Query.sound_file_url = function (corpus_id, id) {
            return base_url + corpus_id + '/annotations/' + id + '/sound_file/';
        };

        Query.getBestiaryQuery = function(corpus_id) {
            return $http.get(intonation_url + corpus_id + '/bestiary_query/')
        };

        Query.update = function (corpus_id, id, queryData) {
            queryData.refresh = true;
            return $http.put(base_url + corpus_id + '/query/' + id + '/', queryData);
        };

        Query.getResults = function(corpus_id, id){
            return $http.get(base_url + corpus_id + '/query/' + id + '/results/', {params: {limit:0}});

        };

        Query.getExportLink = function(corpus_id, id){
            return base_url + corpus_id + '/query/' + id + '/export/';
        };

        return Query
    }
    );