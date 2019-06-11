angular.module('iscan.enrichment')
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

        Enrichment.create_file = function(corpus_id, id,  data) {
            return $http.post(base_url + corpus_id + '/enrichment/' + id + '/create_file/', data);
        };

        Enrichment.create = function(corpus_id, enrichmentData) {
            return $http.post(base_url + corpus_id + '/enrichment/', enrichmentData);
        };

        Enrichment.one = function (corpus_id, id) {
            return $http.get(base_url + corpus_id + '/enrichment/' + id + '/');
        };

        Enrichment.update = function (corpus_id, id, enrichmentData) {
            return $http.put(base_url + corpus_id + '/enrichment/' + id + '/', enrichmentData);
        };

        Enrichment.destroy = function (corpus_id, id) {
            return $http.delete(base_url + corpus_id + '/enrichment/' + id + '/');
        };

        return Enrichment;
    });
