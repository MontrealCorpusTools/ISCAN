angular.module('navbar', [
    'pgdb.corpora'
])
    .controller('NavCtrl', function ($scope, Corpora) {

        Corpora.all().then(function (res) {
            $scope.corpora = res.data;
            console.log($scope.corpora);
        });
    }).directive('navbar', function(){

    return {
        restrict: 'E',
        replace: true,
        templateUrl: static('pgdb/navbar/navbar.html'),
        scope: {
        },
        controller: 'NavCtrl'
    }
});