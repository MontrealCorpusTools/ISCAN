angular.module('userDetail', [
    'iscan.users'
])
    .controller('UserDetailCtrl', function ($scope, $state, $stateParams, $location, djangoAuth, Users, Corpora) {
        djangoAuth.authenticationStatus(true).then(function () {
            Users.current_user().then(function (res) {
                $scope.user = res.data;
                if (!$scope.user.is_superuser){
                    $state.go('home');
                }

                Users.one($stateParams.user_id).then(function(res){
                    $scope.user_edit = res.data;
                console.log($scope.user_edit)
                });

                Corpora.all().then(function(res) {
                        $scope.corpora = res.data;
                });
                Users.roles().then(function(res) {
                    console.log(res)
                        $scope.roles = res.data;
                });

            });
            $scope.host = $location.host();



        }).catch(function (res) {
            console.log(res)
            $state.go('home');
        });

        $scope.updateUser = function(user_edit){
            Users.update(user_edit).then(function(res){
                $scope.user_edit = res.data
            });
        }

    });