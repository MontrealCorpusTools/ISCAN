angular.module('pgdb.enrichment')
    .service('Enrichment', function ($http, $location, __env) {
        var base_url = __env.apiUrl + 'corpora/';
        var Enrichment = {};


        Enrichment.all = function (corpus_id) {
            return $http.get(base_url + corpus_id + '/enrichment/');
        };

        Enrichment.run = function(corpus_id, id) {
            return $http.post(base_url + corpus_id + '/enrichment/' + id + '/run/', {});
        };

        Enrichment.reset = function(corpus_id, id) {
            return $http.post(base_url + corpus_id + '/enrichment/' + id + '/reset/', {});
        };

        Enrichment.create_csv = function(corpus_id, id,  data) {
            return $http.post(base_url + corpus_id + '/enrichment/' + id + '/create_csv/', data);
        };

        Enrichment.create = function(corpus_id, enrichmentData) {
            return $http.post(base_url + corpus_id + '/enrichment/', enrichmentData);
        };

        return Enrichment;
    });
