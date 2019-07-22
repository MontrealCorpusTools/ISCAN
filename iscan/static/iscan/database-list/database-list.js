angular.module('databaseList', [
    'iscan.databases',
    'iscan.corpora',
    'iscan.errors'
])
    .controller('DatabaseListCtrl', function ($scope, Databases, Corpora, Errors, $state, $location, djangoAuth, Users, $mdDialog, $mdToast) {
        $scope.refresh_button_text = 'Refresh';

        $scope.refreshDatabaseList = function () {
            $scope.refresh_button_text = 'Refreshing...';
            Databases.refreshDatabaseList().then(function (res) {
                $scope.databases = res.data;

                $scope.refresh_button_text = 'Refresh';
            });
        };
        $scope.refreshDatabases = function () {
            Databases.all().then(function (res) {
                $scope.databases = res.data;
            });

        };
        $scope.startDatabase = function (db, ev) {
            db.busy = true;
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Starting ' + db.name + ' database...')
                    .hideDelay(3000)
                    .position("bottom right"));

            Databases.start(db.id).then(function (res) {

                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Database "' + db.name + '" successfully started!')
                        .position("bottom right")
                        .hideDelay(3000)
                        .highlightAction(true));
                $scope.refreshDatabases();
            }).catch(function (res) {
                db.busy = false;
                Errors.popUp("There was an error starting the database.", res);
                console.log(res);
            });
        };

        $scope.stopDatabase = function (db, ev) {
            db.busy = true;
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Stopping ' + db.name + ' database...')
                    .hideDelay(3000)
                    .position("bottom right"));

            Databases.stop(db.id).then(function (res) {

                $mdToast.show(
                    $mdToast.simple()
                        .textContent('Database "' + db.name + '" successfully stopped!')
                        .position("bottom right")
                        .hideDelay(3000)
                        .highlightAction(true));
                $scope.refreshDatabases();
            }).catch(function (res) {
                db.busy = false;
                Errors.popUp("There was an error stopping the database.", res);
                console.log(res);
            });
        };

        $scope.deleteDatabase = function (db, ev) {


            var confirm = $mdDialog.confirm()
                .title('Delete database')
                .textContent('Are you sure you want to delete "' + db.name + '"?')
                .ariaLabel('Delete database')
                .targetEvent(ev)
                .ok('Delete')
                .cancel('Cancel');

            $mdDialog.show(confirm).then(function () {
                db.busy = true;

                Databases.delete(db.id).then(function (res) {

                    $mdToast.show(
                        $mdToast.simple()
                            .textContent('Database "' + db.name + '" successfully deleted!')
                            .position("bottom right")
                            .hideDelay(3000)
                            .highlightAction(true));
                    $scope.refreshDatabases();

                }).catch(function (res) {
                    db.busy = false;
                    Errors.popUp("There was an error starting the database.", res);
                    console.log(res);
                })

            });
        };
        djangoAuth.authenticationStatus(true).then(function () {
            Users.current_user().then(function (res) {
                $scope.user = res.data;
            });

            $scope.host = $location.host();

            $scope.refreshDatabases();


        }).catch(function () {
            $state.go('home');
        });


    });
