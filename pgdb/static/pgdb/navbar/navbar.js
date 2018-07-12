angular.module('navbar', [
    'pgdb.corpora',
    'pgdb.auth'
])
    .controller('NavCtrl', function ($scope, $rootScope, Corpora, CookieService, $http, AuthService, __env) {
        $rootScope.authenticated = false;
        $scope.authenticated = false;
        $scope.siteName = __env.siteName;

        $scope.checkAuth = function () {
            $scope.token = CookieService.get('token');
            if ($scope.token != undefined) {
                $http.defaults.headers.common["Authorization"] = "Token " + $scope.token;
            }
            AuthService.checkAuth().then(function (user) {
                if (user.data.id === null) {
                    $rootScope.user = undefined;
                    $rootScope.authenticated = false;
                    $scope.authenticated = false;
                    $rootScope.$broadcast("unauthenticated", user);

                }
                else {
                    $rootScope.user = user.data;

                    $rootScope.authenticated = true;
                    $scope.authenticated = true;
                    $rootScope.session = AuthService.createSessionFor(user.data);
                    $rootScope.$broadcast("authenticated", user);
                }
            }).catch(function (res) {
                delete $scope.user;
                delete $scope.token;
                delete $http.defaults.headers.common["Authorization"];
                $rootScope.user = undefined;
                $rootScope.authenticated = false;
                $scope.authenticated = false;
                $rootScope.$broadcast("unauthenticated", user);
            });

        };
        $scope.checkAuth();
        $scope.$on('logged_in', $scope.checkAuth);
        $scope.$on('authenticated', function (e, res) {
            $scope.user = $rootScope.user;
            $rootScope.authenticated = true;
            $scope.authenticated = true;

            $scope.refreshCorpusList();
        });
        $scope.$on('logged_out', function (e, res) {
            delete $scope.user;
            delete $scope.token;
            delete $http.defaults.headers.common["Authorization"];
            $rootScope.authenticated = false;
            $scope.authenticated = false;
            $scope.refreshCorpusList();
        });
        $scope.refreshCorpusList = function () {
            Corpora.all().then(function (res) {
                $scope.corpora = res.data;
            }).catch(function (res) {

            });
        }
    }).directive('navbar', function () {

    return {
        restrict: 'E',
        replace: true,
        templateUrl: static('pgdb/navbar/navbar.html'),
        scope: {},
        controller: 'NavCtrl'
    }
});