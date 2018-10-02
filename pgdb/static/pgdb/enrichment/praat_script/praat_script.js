angular.module('praat_script', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('PraatScriptCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {


    djangoAuth.authenticationStatus(true).then(function () {

        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            $scope.phone_class_options = $scope.hierarchy.subset_types.phone;
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
        r.onloadend = function (e) {
            var data = e.target.result;
            var resp = {text: data, file_name: name};
            Enrichment.create_file($stateParams.corpus_id, id, resp).then(function (res) {
                if (res.data) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }
            }).catch(function (res) {
                $scope.error_message = res.data;
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
        phone_class: 'Phone class'
    };
    $scope.help_text = {
        praat_script: 'Specify a Praat script to run.  This Praat script must be in a certain format, ' +
        'see the tutorial for more details.',
        phone_class: 'Optionally specify a subset of phones to run this script on.'
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
