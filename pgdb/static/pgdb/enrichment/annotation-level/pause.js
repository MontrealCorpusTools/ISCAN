angular.module('pausesEnrichment', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('PausesEnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams) {
	$scope.enrichment = {enrichment_type: "pauses"};
	$scope.count = 25;

	$scope.getWords = function(){
		Corpora.words($stateParams.corpus_id, $scope.count).then(function(res){
			$scope.words = JSON.parse(res.data);
		}).catch(function(res){
			$scope.error_message = res.data
		});
	};

	$scope.getWords();

	$scope.getCheckedWords = function(){
	    var arr = [];
	    for (var i = 0; i < $scope.words.length; i++) {   
		    if($scope.words[i].checked){
			    arr.push($scope.words[i].label);
		    }
	    }
	    //add user inputted strings
	    if($scope.customWords){
		    arr = arr.concat($scope.customWords.split(","));
	    }
	    //strip empty strings, null values, etc.
	    arr = arr.filter(function(e) {return e === "0" || e});
	    return arr;
	};

	$scope.save = function(){
		$scope.enrichment.pause_label = $scope.getCheckedWords();
		Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res){
			$state.go('enrichment', {corpus_id: $stateParams.corpus_id});
		}).catch(function(res){
			$scope.error_message = res.data;
		});
	};
});
