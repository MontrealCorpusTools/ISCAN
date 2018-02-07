angular.module('pgdb.syllables')
    .service('Syllables', function ($http, $location, __env) {
        var base_url = __env.apiUrl + 'corpora/';
        var Syllables = {};

        Syllables.all = function (corpus_id, offset, ordering) {
            return $http.get(base_url + corpus_id + '/syllables/', {params: {
                offset: offset, ordering: ordering}});
        };


        return Syllables;
    });