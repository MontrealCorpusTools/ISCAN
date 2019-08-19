
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

    Scripts.list_csvs = function (corpus)  {
        return $http.post(base_url + 'list_csvs/', {"target_corpus": corpus});
    };

    Scripts.download_csv = function (corpus, csv) {
        let obj = {"target_corpus": corpus, "csv_file":csv}
        return $http.post(base_url + 'download_csv/', obj);
    };

    Scripts.get_script_log = function (id) {
        return $http.get(base_url + id + '/get_log/');
    }

    return Scripts;
});
