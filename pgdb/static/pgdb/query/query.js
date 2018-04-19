angular.module('query', [
    'pgdb.corpora',
    'pgdb.query'
]).filter('titlecase', function () {
    return function (input) {
        var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i;

        input = input.toLowerCase();
        return input.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function (match, index, title) {
            if (index > 0 && index + match.length !== title.length &&
                match.search(smallWords) > -1 && title.charAt(index - 2) !== ":" &&
                (title.charAt(index + match.length) !== '-' || title.charAt(index - 1) === '-') &&
                title.charAt(index - 1).search(/[^\s-]/) < 0) {
                return match.toLowerCase();
            }

            if (match.substr(1).search(/[A-Z]|\../) > -1) {
                return match;
            }

            return match.charAt(0).toUpperCase() + match.substr(1);
        });
    }
}).directive('dlEnterKey', function () {
    return function (scope, element, attrs) {

        element.bind("keydown keypress", function (event) {
            var keyCode = event.which || event.keyCode;

            // If enter key is pressed
            if (keyCode === 13) {
                scope.$apply(function () {
                    // Evaluate the expression
                    scope.$eval(attrs.dlEnterKey);
                });

                event.preventDefault();
            }
        });
    };
})
    .filter('secondsToDateTime', [function () {
        return function (seconds) {
            return new Date(1970, 0, 1).setSeconds(seconds);
        };
    }])
    .controller('NewQueryCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams) {
        $scope.newQuery = true;
        $scope.annotation_types = ['phone', 'syllable', 'word', 'utterance'];

        $scope.queryState = {
                queryText: 'Save query'};

        $scope.query = {
            annotation_type: $stateParams.type,
            name: "New " + $stateParams.type + " query",
            filters: {
                phone: [],
                syllable: [],
                word: [],
                utterance: [],
                discourse: [],
                speaker: []
            },
            columns: {
                phone: {},
                syllable: {},
                word: {},
                utterance: {},
                discourse: {},
                speaker: {}
            }
        };

        $scope.addFilter = function (a_type) {
            $scope.query.filters[a_type].push({});
        };

        $scope.removeFilter = function (a_type, index) {
            $scope.query.filters[a_type].splice(index, 1);
        };

        $scope.clearFilters = function (){
            var inc;
            for (j = 0; j < Query.annotation_types.length; j++) {
                inc = j >= Query.annotation_types.indexOf($scope.query.annotation_type);
                if (!inc) {
                    continue
                }
                $scope.query.filters[Query.annotation_types[j]] = [];

            }
            $scope.query.filters.speaker = [];
            $scope.query.filters.discourse = [];
        };
        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
        });
        $scope.updateQuery = function () {
            Query.create($stateParams.corpus_id, $scope.query).then(function (res) {
                $state.go('query', {corpus_id: $stateParams.corpus_id, query_id: res.data.id});
            });

        };

        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            console.log($scope.hierarchy);
            var prop;
            $scope.properties = {
                discourse: [],
                speaker: []
            };
            $scope.propertyTypes = {
                discourse: {},
                speaker: {}
            };


            var inc;
            for (j = 0; j < Query.annotation_types.length; j++) {
                inc = j >= Query.annotation_types.indexOf($scope.query.annotation_type);
                if (!inc) {
                    continue
                }
                $scope.properties[Query.annotation_types[j]] = [];
                $scope.propertyTypes[Query.annotation_types[j]] = {};
                for (i = 0; i < $scope.hierarchy.type_properties[Query.annotation_types[j]].length; i++) {
                    prop = $scope.hierarchy.type_properties[Query.annotation_types[j]][i][0];
                    $scope.propertyTypes[Query.annotation_types[j]][prop] = $scope.hierarchy.type_properties[Query.annotation_types[j]][i][1];
                    if ($scope.properties[Query.annotation_types[j]].indexOf(prop) === -1 && prop !== 'id') {
                        $scope.properties[Query.annotation_types[j]].push(prop);
                    }
                }
                for (i = 0; i < $scope.hierarchy.token_properties[Query.annotation_types[j]].length; i++) {
                    prop = $scope.hierarchy.token_properties[Query.annotation_types[j]][i][0];
                    $scope.propertyTypes[Query.annotation_types[j]][prop] = $scope.hierarchy.token_properties[Query.annotation_types[j]][i][1];
                    if ($scope.properties[Query.annotation_types[j]].indexOf(prop) === -1 && prop !== 'id') {
                        $scope.properties[Query.annotation_types[j]].push(prop);
                    }
                }
            }

            for (i = 0; i < $scope.hierarchy.discourse_properties.length; i++) {
                prop = $scope.hierarchy.discourse_properties[i][0];
                $scope.propertyTypes.discourse[prop] = $scope.hierarchy.discourse_properties[i][1];
                if ($scope.properties.discourse.indexOf(prop) === -1 && prop !== 'id') {
                    $scope.properties.discourse.push(prop);
                }
            }

            for (i = 0; i < $scope.hierarchy.speaker_properties.length; i++) {
                prop = $scope.hierarchy.speaker_properties[i][0];
                $scope.propertyTypes.speaker[prop] = $scope.hierarchy.speaker_properties[i][1];
                if ($scope.properties.speaker.indexOf(prop) === -1 && prop !== 'id') {
                    $scope.properties.speaker.push(prop);
                }
            }
        });
    })

    .controller('QueryCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams) {
        Query.reset_state($stateParams.query_id);
        $scope.queryState = Query.state;
        $scope.annotation_types = Query.annotation_types;

        $scope.properties = [];

        $scope.export_link = Query.getExportLink($stateParams.corpus_id, $stateParams.query_id);

        $scope.$on('authenticated', $scope.refreshPermissions);

        $scope.refreshPermissions = function () {
            $scope.user = $rootScope.user;
            $scope.authenticated = $rootScope.authenticated;
            if ($scope.user == undefined) {
                $state.go('home');
            }
            if ($scope.user.is_superuser) {

                $scope.can_view = true;

            }
            else {

                $scope.can_view = false;
                for (i = 0; i < $scope.user.corpus_permissions.length; i++) {
                    if ($scope.user.corpus_permissions[i].corpus == $stateParams.corpus_id) {
                        $scope.can_view = $scope.user.corpus_permissions[i].can_view_detail;
                    }
                }
            }
            Query.one($stateParams.corpus_id, $stateParams.query_id).then(function (res) {
                $scope.query = res.data;
                Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
                    $scope.hierarchy = res.data;
                    console.log($scope.hierarchy);
                    var prop;
                    $scope.properties = {
                        discourse: [],
                        speaker: []
                    };
                    $scope.propertyTypes = {
                        discourse: {},
                        speaker: {}
                    };


                    var inc;
                    for (j = 0; j < Query.annotation_types.length; j++) {
                        inc = j >= Query.annotation_types.indexOf($scope.query.annotation_type);
                        if (!inc) {
                            continue
                        }
                        $scope.properties[Query.annotation_types[j]] = [];
                        $scope.propertyTypes[Query.annotation_types[j]] = {};
                        for (i = 0; i < $scope.hierarchy.type_properties[Query.annotation_types[j]].length; i++) {
                            prop = $scope.hierarchy.type_properties[Query.annotation_types[j]][i][0];
                            $scope.propertyTypes[Query.annotation_types[j]][prop] = $scope.hierarchy.type_properties[Query.annotation_types[j]][i][1];
                            if ($scope.properties[Query.annotation_types[j]].indexOf(prop) === -1 && prop !== 'id') {
                                $scope.properties[Query.annotation_types[j]].push(prop);
                            }
                        }
                        for (i = 0; i < $scope.hierarchy.token_properties[Query.annotation_types[j]].length; i++) {
                            prop = $scope.hierarchy.token_properties[Query.annotation_types[j]][i][0];
                            $scope.propertyTypes[Query.annotation_types[j]][prop] = $scope.hierarchy.token_properties[Query.annotation_types[j]][i][1];
                            if ($scope.properties[Query.annotation_types[j]].indexOf(prop) === -1 && prop !== 'id') {
                                $scope.properties[Query.annotation_types[j]].push(prop);
                            }
                        }
                    }

                    for (i = 0; i < $scope.hierarchy.discourse_properties.length; i++) {
                        prop = $scope.hierarchy.discourse_properties[i][0];
                        $scope.propertyTypes.discourse[prop] = $scope.hierarchy.discourse_properties[i][1];
                        if ($scope.properties.discourse.indexOf(prop) === -1 && prop !== 'id') {
                            $scope.properties.discourse.push(prop);
                        }
                    }

                    for (i = 0; i < $scope.hierarchy.speaker_properties.length; i++) {
                        prop = $scope.hierarchy.speaker_properties[i][0];
                        $scope.propertyTypes.speaker[prop] = $scope.hierarchy.speaker_properties[i][1];
                        if ($scope.properties.speaker.indexOf(prop) === -1 && prop !== 'id') {
                            $scope.properties.speaker.push(prop);
                        }
                    }
                });
                console.log($scope.query);
                $scope.updatePagination();
                $scope.getQueryResults();
            });
        };
        $scope.updateQuery = function () {
            $scope.queryState.queryRunning = true;
            $scope.queryState.queryText = 'Fetching results...';
            console.log($scope.queryState);
            Query.update($stateParams.corpus_id, $stateParams.query_id, $scope.query).then(function(res){
                $scope.query = res.data;
                $scope.updatePagination();
                $scope.refreshPagination(1);
                console.log('LOOK HERE')
                console.log($scope.query);
                console.log($scope.queryState);
            })

        };

        $scope.getQueryResults = function(){
            Query.getResults($stateParams.corpus_id, $stateParams.query_id, $scope.queryState.offset, $scope.queryState.ordering, $scope.queryState.resultsPerPage).then(function (res) {
                    $scope.queryState.results = res.data;
                    console.log($scope.query);
                    console.log($scope.queryState.results);
                    $scope.queryState.queryRunning = false;
                    $scope.queryState.queryText = 'Run query';
                });
        };


        $scope.export = function () {
            $scope.queryState.queryRunning = true;
            $scope.queryState.queryText = 'Fetching results...';
            console.log($scope.queryState.query);
            Query.export($stateParams.corpus_id, $stateParams.query_id).then(function (res) {
                $scope.queryState.queryRunning = false;
                $scope.queryState.queryText = 'Run query';
            });


        };

        $scope.addFilter = function (a_type) {
            $scope.query.filters[a_type].push({});
        };

        $scope.removeFilter = function (a_type, index) {
            $scope.query.filters[a_type].splice(index, 1);
        };

        $scope.clearFilters = function (){
            var inc;
            for (j = 0; j < Query.annotation_types.length; j++) {
                inc = j >= Query.annotation_types.indexOf($scope.query.annotation_type);
                if (!inc) {
                    continue
                }
                $scope.query.filters[Query.annotation_types[j]] = [];

            }
            $scope.query.filters.speaker = [];
            $scope.query.filters.discourse = [];
        };

        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
        });


        $scope.updatePagination = function () {
            $scope.queryState.numPages = Math.ceil($scope.query.result_count / $scope.queryState.resultsPerPage);
            $scope.queryState.pages = [];
            $scope.queryState.pages.push(1);
            for (i = 2; i < $scope.queryState.numPages; i++) {
                if (i === 2 && $scope.queryState.currentPage - i >= 3) {
                    $scope.queryState.pages.push('...');
                }
                if (Math.abs($scope.queryState.currentPage - i) < 3) {
                    $scope.queryState.pages.push(i);
                }
                if (i === $scope.queryState.numPages - 1 && $scope.queryState.numPages - 1 - $scope.queryState.currentPage >= 3) {
                    $scope.queryState.pages.push('...');
                }
            }
            $scope.queryState.pages.push($scope.queryState.numPages);
        };

        $scope.next = function () {
            if ($scope.queryState.currentPage !== $scope.queryState.numPages) {
                $scope.refreshPagination($scope.queryState.currentPage + 1);
            }
        };
        $scope.first = function () {
            if ($scope.queryState.currentPage !== 1) {
                $scope.refreshPagination(1);
            }
        };
        $scope.last = function () {
            if ($scope.queryState.currentPage !== $scope.queryState.numPages) {
                $scope.refreshPagination($scope.queryState.numPages);
            }
        };

        $scope.previous = function () {
            if ($scope.queryState.currentPage !== 1) {
                $scope.refreshPagination($scope.queryState.currentPage - 1);
            }
        };

        $scope.refreshPagination = function (newPage) {
            $scope.queryState.currentPage = newPage;
            $scope.queryState.offset = ($scope.queryState.currentPage - 1) * $scope.queryState.resultsPerPage;
            $scope.getQueryResults();
        };

        $scope.refreshOrdering = function (new_ordering) {
            if (new_ordering === $scope.queryState.ordering) {
                new_ordering = '-' + new_ordering
            }
            $scope.queryState.ordering = new_ordering;
            $scope.getQueryResults();
        };

        $scope.refreshSearch = function () {
            $scope.getQueryResults()
        };

        $scope.refreshPermissions();
    });