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
    .controller('NewHierarchicalCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, Enrichment, djangoAuth, $mdDialog) {

        djangoAuth.authenticationStatus(true).then(function () {
                Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
                            $scope.hierarchy = res.data;
                        $scope.encoded = Object.keys($scope.hierarchy.type_properties);
                        $scope.higher_annotations = ['utterance', 'word', 'syllable'].filter($scope.isEncoded);
                        $scope.subsets = {};
                        var current_annotation_type;
                        for (i=0; i<$scope.hierarchy.annotation_types.length; i++){
                            current_annotation_type = $scope.hierarchy.annotation_types[i];
                            $scope.subsets[current_annotation_type] = [];
                            Array.prototype.push.apply($scope.subsets[current_annotation_type],
                                $scope.hierarchy.subset_tokens[current_annotation_type]);
                            Array.prototype.push.apply($scope.subsets[current_annotation_type],
                                $scope.hierarchy.subset_types[current_annotation_type]);

                        }
                        console.log($scope.subsets)
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
            $scope.newEnrichment = true;
        }
        else {
            $scope.newEnrichment = false;
        }


        $scope.hp_types = ['rate', 'count', 'position'];

        $scope.enrichment = {
            enrichment_type: 'hierarchical_property',
            property_label: "",
            higher_annotation: "",
            lower_annotation: ""
        };

        // For loading message
        //$scope.dataLoading = true;


        $scope.configLowerAnnotations = function() {
            console.log($scope.enrichment);
            if ($scope.enrichment.higher_annotation == 'utterance') {
                $scope.lower_annotations = ['word', 'syllable', 'phone'];
            }
            else if ($scope.enrichment.higher_annotation == 'word') {
                $scope.lower_annotations = ['syllable', 'phone'];
            }
            else if ($scope.enrichment.higher_annotation == 'syllable') {
                $scope.lower_annotations = ['phone'];
            }
	    $scope.lower_annotations = $scope.lower_annotations.filter($scope.isEncoded);
        };

        // To edit an existing property
        if ($scope.newEnrichment == false) {
            console.log("editing");
            Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
                $scope.enrichment = res.data.config;

                $scope.configLowerAnnotations();
                console.log($scope.enrichment);

            });
        }
        else {

        }


        $scope.createEnrichmant = function() {
            // Create from scratch
            if ($scope.newEnrichment == true) {
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

    $scope.help_titles = {
        property_label: 'Property name',
        property_type: 'Property type',
        higher_annotation: 'Higher linguistic type',
        lower_annotation: 'Lower linguistic type',
        subset_label: 'Subset of lower linguistic type',
    };
    $scope.help_text = {
        property_label: 'Specify the name of the property.',
        property_type: 'Specify the type of the property.  Rate will encode on the higher linguistic type ' +
        'number of lower linguistic type units per second (i.e., speech rate on utterances could be the rate ' +
        'of syllables per second). Count will encode on the higher linguistic type the number of lower linguistic ' +
        'type units that it contains. Position will encode on the lower linguistic type its position within the ' +
        'higher linguistic unit (i.e., position of syllables within a word).',
        higher_annotation: 'Specify the higher linguistic type.  Hierarchical properties involve the relation between ' +
        'two linguistic types.',
        lower_annotation: 'Specify the lower linguistic type.  Hierarchical properties involve the relation between ' +
        'two linguistic types.',
        subset_label: 'Specify a subset of the lower linguistic type to use. If specified, units outside of this subset ' +
        'are ignored.  For instance, speech rate for a utterance could be calculated as the rate of "syllabic" phones per second, ' +
        'rather than needing syllables encoded. Another example would be if certain words are of interest in an experiment, ' +
        'that subset can be specified for the position of words of interest within each utterance.',
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


