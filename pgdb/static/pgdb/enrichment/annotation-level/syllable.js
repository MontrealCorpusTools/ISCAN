angular.module('syllableEnrichment', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('SyllableEnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth) {

        djangoAuth.authenticationStatus(true).then(function () {

	Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
	        $scope.hierarchy = res.data;
	        $scope.phone_class_options = $scope.hierarchy.subset_types.phone;
	});
        }).catch(function(){
                $state.go('home');
        });
        $scope.algorithm_options = [{
            name: 'Max Onset',
            type: 'maxonset'
        }];

	$scope.enrichment = {enrichment_type: "syllables"};

	$scope.save = function(){
		$scope.enrichment.pause_length = $scope.enrichment.pause_length/1000;
		Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res){
			$state.go('enrichment', {corpus_id: $stateParams.corpus_id});
		}).catch(function(res){
			$scope.error_message = res.data;
		});
	};
});
