
angular.module('pgdb.users')
    .service('Users', function ($http, __env) {
    var base_url = __env.apiUrl + 'users/';
    var Users = {};

    Users.all = function () {
        return $http.get(base_url);
    };

    Users.one = function (id) {
        return $http.get(base_url + id + '/');
    };

    Users.current_user = function (){
        return $http.get(base_url+ 'current_user/');
    };


    Users.update = function (updatedUser) {
        return $http.put(base_url + updatedUser.id, updatedUser);
    };

    Users.delete = function (id) {
        return $http.delete(base_url + id + '/');
    };

    Users.create = function (newUser) {
        return $http.post(base_url, newUser)
    };

    return Users;
});
