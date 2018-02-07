angular.module('pgdb.words')
    .service('Words', function ($http, $location, __env) {
        var base_url = __env.apiUrl + 'corpora/';
        var Words = {};

        Words.all = function (corpus_id, offset, ordering) {
            return $http.get(base_url + corpus_id + '/words/', {params: {
                offset: offset, ordering: ordering}});
        };


        return Words;
    });