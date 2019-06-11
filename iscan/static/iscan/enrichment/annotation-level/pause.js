angular.module('pausesEnrichment', [
    'iscan.corpora',
    'iscan.enrichment'
]).controller('PausesEnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {
    $scope.enrichment = {enrichment_type: "pauses"};
    $scope.count = 25;
    $scope.annotation_labels = [];
    $scope.getWords = function () {
        if ($scope.count >= 1) {
            Corpora.words($stateParams.corpus_id, $scope.count).then(function (res) {
                console.log(res.data);
                $scope.words = res.data;
            }).catch(function (res) {
                $scope.error_message = res.data
            });
        }
    };

    djangoAuth.authenticationStatus(true).then(function () {

        $scope.getWords();
    }).catch(function () {
        $state.go('home');
    });


    $scope.getCheckedWords = function () {
        var arr = [];
        for (var i = 0; i < $scope.annotation_labels.length; i++) {
                arr.push($scope.annotation_labels[i]);
        }
        //add user inputted strings
        if ($scope.customWords) {
            arr = arr.concat($scope.customWords.split(","));
        }
        //strip empty strings, null values, etc.
        arr = arr.filter(function (e) {
            return e === "0" || e
        });
        return arr;
    };

    $scope.save = function () {
        $scope.enrichment.pause_label = $scope.getCheckedWords();
        Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
            $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
        }).catch(function (res) {
            $scope.error_message = res.data;
        });
    };

    $scope.help_titles = {
        custom_words: 'Custom Words',
    };
    $scope.help_text = {
        custom_words: "This is the specific words that will be labeled as silence for this corpus. Typically, this will be a word like '<SIL>' but you may choose to also include other non-verbal but vocalised sounds like a cough"
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
