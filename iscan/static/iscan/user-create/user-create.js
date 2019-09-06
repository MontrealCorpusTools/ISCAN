angular.module('userCreate', [
    'iscan.users'
])
    .controller('UserCreateCtrl', function ($scope, $state, $location, $mdToast, djangoAuth, Users, Corpora) {
        djangoAuth.authenticationStatus(true).then(function () {
            Users.current_user().then(function (res) {
                $scope.user = res.data;
                if (!$scope.user.is_superuser){
                    $state.go('home');
                }
            });
            $scope.host = $location.host();

            $scope.newUser = {};
            $scope.password_validation = '';

            $scope.createUser = function(){
                Users.create($scope.newUser).then(function(res){

                      $mdToast.show(
                        $mdToast.simple()
                        .textContent('User successfully created!')
                        .position("bottom right")
                            .action('Dismiss')
                            .hideDelay(3000)
                            .highlightAction(true));
                    $state.go('user-list');
                }).catch(function(res){

                      $mdToast.show(
                        $mdToast.simple()
                        .textContent('Error: '+res.data)
                        .position("bottom right")
                            .action('Dismiss')
                            .hideDelay(0)
                            .highlightAction(true));
                    console.log(res)
                });
            };
                Users.roles().then(function(res) {
                    console.log(res)
                        $scope.roles = res.data;
                });

        }).catch(function (res) {
            console.log(res)
            $state.go('home');
        });
    });
