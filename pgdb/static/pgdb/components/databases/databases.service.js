
angular.module('pgdb.databases')
    .service('Databases', function ($http, __env) {
    var base_url = __env.apiUrl + 'databases/';
    var Databases = {};

    Databases.all = function () {
        return $http.get(base_url);
    };

    Databases.one = function (id) {
        return $http.get(base_url + id + '/');
    };

    Databases.corpora = function (id) {
        return $http.get(base_url + id + '/corpora/');
    };

    Databases.ports = function (id) {
        return $http.get(base_url + id + '/ports/');
    };

    Databases.start = function (id) {
        return $http.post(base_url + id + '/start/', {});
    };

    Databases.stop = function (id) {
        return $http.post(base_url + id + '/stop/', {});
    };

    Databases.update = function (updatedDatabase) {
        return $http.put(base_url + updatedDatabase.id, updatedDatabase);
    };

    Databases.delete = function (id) {
        return $http.delete(base_url + id + '/');
    };

    Databases.addOne = function (newDatabase) {
        return $http.post(base_url, newDatabase)
    };

    return Databases;
});
