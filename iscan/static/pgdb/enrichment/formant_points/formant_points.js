angular.module('formant_points', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('FormantPointCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {




        djangoAuth.authenticationStatus(true).then(function () {

	Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
        $scope.hierarchy = res.data;
        $scope.phone_class_options = $scope.hierarchy.subset_types.phone;
    });
        }).catch(function(){
                $state.go('home');
        });

    $scope.error_message = '';
    if ($stateParams.enrichment_id == null) {
        $scope.newAcoustic = true;
        $scope.enrichment = {enrichment_type: "refined_formant_points", number_of_iterations: 1};
    } else {
        $scope.newAcoustic = false;
        Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
            $scope.enrichment = res.data.config;
        });
    }
    $scope.uploadFile = function (id, file_id) {
        var f = document.getElementById(file_id).files[0],
            r = new FileReader();
        var name = f.name;
	r.readAsDataURL(f);
        r.onloadend = function (e) {
            var data = e.target.result;
            var resp = {text: data, file_name: name};
            Enrichment.create_file($stateParams.corpus_id, id, resp).then(function (res) {
                if (res.data) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }
            }).catch(function (res) {
                $scope.error_message = res.data;
		if($scope.newAcoustic){
			//Delete half made enrichments which are new. 
			Enrichment.destroy($stateParams.corpus_id, id).catch(function (res) {
			    console.log(res);
			})
		}
            });
        };
        r.readAsText(f);
    };
    $scope.save = function () {
        if ($scope.newAcoustic) {
            Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                    if (document.getElementById("formants-file").files.length > 0) {
                        $scope.uploadFile(res.data.id, "formants-file");
                    }
                else {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});

                }
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        } else {
            Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                    if (document.getElementById("formants-file").files.length > 0) {
                        $scope.uploadFile($stateParams.enrichment_id, "formants-file");
                    }
                else {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});

                }
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        }
    };


    $scope.help_titles = {
        phone_class: 'Phone class',
        num_iterations: 'Number of iterations',
        duration_threshold: 'Minimum duration',
        vowel_prototypes: 'Vowel Prototypes CSV'
    };
    $scope.help_text = {
        phone_class: 'Specify the subset of phones that represents vowel or other segments that should have ' +
        'their formants analyzed.',
        num_iterations: 'Specify the number of refinement iterations.  There is a minimum of 1 iteration ' +
        'that must be done, further iterations may improve convergence and more accurate measurements, but ' +
        'each iteration can take a significant amount of time.',
        duration_threshold: 'Optionally specify the minimum duration of a phone to be analyzed (in milliseconds).',
        vowel_prototypes: 'Optionally specify a CSV file that contains formant measure prototypes for use ' +
        'in seeding the algorithm before the first refinement iteration.  If not specified, these prototypes ' +
        'are generated from the data.'
    };

    $scope.newFiles = function (e) {
        $scope.$apply(function () {
            $scope.hasFiles = document.getElementById('formants-file').files.length > 0;
            $scope.fileName = '';
            if ($scope.hasFiles){
            $scope.fileName = document.getElementById('formants-file').files[0].name;

            }
        });
    };

    $scope.getHelp = function (ev, helpType) {
        // Appending dialog to document.body to cover sidenav in docs app
        // Modal dialogs should fully cover application
        // to prevent interaction outside of dialog
        $mdDialog.show(
            $mdDialog.alert()
                .parent(angular.element(document.querySelector('html')))
                .clickOutsideToClose(true)
                .title($scope.help_titles[helpType])
                .textContent($scope.help_text[helpType])
                .ariaLabel('Help')
                .ok('Got it!')
                .targetEvent(ev)
        );
    };

});
