
angular.module('annotations')
    .service('Annotations', function ($http, __env) {
    var base_url = __env.annotatorUrl + 'annotations/';
    var Annotations = {};

    Annotations.all = function () {
        return $http.get(base_url);
    };

    Annotations.one = function (id) {
        return $http.get(base_url + id + '/');
    };

    return Annotations;
});
