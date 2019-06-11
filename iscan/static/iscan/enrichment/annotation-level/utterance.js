angular.module('utterancesEnrichment', [
    'iscan.corpora',
    'iscan.enrichment'
]).controller('UtterancesEnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {
    $scope.enrichment = {enrichment_type: "utterances",
                            pause_length: 150};

    djangoAuth.authenticationStatus(true).then(function () {

    }).catch(function () {
        $state.go('home');
    });

    $scope.save = function () {
        Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
            $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
        }).catch(function (res) {
            $scope.error_message = res.data;
        });
    };

    $scope.help_titles = {
        pause_length: 'Utterance gap',
    };
    $scope.help_text = {
        pause_length: 'Specify the length of pauses (in milliseconds) between utterance to count as an utterance break. ' +
        'Set to 0 to make every pause an utterance break.  If you want to ensure each sound file only has one utterance, ' +
        'set this field to a very high number (i.e. 100000).',
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
