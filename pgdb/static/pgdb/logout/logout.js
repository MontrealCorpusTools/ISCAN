angular.module("logout", ['pgdb.auth']).controller("LogoutCtrl", [
    '$scope', '$rootScope', '$state', 'Config', 'AuthService', 'CookieService', '$http', '$timeout', function ($scope, $rootScope, $state, Config, AuthService, CookieService, $http, $timeout) {
        $scope.state = $state;
        $scope.Config = Config;

        CookieService.remove('token');
        CookieService.remove('sessionid');
        delete $rootScope.session;
        $rootScope.$broadcast('logged_out');
        return $state.go("home");

    }
]);