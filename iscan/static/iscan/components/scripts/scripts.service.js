
angular.module('iscan.scripts')
    .service('Scripts', function ($http, __env) {
    let Scripts= {};

    let base_url = __env.apiUrl + 'spade_scripts/';

    Scripts.run_script = function(data) {
        return $http.post(base_url+'run_script/', data);
    };

    Scripts.list = function () {
        return $http.get(base_url);
    };

    Scripts.list_scripts = function () {
        return $http.get(base_url + 'list_scripts/');
    };

    Scripts.list_corpora = function () {
        return $http.get(base_url + 'list_corpora/');
    };

    Scripts.get_script_log = function (id) {
        return $http.get(base_url + id + '/get_log/');
    }

    return Scripts;
});
