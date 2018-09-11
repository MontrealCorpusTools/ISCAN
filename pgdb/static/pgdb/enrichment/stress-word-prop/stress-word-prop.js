angular.module('stressWordPropEnrichment', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('StressWordPropEnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth) {


    djangoAuth.authenticationStatus(true).then(function () {
        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            console.log($scope.hierarchy);
            $scope.word_properties = $scope.hierarchy.type_properties.word.map(function (x) {
                return {"name": x[0], "type": x[0]};
            });
            console.log($scope.word_properties);
        });
    }).catch(function () {
        $state.go('home');
    });


    $scope.enrichment = {enrichment_type: "patterned_stress"};

    $scope.save = function () {
        Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
            $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
        }).catch(function (res) {
            $scope.error_message = res.data;
        });
    };
});
