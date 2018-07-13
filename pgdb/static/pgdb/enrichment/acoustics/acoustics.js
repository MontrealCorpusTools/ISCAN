angular.module('acoustics', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('AcousticCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams) {
    $scope.acoustic_options = [{
        name: 'Pitch tracks',
        type: 'pitch'
    },
        {
            name: 'Formant tracks',
            type: 'formants'
        },
        {
            name: 'Intensity tracks',
            type: 'intensity'
        },
        {
            name: 'FAVE-style point formants',
            type: 'refined_formant_points'
        },
        {
            name: 'Custom praat script',
            type: 'sibilant_script'
        }];
    $scope.error_message = '';
    $scope.binary_options = ['praat'];
    $scope.enrichment = {source: 'praat'};
    $scope.save = function () {
        Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res){
            $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
        }).catch(function(res){
            $scope.error_message = res.data;
        });
    }
});
