angular.module('corpusDetail', [
    'pgdb.corpora'
])
    .controller('CorpusDetailCtrl', function ($scope, Corpora, $state, $stateParams, Query) {
        $scope.properties = {};
        $scope.subsets = {};
        $scope.queryIds = {};
        $scope.available_queries = {};
        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
        });
        Query.type_queries($stateParams.corpus_id, 'utterance').then(function (res) {
            $scope.available_queries.utterance = res.data;
            console.log($scope.available_queries)
        });
        Query.type_queries($stateParams.corpus_id, 'word').then(function (res) {
            $scope.available_queries.word = res.data;
            console.log($scope.available_queries)
        });
        Query.type_queries($stateParams.corpus_id, 'syllable').then(function (res) {
            $scope.available_queries.syllable = res.data;
            console.log($scope.available_queries)
        });
        Query.type_queries($stateParams.corpus_id, 'phone').then(function (res) {
            $scope.available_queries.phone = res.data;
            console.log($scope.available_queries)
        });
        $scope.openQuery = function(type){
            console.log($scope.queryIds[type]);
            $state.go('query', {corpus_id:$stateParams.corpus_id, query_id: $scope.queryIds[type]})
        };
        $scope.newQuery = function(type){
            $state.go('new_query', {corpus_id: $stateParams.corpus_id, type: type})
        };
        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            console.log($scope.hierarchy);
            for (var atype in $scope.hierarchy._data){
                console.log(atype)
                $scope.properties[atype] = [];
                for (j=0; j<$scope.hierarchy.type_properties[atype].length; j++){
                    var prop = $scope.hierarchy.type_properties[atype][j][0];
                    if ($scope.properties[atype].indexOf(prop) === -1){
                        $scope.properties[atype].push(prop)
                    }
                }
                for (j=0; j<$scope.hierarchy.token_properties[atype].length; j++){
                    var prop = $scope.hierarchy.token_properties[atype][j][0];
                    if ($scope.properties[atype].indexOf(prop) === -1){
                        $scope.properties[atype].push(prop)
                    }
                }

                $scope.subsets[atype] = [];
                if ($scope.hierarchy.subset_types[atype] !== undefined){
                for (j=0; j<$scope.hierarchy.subset_types[atype].length; j++){
                    var prop = $scope.hierarchy.subset_types[atype][j];
                    if ($scope.subsets[atype].indexOf(prop) === -1){
                        $scope.subsets[atype].push(prop)
                    }
                }

                }
                if ($scope.hierarchy.subset_tokens[atype] !== undefined) {
                    for (j = 0; j < $scope.hierarchy.subset_tokens[atype].length; j++) {
                        var prop = $scope.hierarchy.subset_tokens[atype][j];
                        if ($scope.subsets[atype].indexOf(prop) === -1) {
                            $scope.subsets[atype].push(prop)
                        }
                    }
                }
            }
            console.log($scope.properties)
        });
    });