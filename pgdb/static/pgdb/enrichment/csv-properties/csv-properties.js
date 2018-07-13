angular.module('csvProperties', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('CSVPropertiesCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams) {
    $scope.csv_options = [
        {
            name: 'Speaker CSV',
            type: 'speaker_csv'
        },
        {
            name: 'Lexicon CSV',
            type: 'lexicon_csv'
        },
        ];
    $scope.enrichment = {source: 'praat'};
    $scope.save = function(){
        Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res){
            $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
        }).catch(function(res){
            $scope.error_message = res.data;
        });
    };
    $scope.hasFiles = false;
    $scope.newFiles = function(e){
	    $scope.$apply(function () {
		    $scope.hasFiles = document.getElementById('CSV-properties-file').files.length > 0;
	    });
    };
    $scope.uploadCSVProperties = function(){
	    var f = document.getElementById('CSV-properties-file').files[0],
	    r = new FileReader();
	    r.onloadend = function(e) {
		    var data = e.target.result;
		    console.log(data);
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
