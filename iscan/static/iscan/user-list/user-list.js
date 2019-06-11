angular.module('userList', [
    'iscan.users'
])
    .controller('UserListCtrl', function ($scope, $state, $location, $mdDialog, $mdToast, djangoAuth, Users, Corpora) {
        djangoAuth.authenticationStatus(true).then(function () {
            Users.current_user().then(function (res) {
                $scope.user = res.data;
                if (!$scope.user.is_superuser) {
                    $state.go('home');
                }
            });
            $scope.host = $location.host();
            $scope.busy = false;

            Users.all().then(function (res) {
                $scope.users = res.data;
            });

            $scope.editUser = function (user_id) {

                $state.go('user-detail', {user_id: user_id});
            };

            $scope.createUser = function () {
                $state.go('user-create');
            };

            $scope.deleteUser = function (user, ev) {

                var confirm = $mdDialog.confirm()
                    .title('Would you like to delete ' + user.username + '?')
                    .textContent('Delete user')
                    .ariaLabel('Delete user')
                    .targetEvent(ev)
                    .ok('Delete')
                    .cancel('Cancel');

                $mdDialog.show(confirm).then(function () {

                    Users.delete(user.id).then(function (res) {

                      $mdToast.show(
                        $mdToast.simple()
                        .textContent('User successfully deleted!')
                        .position("bottom right")
                            .action('Dismiss')
                            .hideDelay(0)
                            .highlightAction(true));
                        Users.all().then(function (res) {
                            $scope.users = res.data;
                        });
                    })
                });

            };

            $scope.addTutorialCorpus = function (user) {
                $scope.busy = true;

                      $mdToast.show(
                        $mdToast.simple()
                        .textContent('Creating tutorial corpus for ' + user.username + '...')
                            .hideDelay(0)
                        .position("bottom right"));
                Users.create_tutorial_corpus(user.id).then(function (res) {
                    $scope.busy = false;
                      $mdToast.show(
                        $mdToast.simple()
                        .textContent('Successfully tutorial corpus for ' + user.username + '!')
                            .action('Dismiss')
                            .hideDelay(0)
                        .position("bottom right"));
                });
            }

        }).catch(function (res) {
            console.log(res)
            $state.go('home');
        });
    });