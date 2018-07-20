angular.module('acoustics', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('AcousticCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams) {
    Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
	    $scope.hierarchy = res.data;
	    $scope.phone_class_options = $scope.hierarchy.subset_types.phone;
	    console.log($scope.phone_class_options);
    });
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
            type: 'praat_script'
        }];
    $scope.error_message = '';
    $scope.binary_options = ['praat'];
    $scope.phone_class = [{name:'test', type: 'test'}];
    $scope.enrichment = {source: 'praat'};
    $scope.uploadFile = function(id, file_id){
	    var f = document.getElementById(file_id).files[0],
	    r = new FileReader();
	    var name = f.name;
	    r.onloadend = function(e) {
		    var data = e.target.result;
		    var resp = {text: data, file_name: name};
		    Enrichment.create_file($stateParams.corpus_id, id, resp);
	    }
	    r.readAsText(f);
    };
    $scope.save = function () {
        Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res){
	    if($scope.enrichment.enrichment_type == 'praat_script'){
		    $scope.uploadFile(res.data.id, "praat-script-file");
	    }else if($scope.enrichment.enrichment_type == 'refined_formant_points'){
		    if(document.getElementById(file_id).files.length > 0){
			    $scope.uploadFile(res.data.id, "formants-file");
		    }
	    }
            $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
        }).catch(function(res){
            $scope.error_message = res.data;
        });
    }
});
