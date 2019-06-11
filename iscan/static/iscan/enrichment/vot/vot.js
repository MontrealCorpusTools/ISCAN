angular.module('vot', [
    'iscan.corpora',
    'iscan.enrichment'
]).controller('VOTCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {


    djangoAuth.authenticationStatus(true).then(function () {
	    Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
		$scope.hierarchy = res.data;
		$scope.phone_subsets = $scope.hierarchy.subset_types.phone.concat($scope.hierarchy.subset_tokens.phone);
	    });
    })

    if ($stateParams.enrichment_id == null) {
        $scope.newVOT = true;
        $scope.using_custom_classifier = false;
        $scope.enrichment = {enrichment_type: "vot", overwrite_edited:false};
    } else {
        $scope.newVOT = false;
        $scope.using_custom_classifier = false;
        Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
            $scope.enrichment = res.data.config;
        });
    }

    $scope.save = function () {
        if ($scope.using_custom_classifier && document.getElementById('vot-classifier').files.length == 0) {
            $scope.error_message = "You must upload a classifier"
            return;
        }

        if ($scope.newVOT) {
            Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                if($scope.using_custom_classifier){
                             $scope.uploadVOTClassifier(res.data.id);
                }else{
                         $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        } else {
            Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                if($scope.using_custom_classifier){
                     $scope.uploadVOTClassifier($stateParams.enrichment_id);
                }else{
                     $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        }
    };

    $scope.help_titles = {
        stop_subset: 'Stops subset',
        classifier: 'Classifier',
        vot_minmax: 'VOT Minimum and Maximum',
        window_minmax: 'Window Minimum and Maximum',
        edited: 'Overwrite manually edited VOTs'
    };

    $scope.help_text = {
        stop_subset: 'This is the subset of phones that will have their VOTs calculated',
	classifier: 'This is the classifier that will be used. If unchecked, it will default to a classifier trained on voiceless word-initial VOTs in SOTC. The file format for classifier is a zip file containing both the pos and neg files from an AutoVOT trained classifier',
        vot_minmax: 'These values represent the minimum and maximum values of the VOT calculated. A minimum value of 15 ms will ensure that the difference between the closure and onset of voicing will be at least 15 ms.',
        window_minmax: 'This value represents the size of the window that will be analyzed for features. A minimum value of -30 ms means that the algorithm will begin looking for the closure 30 ms before the beginning of phone interval. A maximum value of 30 ms means that it will look at most 30 ms past the end of the phone interval',
        edited: 'If checked, any VOTs that were manually edited in the inspection view will be overwritten'
    };

    $scope.setToDefault = function(voiced) {
        if(voiced){
            $scope.enrichment.vot_min = 5;
            $scope.enrichment.vot_max = 100;
        }else{
            $scope.enrichment.vot_min = 15;
            $scope.enrichment.vot_max = 250;
        }
        $scope.enrichment.window_min = -30;
        $scope.enrichment.window_max = 30;
    }

    $scope.uploadVOTClassifier = function (id) {
        var f = document.getElementById('vot-classifier').files[0],
            r = new FileReader();
        var name = f.name;
        r.readAsDataURL(f);
        r.onloadend = function (e) {
            var data = e.target.result;
            var resp = {text: data, file_name: name};
            Enrichment.create_file($stateParams.corpus_id, id, resp).then(function (e) {
                if (e.data) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }
            }).catch(function (res) {
                $scope.error_message = res.data;
		if($scope.newVOT){
			//Delete half made custom classifier enrichments which are new. 
			Enrichment.destroy($stateParams.corpus_id, id).catch(function (res) {
			    console.log(res);
			})
		}
            });
        }
        r.readAsText(f);
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
