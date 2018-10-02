angular.module('relativization', [
    'pgdb.corpora',
    'pgdb.query',
    'pgdb.enrichment'
]).filter('onlyNumeric', function () {
    return function (input) {
        if (input == undefined) {
            return []
        }
        var a = [];
        for (i = 0; i < input.length; i++) {
            if (input[i][1] === 0) {

                a.push(input[i][0])
            }
        }
        return a;
    };
})
    .controller('TrackRelativizationCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, Enrichment, djangoAuth, $mdDialog) {
        $scope.newEnrichment = false;
        if ($stateParams.enrichment_id == null) {
            $scope.newEnrichment = true;
        }

        djangoAuth.authenticationStatus(true).then(function () {
            Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
                $scope.hierarchy = res.data;
                console.log($scope.hierarchy);
                $scope.avaiilable_acoustics = [];
                if ($scope.hierarchy.has_pitch_tracks) {
                    $scope.avaiilable_acoustics.push({name: 'Pitch tracks', value: 'relativize_pitch'})
                }
                if ($scope.hierarchy.has_intensity_tracks) {
                    $scope.avaiilable_acoustics.push({name: 'Intensity tracks', value: 'relativize_intensity'})
                }
                if ($scope.hierarchy.has_formant_tracks) {
                    $scope.avaiilable_acoustics.push({name: 'Formant tracks', value: 'relativize_formants'})
                }
            });
        }).catch(function () {
            $state.go('home');
        });


        if (!$scope.newEnrichment) {
            Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
                $scope.enrichment = res.data;
                // Change display name to existing name
            });
        }
        // If starting from new, get list of all possible phones
        else {

            $scope.enrichment = {
                enrichment_type: null,
                by_speaker: false
            };

        }
        $scope.createEnrichment = function () {
            // Create from scratch
            console.log($scope.enrichment);

            if ($scope.newEnrichment) {
                Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function (res) {
                    $scope.error_message = res.data;
                });
            }
            // Edit existing
            else {
                Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function (res) {
                    $scope.error_message = res.data;
                });
            }
        };
        $scope.help_titles = {
        enrichment_type: 'Acoustic track',
        by_speaker: 'CSV File'
    };
    $scope.help_text = {
        enrichment_type: 'Specify which of the already encoded acoustic tracks should be relativized.',
        by_speaker: 'Specify whether relativization should be performed within speaker (using by-speaker ' +
        'means and standard deviations). If not checked, means and standard deviations will be calculated across the ' +
        'the whole corpus.'
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
    })
    .controller('PropertyRelativizationCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, Enrichment, $mdDialog) {
        $scope.newEnrichment = false;
        if ($stateParams.enrichment_id == null) {
            $scope.newEnrichment = true;
        }

        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            console.log($scope.hierarchy)
        });


        // If editing, load list of existing phones
        if (!$scope.newEnrichment) {
            Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
                $scope.enrichment = res.data;
                // Change display name to existing name
            });
        }
        // If starting from new, get list of all possible phones
        else {

            $scope.enrichment = {
                annotation_type: null,
                enrichment_type: 'relativize_property',
                property_name: null,
                by_speaker: false
            };

        }

        $scope.createEnrichment = function () {
            // Create from scratch
            console.log($scope.enrichment);

            if ($scope.newEnrichment) {
                Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function (res) {
                    $scope.error_message = res.data;
                });
            }
            // Edit existing
            else {
                Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function (res) {
                    $scope.error_message = res.data;
                });
            }
        };
        $scope.help_titles = {
        annotation_type: 'Linguistic type',
            property_name: 'Property',
        by_speaker: 'CSV File'
    };
    $scope.help_text = {
        annotation_type: 'Specify which the linguistic type of the property to relativize.',
        property_name: 'Specify which property of the selected linguistic type to relativize.',
        by_speaker: 'Specify whether relativization should be performed within speaker (using by-speaker ' +
        'means and standard deviations). If not checked, means and standard deviations will be calculated across the ' +
        'the whole corpus.'
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