
angular.module('annotations')
    .service('Annotations', function ($http, __env) {
    var base_url = __env.annotatorUrl + 'annotations/';
    var subannotation_url = __env.apiUrl + 'corpora/';
    var Annotations = {};

    Annotations.all = function () {
        return $http.get(base_url);
    };

    Annotations.one = function (id) {
        return $http.get(base_url + id + '/');
    };

    Annotations.create = function(corpus_id, newAnnotation){
        console.log(newAnnotation)
      return $http.post(subannotation_url + corpus_id + '/subannotations/', newAnnotation)
    };

    Annotations.delete = function(corpus_id, annotation_id){
      return $http.delete(subannotation_url + corpus_id + '/subannotations/' + annotation_id + '/')
    };

    Annotations.update = function(corpus_id, annotation_id, annotation){
      return $http.put(subannotation_url + corpus_id + '/subannotations/' + annotation_id + '/', annotation)
    };

    return Annotations;
});
