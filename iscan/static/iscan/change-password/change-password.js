angular.module('changePassword', [
    'iscan.users'
])
    .controller('ChangePasswordCtrl', function ($scope, $state, $location, $mdToast, djangoAuth, Users, Corpora) {
        djangoAuth.authenticationStatus(true).then(function () {
            Users.current_user().then(function (res) {
                $scope.user = res.data;
            });
            $scope.host = $location.host();

            $scope.data = {};
            $scope.password_validation = '';

            $scope.submit = function(){
                Users.change_password($scope.data).then(function(res){
                $mdToast.show(
                        $mdToast.simple()
                        .textContent('Password successfully changed!')
                        .position("bottom right")
                            .action('Dismiss')
                            .hideDelay(3000)
                            .highlightAction(true));
                $state.go('home');
                }).catch(function(res){
                $mdToast.show(
                        $mdToast.simple()
                        .textContent('There was an error updating your password')
                        .position("bottom right")
                            .action('Dismiss')
                            .hideDelay(0)
                            .highlightAction(true));
                    console.log(res)
                });
            };

        }).catch(function (res) {
            console.log(res)
            $state.go('home');
        });
    });