angular.module('navbar', [
    'iscan.corpora',
    'iscan.auth',
    'iscan.users',
    'iscan.apps'
])
    .controller('NavCtrl', function ($scope, $rootScope, Corpora, $http, djangoAuth, __env, Users, Apps, Scripts) {
        $rootScope.authenticated = undefined;
        $scope.authenticated = false;
        $scope.siteName = __env.siteName;

        Scripts.is_enabled().then(res => {
            $scope.scripts_enabled = res.data;
        });

        djangoAuth.authenticationStatus(true).then(function () {
            $scope.authenticated = true;
            Apps.all().then(function(res){
                $scope.apps = res.data;
                console.log($scope.apps)
            })
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
        templateUrl: static('iscan/navbar/navbar.html'),
        scope: {},
        controller: 'NavCtrl'
    }
});
