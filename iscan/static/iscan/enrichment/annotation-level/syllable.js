angular.module('syllableEnrichment', [
    'iscan.corpora',
    'iscan.enrichment'
]).controller('SyllableEnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {

    djangoAuth.authenticationStatus(true).then(function () {

        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            $scope.phone_class_options = $scope.hierarchy.subset_types.phone;
        });

        if ($stateParams.enrichment_id == null) {
            $scope.newEnrichment = true;
            $scope.enrichment = {enrichment_type: "syllables"};
        } else {
            $scope.newEnrichment = false;
            Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
                $scope.enrichment = res.data.config;
            });
        }
    }).catch(function () {
        $state.go('home');
    });
    $scope.algorithm_options = [{
        name: 'Max Onset',
        type: 'maxonset'
    }];


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
        algorithm: 'Algorithm',
        phone_class: 'Syllabic subset',
    };
    $scope.help_text = {
        algorithm: 'Specify the algorithm for syllabification.  Currently, only Max Onset is supported.',
        phone_class: 'Specify the phone subset for syllabic segments.'
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
