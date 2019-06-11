angular.module('databaseDetail', [
    'iscan.databases'
])
    .controller('DatabaseDetailCtrl', function ($scope, Databases, $state, $stateParams, $location) {
        $scope.host = $location.host();
        Databases.one($stateParams.database_id).then(function (res) {
            $scope.database = res.data;
        });

        Databases.corpora($stateParams.database_id).then(function (res) {
            $scope.corpora = res.data;
        });
    });