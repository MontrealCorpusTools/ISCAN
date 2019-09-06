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
            Users.roles().then(function(res) {
                    $scope.roles = res.data;
            });

            $scope.editUser = function (user_id) {

                $state.go('user-detail', {user_id: user_id});
            };

            $scope.createUser = function () {
                $state.go('user-create');
            };

            $scope.display_user_type = function(user){
                for (i=0; i<$scope.roles.length;i++){
                    if ($scope.roles[i].id === user.user_type){
                        return $scope.roles[i].name
                    }
                }
                return 'Unknown'
            };

            $scope.deleteUser = function (user, ev) {

                var confirm = $mdDialog.confirm()
                    .title('Delete user')
                    .textContent('Are you sure you want to delete "' + user.username + '"?')
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
                            .hideDelay(3000)
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
                    user.has_tutorial_corpus = true;
                      $mdToast.show(
                        $mdToast.simple()
                        .textContent('Successfully tutorial corpus for ' + user.username + '!')
                            .action('Dismiss')
                            .hideDelay(3000)
                        .position("bottom right"));
                });
            }

        }).catch(function (res) {
            console.log(res)
            $state.go('home');
        });
    });
