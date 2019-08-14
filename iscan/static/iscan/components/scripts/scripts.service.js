
angular.module('iscan.scripts')
    .service('Scripts', function ($http, __env) {
    let Scripts= {};

    let base_url = __env.apiUrl + 'spade_scripts/';

    Scripts.run_script = function(data) {
        return $http.post(base_url+'run_script/', {});
    };

    Scripts.list = function () {
        return $http.get(base_url);
    };

    Scripts.list_corpora = function () {
        return $http.get(base_url + 'list_corpora/');
    };

    return Scripts;
});