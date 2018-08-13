angular.module('relativization', [
    'pgdb.corpora',
    'pgdb.query',
    'pgdb.enrichment'
]).filter('onlyNumeric', function () {
        return function (input) {
            if (input == undefined){
                return []
            }
            var a = [];
            for (i=0;i<input.length; i++){
                if (input[i][1] === 0){

                a.push(input[i][0])
                }
            }
            return a;
        };
    })
    .controller('TrackRelativizationCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, Enrichment) {
        $scope.newEnrichment = false;
        if ($stateParams.enrichment_id == null) {
            $scope.newEnrichment = true;
        }

        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            console.log($scope.hierarchy);
            $scope.avaiilable_acoustics = [];
            if ($scope.hierarchy.has_pitch_tracks){
                $scope.avaiilable_acoustics.push({name:'Pitch tracks', value:'relativize_pitch'})
            }
            if ($scope.hierarchy.has_intensity_tracks){
                $scope.avaiilable_acoustics.push({name:'Intensity tracks', value:'relativize_intensity'})
            }
            if ($scope.hierarchy.has_formant_tracks){
                $scope.avaiilable_acoustics.push({name:'Formant tracks', value:'relativize_formants'})
            }
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
        $scope.createEnrichment = function() {
            // Create from scratch
            console.log($scope.enrichment);
	    $scope.enrichment.name='Relativize ' + $scope.enrichment.enrichment_type.split('_')[1];

            if ($scope.newEnrichment) {
                Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function(res){
                    $scope.error_message = res.data;
                });
            }
            // Edit existing
            else {
                Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function(res){
                    $scope.error_message = res.data;
                });
            }
        };
    })
    .controller('PropertyRelativizationCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, Enrichment) {
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

        $scope.createEnrichment = function() {
            // Create from scratch
            console.log($scope.enrichment);
	    $scope.enrichment.name='Relativize ' + $scope.enrichment.property_name;

            if ($scope.newEnrichment) {
                Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function(res){
                    $scope.error_message = res.data;
                });
            }
            // Edit existing
            else {
                Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function(res){
                    $scope.error_message = res.data;
                });
            }
        };
    });