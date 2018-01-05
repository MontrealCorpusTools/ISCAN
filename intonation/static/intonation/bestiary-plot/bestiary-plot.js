angular.module('bestiaryPlot', [
    'pgdb.utterances'
])
    .controller('BestiaryPlotCtrl', function ($scope, Utterances, $state, $stateParams) {
        Utterances.all($stateParams.corpus_id,true).then(function(res){
            $scope.utterances = res.data.utterances;
            $scope.metadata = res.data.metadata;
        })

    });