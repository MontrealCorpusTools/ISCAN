angular.module("logout", ['pgdb.auth']).controller("LogoutCtrl", [
    '$scope', '$rootScope', '$state',  'AuthService', 'CookieService', '$http', '$timeout', function ($scope, $rootScope, $state, AuthService, CookieService, $http, $timeout) {
        $scope.state = $state;

        CookieService.remove('token');
        CookieService.remove('sessionid');
        delete $rootScope.session;
        $rootScope.$broadcast('logged_out');
        return $state.go("home");

    }
]);