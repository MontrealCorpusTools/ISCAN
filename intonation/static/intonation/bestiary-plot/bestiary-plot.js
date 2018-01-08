angular.module('bestiaryPlot', [
    'pgdb.utterances'
])
    .controller('BestiaryPlotCtrl', function ($scope, Utterances, Corpora, $state, $stateParams) {
        Utterances.all($stateParams.corpus_id, true).then(function (res) {
            $scope.utterances = res.data;
        });


        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
        });

        $scope.$on('DETAIL_REQUESTED', function (e, res) {
            $state.go('utterance-detail', {corpus_id: $stateParams.corpus_id, utterance_id:res});
        });

        $scope.$on('SOUND_REQUESTED', function (e, res) {

            var snd = new Audio(Utterances.sound_file_url($scope.corpus.name, res)); // buffers automatically when created
            snd.play();

        });
    });