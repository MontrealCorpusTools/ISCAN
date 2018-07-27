angular.module('enrichment', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('EnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, $timeout) {

        $scope.$on('unauthenticated', function(){
            $state.go('home');
        });

        var loadTime = 10000, //Load the data every second
            errorCount = 0, //Counter for the server errors
            loadPromise; //Pointer to the promise created by the Angular $timout service


        var getData = function () {
            Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
            console.log($scope.corpus);
            if ($scope.corpus.imported) {
                Corpora.status($stateParams.corpus_id).then(function (res) {
                    $scope.corpus_status = res.data;
                });

                Enrichment.all($stateParams.corpus_id).then(function (res) {
                    $scope.enrichments = res.data;
                });
            }
            else if ($scope.corpus.busy){


            }
            nextLoad(loadTime);
        });
        };

	$scope.sortEnrichmentsBy = 'completed';
	$scope.reverseEnrichments = false;
	$scope.tableSortExpression = function(e){
	    if($scope.sortEnrichmentsBy == 'runnable') {
		    return e['runnable'] == 'runnable';
	    }
	    return e[$scope.sortEnrichmentsBy];
	};

        var cancelNextLoad = function () {
            $timeout.cancel(loadPromise);
        };

        var nextLoad = function (mill) {
            mill = mill || loadTime;

            //Always make sure the last timeout is cleared before starting a new one
            cancelNextLoad();
            loadPromise = $timeout(getData, mill);
        };


        //Start polling the data from the server
        getData();


        //Always clear the timeout when the view is destroyed, otherwise it will keep polling and leak memory
        $scope.$on('$destroy', function () {
            cancelNextLoad();
        });

        $scope.runEnrichment = function (enrichment_id) {
            Enrichment.run($stateParams.corpus_id, enrichment_id).then(function (res) {
            getData();
            });
        };
        $scope.resetEnrichment = function(enrichment_id){
            Enrichment.reset($stateParams.corpus_id, enrichment_id).then(function (res) {
            getData();
            });
        };

	$scope.isEnrichmentEditable = function(enrichment) {
		return ['subset', 'hierarchical_property', 'pitch', 'formants', 'intensity', 'refined_formant_points'].includes(enrichment.enrichment_type);
	}

        $scope.editEnrichment = function(enrichment) {
	    if ($scope.isEnrichmentEditable(enrichment)) {
		    if (enrichment.enrichment_type == 'subset') {
			$state.go('edit_subset', {corpus_id: $stateParams.corpus_id, enrichment_id: enrichment.id});
		    }
		    // Else, go to other relevant edit page that we'll build later
		    else if (enrichment.enrichment_type == 'hierarchical_property') {
			$state.go('edit_hierarchical_property', {corpus_id: $stateParams.corpus_id, enrichment_id: enrichment.id});
		    }
		    else if (['pitch', 'formants', 'intensity', 'refined_formant_points', 'praat_script'].includes(enrichment.enrichment_type)) {
			$state.go('edit_acoustic_enrichment', {corpus_id: $stateParams.corpus_id, enrichment_id: enrichment.id});
		    }
            }else{
                alert("You cannot edit this enrichment.");
	    }
        };

	$scope.isEnrichmentDeletable = function(enrichment) {
	    if (enrichment.runnable != 'runnable' || !enrichment.completed){
		    return true;
	    }
	    return !['discourse_csv', 'speaker_csv', 'lexicon_csv', 'refined_formant_points', 'patterened_stress', 'praat_script'].includes(enrichment.enrichment_type);

	};

        $scope.deleteEnrichment = function(enrichment) {
            if ($scope.isEnrichmentDeletable(enrichment)) {
                if (confirm("Are you sure you want to delete the subset \"" + enrichment.name + "\" ?")) {
                    console.log("Deleting " + enrichment.name + "...");
                    Enrichment.destroy($stateParams.corpus_id, enrichment.id)
                }
            }
            else {
                alert("You cannot delete this enrichment.")
            }
        };

        $scope.createUtterances = function(){
           $state.go('new_utterances', {corpus_id: $stateParams.corpus_id})
        };

        $scope.createPauses = function(){
           $state.go('new_pauses', {corpus_id: $stateParams.corpus_id})
        };

        $scope.createSyllables = function(){
           $state.go('new_syllables', {corpus_id: $stateParams.corpus_id})
        };

        $scope.newCSVProperties = function(){
		$state.go('new_csv-properties', {corpus_id: $stateParams.corpus_id});
        };

        $scope.newPhoneSubset = function(type){
            console.log('Going to create a new phone subset...');
            $state.go('new_subset', {corpus_id: $stateParams.corpus_id, type: 'phone'});
        }

        $scope.createAcoustics = function(){
           $state.go('acoustic_enrichment', {corpus_id: $stateParams.corpus_id});
        };

        $scope.newHierarchicalProperty = function(){
            console.log("New hierarchical property...");
            $state.go('new_hierarchical_property', {corpus_id: $stateParams.corpus_id});
        };
        $scope.newStressWordProp= function(){
            $state.go('new_stress-word-prop', {corpus_id: $stateParams.corpus_id});
        };

}).directive('tooltip', function() {
	return {
		restrict: 'A',
		link: function(scope, element, attrs){
			element.hover(function(){
				element.tooltip('show');
			}, function(){
			       element.tooltip('hide');
			});
		}
	};
});
