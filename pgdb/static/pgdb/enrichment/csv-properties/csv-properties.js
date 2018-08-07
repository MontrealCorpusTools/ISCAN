angular.module('csvProperties', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('CSVPropertiesCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams) {
    
    if ($stateParams.enrichment_id == null) {
	    $scope.newCSV= true;
	    $scope.enrichment = {source: 'praat', number_of_iterations: 1};
	    $scope.hasFiles = false;
    }else{
	    $scope.newCSV = false;
	    $scope.hasFiles = true;
            Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
                $scope.enrichment = res.data.config;
            });
    }

    $scope.csv_options = [
        {
            name: 'Speaker CSV',
            type: 'speaker_csv'
        },
        {
            name: 'Lexicon CSV',
            type: 'lexicon_csv'
        },
        {
            name: 'Phone CSV',
            type: 'phone_csv'
        },
        {
            name: 'Sound file CSV',
            type: 'discourse_csv'
        },
        ];
    $scope.enrichment = {};
    $scope.save = function(){
	if($scope.enrichment.path == null && document.getElementById('CSV-properties-file').files.length == 0){
		$scope.error_message = "You must upload a file";
	}else if($scope.newCSV){
		Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res){
		    $scope.uploadCSVProperties(res.data.id);
		    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
		}).catch(function(res){
		    $scope.error_message = res.data;
		});
	}else{
		Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
		    if(document.getElementById('CSV-properties-file').files.length > 0){
			    $scope.uploadCSVProperties($stateParams.enrichment_id);
		    }
		    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
		}).catch(function(res){
		    $scope.error_message = res.data;
		});
	}
    };
    $scope.newFiles = function(e){
	    $scope.$apply(function () {
		    $scope.hasFiles = document.getElementById('CSV-properties-file').files.length > 0;
	    });
    };

    $scope.uploadCSVProperties = function(id){
	    var f = document.getElementById('CSV-properties-file').files[0],
	    r = new FileReader();
	    var name = f.name;
	    r.onloadend = function(e) {
		    var data = e.target.result;
		    var resp = {text: data, file_name: name};
		    Enrichment.create_file($stateParams.corpus_id, id, resp);
	    }
	    r.readAsText(f);
    };
}).directive('customOnChange', function() {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			var onChangeHandler = scope.$eval(attrs.customOnChange);
			element.on('change', onChangeHandler);
			element.on('$destroy', function() {
				element.off();
			});
		}
	};	
});
