angular.module('subset', [
    'iscan.corpora',
    'iscan.query',
    'iscan.enrichment'
])
    .filter('secondsToDateTime', [function () {
        return function (seconds) {
            return new Date(1970, 0, 1).setSeconds(seconds);
        };
    }])
    .controller('NewSubsetCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, Enrichment, $mdDialog) {
        // Making a new subset vs editing an existing one
        $scope.newEnrichment = false;
        if ($stateParams.enrichment_id == null) {
            $scope.newEnrichment = true;
        }

        // For loading message
        $scope.dataLoading = true;

        $scope.defaultSubsets = [];
        ["sibilants", "syllabics", "stressed_vowels"].forEach(function (subset_name) {
            Corpora.default_subsets($stateParams.corpus_id, subset_name).then(function (res) {
                    $scope.defaultSubsets[subset_name] = JSON.parse(res.data);
                }
            )
        });

        // If editing, load list of existing phones
        if (!$scope.newEnrichment) {
            Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
                $scope.enrichment = res.data.config;
                console.log($scope.enrichment)
                // Change display name to existing name
                Corpora.annotation_set($stateParams.corpus_id, $scope.enrichment.annotation_type).then(function (res) {
                    $scope.annotations = res.data;
                }).finally(function () {
                    $scope.dataLoading = false;
                });
            });
        }
        // If starting from new, get list of all possible phones
        else {

        Corpora.annotation_set($stateParams.corpus_id, $stateParams.type).then(function (res) {
            $scope.annotations = res.data;
        }).finally(function () {
            $scope.dataLoading = false;
        });

            $scope.enrichment = {
                annotation_type: $stateParams.type,
                enrichment_type: 'subset',
                annotation_labels: [],
                subset_label: ""
            };

        }


        $scope.createEnrichment = function () {
            // Create from scratch
            console.log($scope.enrichment);

            if ($scope.newEnrichment) {
                Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function (res) {
                    console.log(res)
                    $scope.error_message = res.data;
                });
            }
            // Edit existing
            else {
                Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function (res) {
                    console.log(res.data)
                    $scope.error_message = res.data;
                });
            }
        };


        $scope.clearMembers = function () {
            // Clear the array
            $scope.enrichment.annotation_labels = [];
            console.log("Members of subset: " + $scope.enrichment.annotation_labels);
        };


        $scope.select = function (subset_name) {
            $scope.enrichment.annotation_labels = $scope.defaultSubsets[subset_name];
            $scope.enrichment.subset_label = subset_name;
        };

    });


