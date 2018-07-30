angular.module('acoustics', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('AcousticCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams) {
    Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
	    $scope.hierarchy = res.data;
	    $scope.phone_class_options = $scope.hierarchy.subset_types.phone;
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
    if ($stateParams.enrichment_id == null) {
	    $scope.newAcoustic = true;
	    $scope.enrichment = {source: 'praat', number_of_iterations: 1};
    }else{
	    $scope.newAcoustic = false;
            Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
                $scope.enrichment = res.data.config;
            });
    }
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
	if($scope.newAcoustic){
		Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res){
		    if($scope.enrichment.enrichment_type == 'praat_script'){
			    $scope.uploadFile(res.data.id, "praat-script-file");
		    }else if($scope.enrichment.enrichment_type == 'refined_formant_points'){
			    $scope.enrichment.duration_threshold = $scope.enrichment.duration_threshold;
			    if(document.getElementById("formants-file").files.length > 0){
				    $scope.uploadFile(res.data.id, "formants-file");
			    }
		    }
		    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
		}).catch(function(res){
		    $scope.error_message = res.data;
		});
	}else{
		Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.hp).then(function (res) {
		    if($scope.enrichment.enrichment_type == 'praat_script'){
			    $scope.uploadFile(res.data.id, "praat-script-file");
		    }else if($scope.enrichment.enrichment_type == 'refined_formant_points'){
			    $scope.enrichment.duration_threshold = $scope.enrichment.duration_threshold/1000;
			    if(document.getElementById("formants-file").files.length > 0){
				    $scope.uploadFile(res.data.id, "formants-file");
			    }
		    }
		    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
		}).catch(function(res){
		    $scope.error_message = res.data;
		});
	}
    }
});
