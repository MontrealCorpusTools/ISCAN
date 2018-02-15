angular.module("login", ['pgdb.auth']).controller("LoginCtrl", [
    '$scope', '$rootScope', '$state', 'AuthService', 'CookieService', '$http', '$timeout', function($scope, $rootScope, $state, AuthService, CookieService, $http, $timeout) {
      $scope.state = $state;
      $scope.user = {
        username: "",
        password: ""
      };

      $scope.login = function() {
        AuthService.login($scope.user).then(function(result) {
            console.log(result);
          CookieService.put('token', result.data.token);
          $rootScope.$broadcast('logged_in');
          $state.go('home');
        }).catch(function(errors) {
          $scope.errors = errors.data;
          delete $rootScope.user;
          delete $rootScope.session;
          return $rootScope.$broadcast("loginFailed");
        })
      };

    }
  ]);