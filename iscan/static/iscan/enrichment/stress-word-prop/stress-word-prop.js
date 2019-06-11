angular.module('stressWordPropEnrichment', [
    'iscan.corpora',
    'iscan.enrichment'
]).controller('StressWordPropEnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {


    djangoAuth.authenticationStatus(true).then(function () {
        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            console.log($scope.hierarchy);
            $scope.word_properties = $scope.hierarchy.type_properties.word.map(function (x) {
                return {"name": x[0], "type": x[0]};
            });
            console.log($scope.word_properties);
        });
    }).catch(function () {
        $state.go('home');
    });


    $scope.enrichment = {enrichment_type: "patterned_stress"};

    $scope.save = function () {
        Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
            $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
        }).catch(function (res) {
            $scope.error_message = res.data;
        });
    };
    $scope.help_titles = {
        word_property: 'Word property',
    };
    $scope.help_text = {
        word_property: 'Specify which property to use for encoding syllable stress. ' +
        'The property should have syllable stress separated by dashes (i.e., "1-0" for "dashes"). ' +
        'If there is a mismatch in the number of syllables in this property and in the database, the word\'s ' +
        'syllables will not have any stress encoded.'
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
