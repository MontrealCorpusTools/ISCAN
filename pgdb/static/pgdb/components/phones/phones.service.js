angular.module('pgdb.phones')
    .service('Phones', function ($http, $location, __env) {
        var base_url = __env.apiUrl + 'corpora/';
        var Phones = {};

        Phones.all = function (corpus_id, offset, ordering) {
            return $http.get(base_url + corpus_id + '/phones/', {params: {
                offset: offset, ordering: ordering}});
        };


        return Phones;
    });
