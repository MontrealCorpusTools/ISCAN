angular.module('hierarchical', [
    'pgdb.corpora',
    'pgdb.query',
    'pgdb.enrichment'
])
    .filter('secondsToDateTime', [function () {
        return function (seconds) {
            return new Date(1970, 0, 1).setSeconds(seconds);
        };
    }])
    .controller('NewHierarchicalCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, Enrichment, djangoAuth) {

        djangoAuth.authenticationStatus(true).then(function () {
                Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
                            $scope.hierarchy = res.data;
                        $scope.encoded = Object.keys($scope.hierarchy.type_properties);
                        $scope.higher_annotations = ['utterance', 'word', 'syllable'].filter($scope.isEncoded);
                        $scope.subsets = {};
                        var current_annotation_type;
                        for (i=0; i<$scope.higher_annotations.length; i++){
                            current_annotation_type = $scope.higher_annotations[i];
                            $scope.subsets[current_annotation_type] = [];
                            Array.prototype.push.apply($scope.subsets[current_annotation_type],
                                $scope.hierarchy.subset_tokens[current_annotation_type]);
                            Array.prototype.push.apply($scope.subsets[current_annotation_type],
                                $scope.hierarchy.subset_types[current_annotation_type]);

                        }
                            $scope.missingAnnotations =	['utterance', 'word', 'syllable'].filter(function(x) {
                            return !$scope.isEncoded(x);}).join(" or ");
                    });
        }).catch(function(){
                $state.go('home');
        });



	$scope.isEncoded = function(s) {
		return $scope.encoded.includes(s);
	};

        // Making a new hp vs editing an existing one
        if ($stateParams.enrichment_id == null) {
            $scope.newHP = true;
        }
        else {
            $scope.newHP = false;
        }

        console.log($scope.newHP);

        $scope.hpState = {
            hpRunning: false,
            hpText: 'Save hierarchical property'
        };

        $scope.hp_types = ['rate', 'count', 'position'];

        $scope.hp = {
            //annotation_type: 'phone',
            enrichment_type: 'hierarchical_property',
            name: "New hierarchical property",
            //annotation_labels: [],
            property_label: "New hierarchical property",
            //higher_annotation: "Select higher annotation",
        };

        // For loading message
        //$scope.dataLoading = true;


        $scope.configLowerAnnotations = function() {
            console.log($scope.hp);
            if ($scope.hp.higher_annotation == 'utterance') {
                $scope.lower_annotations = ['word', 'syllable', 'phone'];
            }
            else if ($scope.hp.higher_annotation == 'word') {
                $scope.lower_annotations = ['syllable', 'phone'];
            }
            else if ($scope.hp.higher_annotation == 'syllable') {
                $scope.lower_annotations = ['phone'];
            }
	    $scope.lower_annotations = $scope.lower_annotations.filter($scope.isEncoded);
        };

        // To edit an existing property
        if ($scope.newHP == false) {
            console.log("editing");
            Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
                $scope.enrichment = res.data;

                // Change display name to existing name
                $scope.hp.property_label = $scope.enrichment.config.property_label

                // Pre-load the existing annotation levels
                $scope.hp.higher_annotation = $scope.enrichment.config.higher_annotation;
                $scope.configLowerAnnotations();
                $scope.hp.lower_annotation = $scope.enrichment.config.lower_annotation;
                $scope.hp.property_type = $scope.enrichment.config.property_type;
                $scope.hp.enrichment_type = 'hierarchical_property';
                console.log($scope.enrichment);
                console.log($scope.hp);

            });
        }
        else {

        }


        $scope.createHP = function() {
            // Create from scratch
            console.log($scope.hp);
            console.log($scope.newHP);
            if ($scope.newHP == true) {
                Enrichment.create($stateParams.corpus_id, $scope.hp).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function(res){
                    $scope.error_message = res.data;
                });
            }
            // Edit existing
            else {
                Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.hp).then(function (res) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function(res){
                    $scope.error_message = res.data;
                });
            }
        };

    });


