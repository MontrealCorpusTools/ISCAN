angular.module("logout", ['pgdb.auth']).controller("LogoutCtrl", [
    '$scope', '$rootScope', '$state',  'AuthService', 'CookieService', function ($scope, $rootScope, $state, AuthService, CookieService) {
        $scope.state = $state;

	$rootScope.$broadcast('corpus_changed', undefined);
        CookieService.remove('token');
        CookieService.remove('sessionid');
        delete $rootScope.session;
        $rootScope.$broadcast('logged_out');
        return $state.go("home");

    }
]);
