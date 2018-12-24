angular.module('pausesEnrichment', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('PausesEnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {
    $scope.enrichment = {enrichment_type: "pauses"};
    $scope.count = 25;
    $scope.annotation_labels = [];
    $scope.getWords = function () {
        if ($scope.count >= 1) {
            Corpora.words($stateParams.corpus_id, $scope.count).then(function (res) {
                console.log(res.data);
                $scope.words = res.data;
            }).catch(function (res) {
                $scope.error_message = res.data
            });
        }
    };

    djangoAuth.authenticationStatus(true).then(function () {

        $scope.getWords();
    }).catch(function () {
        $state.go('home');
    });


    $scope.getCheckedWords = function () {
        var arr = [];
        for (var i = 0; i < $scope.annotation_labels.length; i++) {
                arr.push($scope.annotation_labels[i]);
        }
        //add user inputted strings
        if ($scope.customWords) {
            arr = arr.concat($scope.customWords.split(","));
        }
        //strip empty strings, null values, etc.
        arr = arr.filter(function (e) {
            return e === "0" || e
        });
        return arr;
    };

    $scope.save = function () {
        $scope.enrichment.pause_label = $scope.getCheckedWords();
        Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
            $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
        }).catch(function (res) {
            $scope.error_message = res.data;
        });
    };
});
