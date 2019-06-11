angular.module('pitch_tracks', [
    'iscan.corpora',
    'iscan.enrichment'
]).controller('PitchTrackCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {


    djangoAuth.authenticationStatus(true).then(function () {

        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
        });
    }).catch(function () {
        $state.go('home');
    });

    $scope.error_message = '';
    $scope.binary_options = ['praat'];
    if ($stateParams.enrichment_id == null) {
        $scope.newEnrichment = true;
        $scope.enrichment = {enrichment_type: "pitch", source: 'praat'};
    } else {
        $scope.newEnrichment = false;
        Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
            $scope.enrichment = res.data.config;
        });
    }

    $scope.save = function () {
        if ($scope.newEnrichment) {
            Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        } else {
            Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        }
    };


    $scope.help_titles = {
        source: 'Source program',
    };
    $scope.help_text = {
        source: 'Specify the program to use for analysis.  Currently, only Praat is supported.'
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
