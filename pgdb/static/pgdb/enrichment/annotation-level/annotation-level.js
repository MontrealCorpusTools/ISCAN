angular.module('annotationLevel', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('AnnotationLevelCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams) {
	$scope.annotation_options = [{name: "Utterances",
				  type: "utterances"},
				 {name: "Pauses",
				  type: "pauses"}];
	$scope.enrichment = {};
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
	    arr = arr.concat($scope.customWords.split(","));
	    //strip empty strings, null values, etc.
	    arr = arr.filter(function(e) {return e});
	    return arr;
	};

	$scope.print = function(){
		console.log($scope.getCheckedWords());
	};

	$scope.save = function(){
		$scope.enrichment.pause_length = $scope.enrichment.pause_length/1000;
		if($scope.enrichment.enrichment_type == "pauses"){
			$scope.enrichment.pause_label = $scope.getCheckedWords();
		}
		Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res){
			$state.go('enrichment', {corpus_id: $stateParams.corpus_id});
		}).catch(function(res){
			$scope.error_message = res.data;
		});
	};
});
