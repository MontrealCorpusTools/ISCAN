angular.module('praat_script', [
    'iscan.corpora',
    'iscan.enrichment'
]).controller('PraatScriptCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {


    djangoAuth.authenticationStatus(true).then(function () {

        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            $scope.annotation_types = $scope.hierarchy.annotation_types;

            //Combine subsets of type and token into one array
            $scope.subsets = {};
            $scope.annotation_types.forEach(x => {
                //Return an empty list if there's no subset of that type
                let a = $scope.hierarchy.subset_types[x] ? $scope.hierarchy.subset_types[x] : [];
                let b = $scope.hierarchy.subset_tokens[x] ? $scope.hierarchy.subset_tokens[x] : [];
                $scope.subsets[x] = a.concat(b);
            });
        });
    }).catch(function () {
        $state.go('home');
    });
    $scope.showHints = true;
    $scope.error_message = '';
    if ($stateParams.enrichment_id == null) {
        $scope.newEnrichment = true;
        $scope.enrichment = {enrichment_type: "praat_script"};
    } else {
        $scope.newEnrichment = false;
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
		if($scope.newEnrichment){
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
        if ($scope.newEnrichment) {
            Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                $scope.uploadFile(res.data.id, "praat-script-file");

            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        } else {
            Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                $scope.uploadFile($stateParams.enrichment_id, "praat-script-file");

            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        }
    };

    $scope.help_titles = {
        praat_script: 'Choose Praat script',
        annotation_type: 'Annotation Type', 
        subset: 'Subset'
    };
    $scope.help_text = {
        praat_script: 'Specify a Praat script to run.  This Praat script must be in a certain format, ' +
        'see the tutorial for more details.',
        annotation_type: 'The specific kind of annotation over which the praat script will be run',
        subset: 'Optionally specify a subset of an annotation type to run this script on.'
    };

    $scope.newFiles = function (e) {
        $scope.$apply(function () {
            $scope.hasFiles = document.getElementById('praat-script-file').files.length > 0;
            $scope.fileName = '';
            if ($scope.hasFiles){
            $scope.fileName = document.getElementById('praat-script-file').files[0].name;

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
