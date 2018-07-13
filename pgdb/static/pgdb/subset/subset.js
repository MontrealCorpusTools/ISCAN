angular.module('subset', [
    'pgdb.corpora',
    'pgdb.query',
    'pgdb.enrichment'
])
    .filter('secondsToDateTime', [function () {
        return function (seconds) {
            return new Date(1970, 0, 1).setSeconds(seconds);
        };
    }])
    .controller('NewSubsetCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, Enrichment) {
        // Making a new subset vs editing an existing one
        if ($stateParams.enrichment_id == null) {
            $scope.newSubset = true;
        }
        else {
            $scope.newSubset = false;
        }
        
        $scope.annotation_types = ['phone', 'syllable', 'word', 'utterance'];

        $scope.subsetState = {
            subsetRunning: false,
            subsetText: 'Save subset'
        };

        $scope.subset = {
            annotation_type: 'phone',
            enrichment_type: 'subset',
            name: "New phone subset",
            annotation_labels: [],
            subset_label: "New phone subset",
        };

        // For loading message
        $scope.dataLoading = true;

        // Get list of all phones in phone set
        Corpora.phone_set($stateParams.corpus_id).then(function (res) {
            $scope.phones = res.data;
        });

        // If editing, load list of existing phones
        if ($scope.newSubset == false) {
            Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
                $scope.enrichment = res.data;

                // Change display name to existing name
                $scope.subset.subset_label = $scope.enrichment.name

                // Pre-load the existing subset members (check them off)
                Corpora.phone_set($stateParams.corpus_id).then(function (res) {
                    $scope.phones = res.data;
                    $scope.subset.annotation_labels = $scope.enrichment.config.annotation_labels
                    angular.forEach($scope.phones, function(label) {
                        if ($scope.subset.annotation_labels.includes(label.node_phone_label)) {
                            console.log("match");
                            label.isChecked = true;
                        }
                    });
                }).finally(function() {
                    $scope.dataLoading = false;
                }); 
            });
        };


        $scope.createSubset = function() {
            // Create from scratch
            if ($scope.newSubset == true) {
                Enrichment.create($stateParams.corpus_id, $scope.subset).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function(res){
                    $scope.error_message = res.data;
                });
            }
            // Edit existing
            else {
                Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.subset).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function(res){
                    $scope.error_message = res.data;
                });
            }
        };

        $scope.insertMember = function(label) {
            if(label.isChecked) {
                $scope.subset.annotation_labels.push(label.node_phone_label);
                console.log("Members of subset: " + $scope.subset.annotation_labels);
            } else {
                var toDel = $scope.subset.annotation_labels.indexOf(label);
                $scope.subset.annotation_labels.splice(toDel);
                console.log("Members of subset: " + $scope.subset.annotation_labels);
            }
        };

        $scope.clearMembers = function () {
            // Clear the array
            $scope.subset.annotation_labels = [];
            console.log("Members of subset: " + $scope.subset.annotation_labels);
            // And uncheck all checkboxes
            angular.forEach($scope.phones, function(label) {
                label.isChecked = false;
            });
        };

    });


