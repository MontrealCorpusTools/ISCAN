
angular.module('iscan.users')
    .service('Users', function ($http, __env) {
    var base_url = __env.apiUrl + 'users/';
    var Users = {};

    Users.all = function () {
        return $http.get(base_url);
    };

    Users.roles = function(){
        return $http.get(__env.apiUrl + 'roles/');

    };

    Users.one = function (id) {
        return $http.get(base_url + id + '/');
    };

    Users.current_user = function (){
        return $http.get(base_url+ 'current_user/');
    };

    Users.change_password = function(data){
        return $http.put(base_url + 'change_password/', data)
    };


    Users.update = function (updatedUser) {
        return $http.put(base_url + updatedUser.id + '/', updatedUser);
    };

    Users.create_tutorial_corpus = function(id){
        return $http.post(base_url + id + '/create_tutorial_corpus/')
    };

    Users.delete = function (id) {
        return $http.delete(base_url + id + '/');
    };

    Users.create = function (newUser) {
        return $http.post(base_url, newUser)
    };

    return Users;
});
