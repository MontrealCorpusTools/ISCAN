angular.module('enrichment', [
    'iscan.corpora',
    'iscan.enrichment'
]).controller('EnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $mdDialog, $state, $stateParams, $timeout, djangoAuth) {

    var loadTime = 10000, //Load the data every second
        errorCount = 0, //Counter for the server errors
        loadPromise, runcheck = true; //Pointer to the promise created by the Angular $timeout service


    var getData = function () {
        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
            console.log($scope.corpus);
            if ($scope.corpus.imported) {
                Corpora.status($stateParams.corpus_id).then(function (res) {
                    $scope.corpus_status = res.data;
                });

                Enrichment.all($stateParams.corpus_id).then(function (res) {
                    $scope.enrichments = res.data;
                });
            }
            if ($scope.corpus.busy) {
                nextLoad(loadTime);
            }
        });
    };
    $scope.sortEnrichmentsBy = 'completed';
    $scope.reverseEnrichments = false;
    $scope.tableSortExpression = function (e) {
        if ($scope.sortEnrichmentsBy == 'runnable') {
            return e['runnable'] == 'runnable';
        }
        return e[$scope.sortEnrichmentsBy];
    };

    var cancelNextLoad = function () {
        $timeout.cancel(loadPromise);
    };

    var nextLoad = function (mill) {
        if (!runcheck) {
            return
        }
        mill = mill || loadTime;

        //Always make sure the last timeout is cleared before starting a new one
        cancelNextLoad();
        loadPromise = $timeout(getData, mill);
    };

    djangoAuth.authenticationStatus(true).then(function () {

        //Start polling the data from the server
        getData();
    }).catch(function () {
        $state.go('home');
    });


    //Always clear the timeout when the view is destroyed, otherwise it will keep polling and leak memory
    $scope.$on('$destroy', function () {
        runcheck = false;
        cancelNextLoad();
    });

    $scope.runEnrichment = function (enrichment, ev) {
        if (enrichment.completed){


            var confirm = $mdDialog.confirm()
                .title('Rerun enrichment')
                .textContent('Are you sure you want to rerun "' + enrichment.name + '"?')
                .ariaLabel('Rerun enrichment')
                .targetEvent(ev)
                .ok('Rerun')
                .cancel('Cancel');

            $mdDialog.show(confirm).then(function () {
        Enrichment.run($stateParams.corpus_id, enrichment.id).then(function (res) {
            getData();
        });

            });
        }
        else{
        Enrichment.run($stateParams.corpus_id, enrichment.id).then(function (res) {
            getData();
        });
        }
    };
    $scope.resetEnrichment = function (enrichment, ev) {

        var confirm = $mdDialog.confirm()
            .title('Reset enrichment')
            .textContent('Are you sure you want to reset "' + enrichment.name + '"?')
            .ariaLabel('Reset enrichment')
            .targetEvent(ev)
            .ok('Reset')
            .cancel('Cancel');

        $mdDialog.show(confirm).then(function () {
            Enrichment.reset($stateParams.corpus_id, enrichment.id).then(function (res) {
                getData();
            });

        });
    };


    $scope.editEnrichment = function (enrichment) {
        if (enrichment.enrichment_type == 'subset') {
            $state.go('edit_subset', {corpus_id: $stateParams.corpus_id, enrichment_id: enrichment.id});
        }
        // Else, go to other relevant edit page that we'll build later
        else if (enrichment.enrichment_type == 'hierarchical_property') {
            $state.go('edit_hierarchical_property', {
                corpus_id: $stateParams.corpus_id,
                enrichment_id: enrichment.id
            });
        }
        else if (['pitch', 'formants', 'intensity'].includes(enrichment.enrichment_type)) {
            $state.go('edit_' + enrichment.enrichment_type + '_tracks', {
                corpus_id: $stateParams.corpus_id,
                enrichment_id: enrichment.id
            });
        }
        else if (['pauses', 'syllables', 'utterances'].includes(enrichment.enrichment_type)) {
            $state.go('edit_' + enrichment.enrichment_type, {
                corpus_id: $stateParams.corpus_id,
                enrichment_id: enrichment.id
            });
        }
        else if (enrichment.enrichment_type == 'refined_formant_points') {
            $state.go('edit_formant_points', {
                corpus_id: $stateParams.corpus_id,
                enrichment_id: enrichment.id
            });
        }
        else if (enrichment.enrichment_type == 'praat_script') {
            $state.go('edit_praat_script', {
                corpus_id: $stateParams.corpus_id,
                enrichment_id: enrichment.id
            });
        } else if (['lexical_csv', 'phone_csv', 'speaker_csv', 'discourse_csv'].includes(enrichment.enrichment_type)) {
            $state.go('edit_csv-properties', {corpus_id: $stateParams.corpus_id, enrichment_id: enrichment.id});
        }
        else if (enrichment.enrichment_type == 'vot') {
            $state.go('edit_vot', {
                corpus_id: $stateParams.corpus_id,
                enrichment_id: enrichment.id
            });
        }
        else if (enrichment.enrichment_type == 'importcsv') {
            $state.go('edit_import_csv', {
                corpus_id: $stateParams.corpus_id,
                enrichment_id: enrichment.id
            });
        }
    };
    $scope.deleteEnrichment = function (enrichment, ev) {


        var confirm = $mdDialog.confirm()
            .title('Reset enrichment')
            .textContent('Are you sure you want to delete "' + enrichment.name + '"?')
            .ariaLabel('Reset enrichment')
            .targetEvent(ev)
            .ok('Reset')
            .cancel('Cancel');

        $mdDialog.show(confirm).then(function () {
                Enrichment.destroy($stateParams.corpus_id, enrichment.id).then(function (res) {

                    $scope.enrichments = $scope.enrichments.filter(function (e) {
                        return e.id !== enrichment.id;
                    })
                }).catch(function (res) {
                    console.log(res);
                })

        });

    };

    $scope.createUtterances = function () {
        $state.go('new_utterances', {corpus_id: $stateParams.corpus_id})
    };

    $scope.createPauses = function () {
        $state.go('new_pauses', {corpus_id: $stateParams.corpus_id})
    };

    $scope.createSyllables = function () {
        $state.go('new_syllables', {corpus_id: $stateParams.corpus_id})
    };

    $scope.newCSVProperties = function () {
        $state.go('new_csv-properties', {corpus_id: $stateParams.corpus_id});
    };


    $scope.newPhoneSubset = function (type) {
        $state.go('new_subset', {corpus_id: $stateParams.corpus_id, type: 'phone'});
    };

    $scope.newWordSubset = function (type) {
        $state.go('new_subset', {corpus_id: $stateParams.corpus_id, type: 'word'});
    };

    $scope.createPitchTracks = function () {
        $state.go('new_pitch_tracks', {corpus_id: $stateParams.corpus_id});
    };

    $scope.createVOT = function () {
        $state.go('new_vot', {corpus_id: $stateParams.corpus_id});
    };

    $scope.createFormantTracks = function () {
        $state.go('new_formant_tracks', {corpus_id: $stateParams.corpus_id});
    };

    $scope.createIntensityTracks = function () {
        $state.go('new_intensity_tracks', {corpus_id: $stateParams.corpus_id});
    };

    $scope.createFormantPoints = function () {
        $state.go('new_formant_points', {corpus_id: $stateParams.corpus_id});
    };

    $scope.createPraatScript = function () {
        $state.go('new_custom_praat_script', {corpus_id: $stateParams.corpus_id});
    };

    $scope.newHierarchicalProperty = function () {
        console.log("New hierarchical property...");
        $state.go('new_hierarchical_property', {corpus_id: $stateParams.corpus_id});
    };
    $scope.newStressWordProp = function () {
        $state.go('new_stress-word-prop', {corpus_id: $stateParams.corpus_id});
    };

    $scope.relativizeProperty = function () {
        $state.go('new_relativize_property', {corpus_id: $stateParams.corpus_id});
    };

    $scope.relativizeTrack = function () {
        $state.go('new_relativize_track', {corpus_id: $stateParams.corpus_id});
    };

    $scope.newImportCSV = function () {
        $state.go('new_import_csv', {corpus_id: $stateParams.corpus_id});
    };

}).directive('tooltip', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.hover(function () {
                element.tooltip('show');
            }, function () {
                element.tooltip('hide');
            });
        }
    };
});
