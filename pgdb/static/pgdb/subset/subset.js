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
        $scope.newSubset = true;
        $scope.annotation_types = ['phone', 'syllable', 'word', 'utterance'];

        $scope.subsetState = {
            subsetRunning: false,
            subsetText: 'Save subset'
        };

        $scope.subset = {
            annotation_type: $stateParams.type.toLowerCase(),
            enrichment_type: 'subset',
            name: "New " + $stateParams.type + " subset",
            annotation_labels: [],
            subset_label: "New " + $stateParams.type + " subset",
        };

        $scope.createSubset = function() {
            Enrichment.create($stateParams.corpus_id, $scope.subset).then(function (res) {
                $state.go('enrichment', {corpus_id: $stateParams.corpus_id})
            });
        };

        Corpora.phone_set($stateParams.corpus_id).then(function (res) {
            $scope.phones = res.data;
            console.log($scope.phones);
        });


        $scope.insertMember = function(label) {
            if(label.isChecked) {
                $scope.subset.annotation_labels.push(label.node_phone_label);
                console.log("Adding " + label.node_phone_label + " to subset...")
                console.log("Members of subset: " + $scope.subset.annotation_labels);
            } else {
                var toDel = $scope.subset.annotation_labels.indexOf(label);
                $scope.subset.annotation_labels.splice(toDel);
                console.log("Removing " + label.node_phone_label + " from subset...")
                console.log("Members of subset: " + $scope.subset.annotation_labels);
            }
            console.log($scope.subset.annotation_labels);
        };

        $scope.clearMembers = function () {
            console.log("Clearing members in subset...")
            // Clear the array
            $scope.subset.annotation_labels = [];
            console.log("Members of subset: " + $scope.subset.annotation_labels);
            // And uncheck all checkboxes
            angular.forEach($scope.phones, function(label) {
                label.isChecked = false;
            });
        };

        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
        });



    });


