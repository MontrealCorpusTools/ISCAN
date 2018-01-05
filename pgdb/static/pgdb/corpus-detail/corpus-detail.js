angular.module('corpusDetail', [
    'pgdb.corpora'
])
    .controller('CorpusDetailCtrl', function ($scope, Corpora, $state, $stateParams) {
        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
        });

        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
        });
    });