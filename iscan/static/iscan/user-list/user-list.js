angular.module('userList', [
    'pgdb.users'
])
    .controller('UserListCtrl', function ($scope, $state, $location, djangoAuth, Users, Corpora) {
        Corpora.all().then(function(res) {
                $scope.corpora = res.data;
        });
        Users.all().then(function (res){
            $scope.users = res.data;
        });
        djangoAuth.authenticationStatus(true).then(function () {
            Users.current_user().then(function (res) {
                $scope.user = res.data;
                if (!$scope.user.is_superuser){
                    $state.go('home');
                }
            });
            $scope.start_button = 'Start';
            $scope.stop_button = 'Stop';
            $scope.delete_button = 'Delete';
            $scope.host = $location.host();
            $scope.newDatabase = {};


            $scope.refreshDatabases();


        }).catch(function () {
            $state.go('home');
        });
    });