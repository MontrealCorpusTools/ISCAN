
angular.module('iscan.apps')
    .service('Apps', function ($http, __env) {
        var app_url = __env.apiUrl + 'apps/';
        var Apps = {};

        Apps.all = function () {
            return $http.get(app_url);
        };
    return Apps;
    });