angular.module('annotationLevel', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('AnnotationLevelCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams) {
    $scope.annotation_options = [{name: "Utterances",
                                  type: "utterances"},
                                 {name: "Pauses",
                                  type: "pauses"}];
    $scope.enrichment = {};
    $scope.save = function(){
	$scope.enrichment.pause_length = $scope.enrichment.pause_length/1000;
        Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res){
            $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
        }).catch(function(res){
            $scope.error_message = res.data;
        });
    };
});
