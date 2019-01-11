angular.module('navbar', [
    'pgdb.corpora',
    'pgdb.auth',
    'pgdb.users'
])
    .controller('NavCtrl', function ($scope, $rootScope, Corpora, $http, djangoAuth, __env, Users) {
        $rootScope.authenticated = undefined;
        $scope.authenticated = false;
        $scope.siteName = __env.siteName;

        djangoAuth.authenticationStatus(true).then(function () {
            $scope.authenticated = true;

            $scope.refreshCorpusList();
            Users.current_user().then(function (res) {
                $scope.user = res.data;
                $rootScope.user = $scope.user;
            });
        }).catch(function(res){
            $scope.authenticated = false;
        });

        // Wait and respond to the logout event.
        $scope.$on('djangoAuth.logged_out', function () {
            $scope.authenticated = false;
            $scope.corpora = [];
            delete $scope.current_corpus;
            delete $scope.user;
            delete $rootScope.user;

        });
        // Wait and respond to the log in event.
        $scope.$on('djangoAuth.logged_in', function (data) {
            $scope.authenticated = true;
            Users.current_user().then(function (res) {
                $scope.user = res.data;
                $rootScope.user = $scope.user;
            });
            $scope.refreshCorpusList();
        });

        $scope.$on('corpus_changed', function (e, res) {
            $scope.current_corpus = res;
        });

        $scope.refreshCorpusList = function () {
            Corpora.all().then(function (res) {
                $scope.corpora = res.data;
            }).catch(function (res) {
                $scope.corpora = [];
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
