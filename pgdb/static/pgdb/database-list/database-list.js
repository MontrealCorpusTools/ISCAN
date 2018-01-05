angular.module('databaseList', [
    'pgdb.databases'
])
    .controller('DatabaseListCtrl', function ($scope, Databases, $state, $location) {
        $scope.start_button = 'Start';
        $scope.stop_button = 'Stop';
        $scope.delete_button = 'Delete';
        $scope.host = $location.host();
        $scope.newDatabase = {};
        $scope.addDatabase = function () {
            Databases.addOne($scope.newDatabase).then($scope.refreshDatabases);
            $scope.newDatabase = {}
        };
        $scope.refreshDatabases = function () {
            Databases.all().then(function (res) {
                $scope.databases = res.data;
                angular.forEach($scope.databases, function(db){
                    db.start_button = 'Start';
                    db.stop_button = 'Stop';
                    db.delete_button = 'Delete';
                });
                console.log($scope);
            });

        };
        $scope.refreshDatabases();

        $scope.startDatabase = function (db) {
            db.start_button = 'Starting...';
            Databases.start(db.id).then(function (res) {
                $scope.refreshDatabases();
                db.start_button = 'Start';
            });
        };

        $scope.stopDatabase = function (db) {
            db.stop_button = 'Stopping...';

            Databases.stop(db.id).then(function (res) {
                $scope.refreshDatabases();
                db.stop_button = 'Stop';
            });
        };

        $scope.deleteDatabase = function (id) {
            Databases.delete(id);
            // update the list in ui
            $scope.databases = $scope.databases.filter(function (database) {
                return database.id !== id;
            })
        };

    });