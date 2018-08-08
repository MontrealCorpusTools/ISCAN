angular.module('query', [
    'pgdb.corpora',
    'pgdb.query',
    'ngFileSaver'
]).filter('titlecase', function () {
    return function (input) {
        if (input == undefined) {
            return ''
        }
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
}).filter('joinBy', function () {
        return function (input,field, delimiter) {
            var a = [];
            for (i=0;i<input.length; i++){
                a.push(input[i][field])
            }
            return a.join(delimiter || ',');
        };
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
        $scope.annotation_types = Query.annotation_types;

        $scope.queryState = {
            queryRunning: false,
            queryText: 'Save and run query'
        };

        $scope.$on('unauthenticated', function () {
            $state.go('home');
        });

        $scope.query = {
            annotation_type: $stateParams.type.toLowerCase(),
            name: "New " + $stateParams.type + " query",
            positions: {
                phone: ['current'],
                syllable: ['current'],
                word: ['current'],
                utterance: ['current']
            },
            filters: {
                phone: {
                    current: {
                        property_filters: [],
                        subset_filters: [],
                        subannotation_filters: []
                    }

                },
                syllable: {
                    current: {
                        property_filters: [],
                        subset_filters: [],
                        subannotation_filters: []
                    }

                },
                word: {
                    current: {
                        property_filters: [],
                        subset_filters: [],
                        subannotation_filters: []
                    }

                },
                utterance: {
                    current: {
                        property_filters: [],
                        subset_filters: [],
                        subannotation_filters: []
                    }

                },
                discourse: [],
                speaker: []
            },
            columns: {
                phone: {current: {}},
                syllable: {current: {}},
                word: {current: {}},
                utterance: {current: {}},
                discourse: {},
                speaker: {}
            },
            column_names: {
                phone: {current: {}},
                syllable: {current: {}},
                word: {current: {}},
                utterance: {current: {}},
                discourse: {},
                speaker: {}
            },
            acoustic_columns: {
                pitch: {include: false},
                formants: {include: false}
            }
        };

        $scope.addPrevious = function (a_type) {
            var pos;
            if ($scope.query.positions[a_type][0] == 'current') {
                pos = 'previous'
            }
            else {
                pos = 'previous_' + $scope.query.positions[a_type][0]
            }
            $scope.query.positions[a_type].unshift(pos);
            $scope.query.filters[a_type][pos] = {};
            $scope.query.filters[a_type][pos].property_filters = [];
            $scope.query.filters[a_type][pos].subset_filters = [];
            $scope.query.filters[a_type][pos].left_aligned_filter = undefined;
            $scope.query.filters[a_type][pos].right_aligned_filter = undefined;
            $scope.query.columns[a_type][pos] = {};

        };

        $scope.removePrevious = function (a_type) {
            if ($scope.query.positions[a_type][0] != 'current') {
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].property_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].subset_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].left_aligned_filter = undefined;
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].right_aligned_filter = undefined;
                $scope.query.positions[a_type].shift();
            }
        };

        $scope.addFollowing = function (a_type) {
            var pos;
            if ($scope.query.positions[a_type][$scope.query.positions[a_type].length - 1] == 'current') {
                pos = 'following';
            }
            else {
                pos = 'following_' + $scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]
            }
            $scope.query.positions[a_type].push(pos);
            $scope.query.filters[a_type][pos] = {};
            $scope.query.filters[a_type][pos].property_filters = [];
            $scope.query.filters[a_type][pos].subset_filters = [];
            $scope.query.filters[a_type][pos].left_aligned_filter = undefined;
            $scope.query.filters[a_type][pos].right_aligned_filter = undefined;
            $scope.query.columns[a_type][pos] = {};
        };

        $scope.removeFollowing = function (a_type) {
            if ($scope.query.positions[a_type][$scope.query.positions[a_type].length - 1] != 'current') {
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].property_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].subset_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].left_aligned_filter = undefined;
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].right_aligned_filter = undefined;
                $scope.query.positions[a_type].pop();
            }
        };

        $scope.addFilter = function (a_type, position) {
            $scope.query.filters[a_type][position].property_filters.push({});
        };

        $scope.removeFilter = function (a_type, position, index) {
            $scope.query.filters[a_type][position].property_filters.splice(index, 1);
        };

        $scope.addFilter = function (a_type, position) {
            $scope.query.filters[a_type][position].property_filters.push({});
        };

        $scope.removeFilter = function (a_type, position, index) {
            $scope.query.filters[a_type][position].property_filters.splice(index, 1);
        };

        $scope.clearFilters = function () {
            var inc;
            for (j = 0; j < $scope.annotation_types.length; j++) {
                inc = j >= $scope.annotation_types.indexOf($scope.query.annotation_type);
                if (!inc) {
                    continue
                }
                for (i = 0; i < $scope.query.positions[$scope.annotation_types[j]]; i++) {
                    $scope.query.filters[$scope.annotation_types[j]] = [];
                    $scope.query.filters[$scope.annotation_types[j]][$scope.query.positions[a_type][i]].property_filters = [];
                    $scope.query.filters[$scope.annotation_types[j]][$scope.query.positions[a_type][i]].subset_filters = [];
                    $scope.query.filters[$scope.annotation_types[j]][$scope.query.positions[a_type][i]].left_aligned_filter = undefined;
                    $scope.query.filters[$scope.annotation_types[j]][$scope.query.positions[a_type][i]].right_aligned_filter = undefined;

                }

            }
            $scope.query.filters.speaker = [];
            $scope.query.filters.discourse = [];
        };
        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
        });
        $scope.updateQuery = function () {
            $scope.queryState.queryRunning = true;
            $scope.queryState.queryText = 'Running query...';
            Query.create($stateParams.corpus_id, $scope.query).then(function (res) {
                $state.go('query', {corpus_id: $stateParams.corpus_id, query_id: res.data.id});
            });

        };

        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            $scope.annotation_types = $scope.hierarchy.annotation_types;
            console.log($scope.hierarchy);
            $scope.properties = {
                discourse: [],
                speaker: []
            };
            $scope.propertyTypes = {
                discourse: {},
                speaker: {}
            };

            $scope.subsets = {};
            var inc, current_annotation_type, prop;
            for (j = 0; j < $scope.annotation_types.length; j++) {
                inc = j >= $scope.annotation_types.indexOf($scope.query.annotation_type);
                if (!inc) {
                    continue
                }
                current_annotation_type = $scope.annotation_types[j];
                $scope.subsets[current_annotation_type] = [];
                Array.prototype.push.apply($scope.subsets[current_annotation_type], $scope.hierarchy.subset_tokens[current_annotation_type]);
                Array.prototype.push.apply($scope.subsets[current_annotation_type], $scope.hierarchy.subset_types[current_annotation_type]);
                $scope.properties[current_annotation_type] = [];
                $scope.propertyTypes[current_annotation_type] = {};
                for (i = 0; i < $scope.hierarchy.type_properties[current_annotation_type].length; i++) {
                    prop = $scope.hierarchy.type_properties[current_annotation_type][i][0];
                    if (!$scope.query.column_names[current_annotation_type][prop]) {
                        $scope.query.column_names[current_annotation_type][prop] = current_annotation_type + '_' + prop
                    }
                    $scope.propertyTypes[current_annotation_type][prop] = $scope.hierarchy.type_properties[current_annotation_type][i][1];
                    if ($scope.properties[current_annotation_type].indexOf(prop) === -1 && prop !== 'id') {
                        $scope.properties[current_annotation_type].push(prop);
                    }
                }
                for (i = 0; i < $scope.hierarchy.token_properties[current_annotation_type].length; i++) {
                    prop = $scope.hierarchy.token_properties[current_annotation_type][i][0];
                    if (!$scope.query.column_names[current_annotation_type][prop]) {
                        $scope.query.column_names[current_annotation_type][prop] = current_annotation_type + '_' + prop
                    }
                    $scope.propertyTypes[current_annotation_type][prop] = $scope.hierarchy.token_properties[current_annotation_type][i][1];
                    if ($scope.properties[current_annotation_type].indexOf(prop) === -1 && prop !== 'id') {
                        $scope.properties[current_annotation_type].push(prop);
                    }
                }
            }
            console.log($scope.subsets);
            for (i = 0; i < $scope.hierarchy.discourse_properties.length; i++) {
                prop = $scope.hierarchy.discourse_properties[i][0];
                if (!$scope.query.column_names.discourse[prop]) {
                    $scope.query.column_names.discourse[prop] = 'discourse_' + prop;
                }
                $scope.propertyTypes.discourse[prop] = $scope.hierarchy.discourse_properties[i][1];
                if ($scope.properties.discourse.indexOf(prop) === -1 && prop !== 'id') {
                    $scope.properties.discourse.push(prop);
                }
            }

            for (i = 0; i < $scope.hierarchy.speaker_properties.length; i++) {
                prop = $scope.hierarchy.speaker_properties[i][0];
                if (!$scope.query.column_names.speaker[prop]) {
                    $scope.query.column_names.speaker[prop] = 'speaker_' + prop;
                }
                $scope.propertyTypes.speaker[prop] = $scope.hierarchy.speaker_properties[i][1];
                if ($scope.properties.speaker.indexOf(prop) === -1 && prop !== 'id') {
                    $scope.properties.speaker.push(prop);
                }
            }
        });
    })

    .controller('QueryCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, $interval, FileSaver, Blob, $timeout) {
        Query.reset_state($stateParams.query_id);
        $scope.queryState = Query.state;
        $scope.annotation_types = Query.annotation_types;
        $scope.refreshing = false;
        $scope.properties = [];
        var loadTime = 10000, //Load the data every second
            errorCount = 0, //Counter for the server errors
            loadPromise; //Pointer to the promise created by the Angular $timout service

        $scope.export_link = Query.getExportLink($stateParams.corpus_id, $stateParams.query_id);

        $scope.ensureColumns = function(){
             var inc, current_annotation_type, prop, current_pos, value, current_subannotation_type;
                $scope.column_values = [];
                $scope.subannotation_column_values = [];
                for (j = 0; j < $scope.annotation_types.length; j++) {
                        current_annotation_type = $scope.annotation_types[j];
                        inc = j >= $scope.annotation_types.indexOf($scope.query.annotation_type);
                        if (!inc) {
                            continue
                        }

                        for (k = 0; k < $scope.query.positions[current_annotation_type].length; k++) {
                            current_pos = $scope.query.positions[current_annotation_type][k];
                            if (!(current_pos in $scope.query.column_names[current_annotation_type])) {
                                $scope.query.column_names[current_annotation_type][current_pos] = {};
                            }
                            if (!(current_pos in $scope.query.columns[current_annotation_type])) {
                                $scope.query.columns[current_annotation_type][current_pos] = {};
                            }
                            for (i = 0; i < $scope.hierarchy.type_properties[current_annotation_type].length; i++) {
                                prop = $scope.hierarchy.type_properties[current_annotation_type][i][0];
                                value ={type: current_annotation_type, position:current_pos, property:prop};

                                if ($scope.column_values.filter(x => x.type == current_annotation_type
                                    && x.position == current_pos && x.property == prop).length ==0){
                                    $scope.column_values.push(value);
                                }
                                if (!$scope.query.column_names[current_annotation_type][current_pos][prop]) {
                                    $scope.query.column_names[current_annotation_type][current_pos][prop] = current_annotation_type + '_' + prop;
                                    if (current_pos != 'current'){
                                        $scope.query.column_names[current_annotation_type][current_pos][prop] = current_pos + '_' + $scope.query.column_names[current_annotation_type][current_pos][prop];
                                    }
                                }
                                if (prop == 'label' && current_annotation_type == $scope.query.annotation_type
                                    && current_pos == 'current') {
                                    $scope.query.columns[current_annotation_type][current_pos][prop] = true;
                                }
                                console.log($scope.query.columns[current_annotation_type][current_pos].label)
                            }
                            for (i = 0; i < $scope.hierarchy.token_properties[current_annotation_type].length; i++) {
                                prop = $scope.hierarchy.token_properties[current_annotation_type][i][0];
                                value ={type: current_annotation_type, position:current_pos, property:prop};

                                if ($scope.column_values.filter(x => x.type == current_annotation_type
                                    && x.position == current_pos && x.property == prop).length ==0){
                                    $scope.column_values.push(value);
                                }
                                if (!$scope.query.column_names[current_annotation_type][current_pos][prop]) {
                                    $scope.query.column_names[current_annotation_type][current_pos][prop] = current_annotation_type + '_' + prop;
                                    if (current_pos != 'current'){
                                        $scope.query.column_names[current_annotation_type][current_pos][prop] = current_pos + '_' + $scope.query.column_names[current_annotation_type][current_pos][prop];
                                    }
                                }
                            }
                            if (current_annotation_type in $scope.hierarchy.subannotations){
                                if (!('subannotations' in $scope.query.column_names[current_annotation_type][current_pos])){
                                    $scope.query.column_names[current_annotation_type][current_pos].subannotations = {};
                                }
                                for (i=0; i<$scope.hierarchy.subannotations[current_annotation_type].length;i++){
                                    current_subannotation_type = $scope.hierarchy.subannotations[current_annotation_type][i];
                                if (!(current_subannotation_type in $scope.query.column_names[current_annotation_type][current_pos].subannotations)){
                                    $scope.query.column_names[current_annotation_type][current_pos].subannotations[current_subannotation_type] = {};
                                }
                                    for (pi=0;pi<$scope.hierarchy.subannotation_properties[current_subannotation_type].length; pi++){
                                    prop = $scope.hierarchy.subannotation_properties[current_subannotation_type][pi][0];
                                    value ={type: current_annotation_type, position:current_pos,
                                        subannotation_type:current_subannotation_type, property:prop};

                                    if ($scope.column_values.filter(x => x.type == current_annotation_type
                                        && x.position == current_pos
                                        && x.subannotation_type == current_subannotation_type
                                        && x.property == prop).length ==0){
                                        $scope.subannotation_column_values.push(value);
                                    }
                                if (!$scope.query.column_names[current_annotation_type][current_pos].subannotations[current_subannotation_type][prop]) {
                                    $scope.query.column_names[current_annotation_type][current_pos].subannotations[current_subannotation_type][prop] = current_annotation_type + '_' + current_subannotation_type + '_' + prop;
                                    if (current_pos != 'current'){
                                        $scope.query.column_names[current_annotation_type][current_pos].subannotations[current_subannotation_type][prop] = current_pos + '_' + $scope.query.column_names[current_annotation_type][current_pos].subannotations[current_subannotation_type][prop];
                                    }
                                }

                                    }
                                }

                            }
                        }
                    }
                    console.log('COLUMNS', $scope.query.columns, $scope.query.column_names)
                    console.log('SUBANNOTATIONS', $scope.subannotation_column_values)
        };

        $scope.refreshPermissions = function () {
            console.log('REFRESHING');
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
                $scope.queryState.ordering = $scope.query.ordering;
                $scope.query.annotation_type = $scope.query.annotation_type.toLowerCase();
                Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
                    $scope.hierarchy = res.data;
                    $scope.annotation_types = $scope.hierarchy.annotation_types;
                    $scope.column_values = [];
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

                    $scope.subsets = {};
                    if (!('discourse' in $scope.query.column_names)) {
                        $scope.query.column_names['discourse'] = {};
                        $scope.query.column_names['speaker'] = {};
                    }
                    var inc, current_annotation_type, prop;
                    for (j = 0; j < $scope.annotation_types.length; j++) {
                        current_annotation_type = $scope.annotation_types[j];
                        inc = j >= $scope.annotation_types.indexOf($scope.query.annotation_type);
                        if (!inc) {
                            continue
                        }
                        $scope.subsets[current_annotation_type] = [];
                        Array.prototype.push.apply($scope.subsets[current_annotation_type], $scope.hierarchy.subset_tokens[current_annotation_type]);
                        Array.prototype.push.apply($scope.subsets[current_annotation_type], $scope.hierarchy.subset_types[current_annotation_type]);
                        $scope.properties[current_annotation_type] = [];
                        $scope.propertyTypes[current_annotation_type] = {};
                        console.log(current_annotation_type)

                            for (i = 0; i < $scope.hierarchy.type_properties[current_annotation_type].length; i++) {
                                prop = $scope.hierarchy.type_properties[current_annotation_type][i][0];
                                console.log(prop)
                                $scope.propertyTypes[current_annotation_type][prop] = $scope.hierarchy.type_properties[current_annotation_type][i][1];
                                if ($scope.properties[current_annotation_type].indexOf(prop) === -1) {
                                    $scope.properties[current_annotation_type].push(prop);
                                }
                            }
                            for (i = 0; i < $scope.hierarchy.token_properties[current_annotation_type].length; i++) {
                                prop = $scope.hierarchy.token_properties[current_annotation_type][i][0];

                                if (prop == 'label') {
                                    continue
                                }
                                $scope.propertyTypes[current_annotation_type][prop] = $scope.hierarchy.token_properties[current_annotation_type][i][1];
                                if ($scope.properties[current_annotation_type].indexOf(prop) === -1) {
                                    $scope.properties[current_annotation_type].push(prop);
                                }
                            }
                    }

                    for (i = 0; i < $scope.hierarchy.discourse_properties.length; i++) {
                        prop = $scope.hierarchy.discourse_properties[i][0];
                        if (!$scope.query.column_names['discourse'][prop]) {
                            $scope.query.column_names.discourse[prop] = 'sound_file_' + prop
                        }
                        $scope.propertyTypes.discourse[prop] = $scope.hierarchy.discourse_properties[i][1];
                        if ($scope.properties.discourse.indexOf(prop) === -1 && prop !== 'id') {
                            $scope.properties.discourse.push(prop);
                        }
                    }

                    for (i = 0; i < $scope.hierarchy.speaker_properties.length; i++) {
                        prop = $scope.hierarchy.speaker_properties[i][0];
                        if (!$scope.query.column_names['speaker'][prop]) {
                            $scope.query.column_names.speaker[prop] = 'speaker_' + prop
                        }
                        $scope.propertyTypes.speaker[prop] = $scope.hierarchy.speaker_properties[i][1];
                        if ($scope.properties.speaker.indexOf(prop) === -1 && prop !== 'id') {
                            $scope.properties.speaker.push(prop);
                        }
                    }
                    $scope.ensureColumns();
                    console.log('properties', $scope.properties, $scope.propertyTypes)
                console.log($scope.column_values, $scope.query.columns)
                });
                if ($scope.query.result_count != null){
                    $scope.getQueryResults();

                }
            });
        };

        $scope.updateQuery = function () {

            $scope.queryState.queryRunning = true;
            $scope.queryState.queryText = 'Fetching results...';
            $scope.refreshing = true;
            console.log($scope.queryState);
            Query.update($stateParams.corpus_id, $stateParams.query_id, $scope.query, false).then(function (res) {
                $scope.query = res.data;
               $scope.ensureColumns();
                    console.log($scope.column_values)
                console.log('LOOK HERE')
                console.log($scope.query);
                console.log($scope.queryState);
            })

        };
        $scope.refreshQuery = function () {
            $scope.queryState.queryRunning = true;
            $scope.queryState.refreshText = 'Refreshing...';
            $scope.refreshing = true;
            console.log($scope.queryState);
            Query.update($stateParams.corpus_id, $stateParams.query_id, $scope.query, true).then(function (res) {
                $scope.query = res.data;
               $scope.ensureColumns();
                console.log('LOOK HERE')
                console.log($scope.query);
                console.log($scope.queryState);
            })

        };

        $scope.updateOrdering = function () {
            Query.saveOrdering($stateParams.corpus_id, $stateParams.query_id, $scope.queryState.ordering).then(function (res) {

            });
        };

        $scope.getQueryResults = function () {
            Query.getResults($stateParams.corpus_id, $stateParams.query_id, $scope.queryState.offset,
                $scope.queryState.ordering, $scope.queryState.resultsPerPage).then(function (res) {
                    console.log('GETTING RESULTS')
                $scope.queryState.results = res.data;
                $scope.refreshing = false;
                console.log('RESULTS')
                console.log($scope.query);
                console.log($scope.queryState.results);
                $scope.queryState.queryText = 'Run query';
                $scope.queryState.refreshText = 'Refresh';
                $scope.updatePagination();
                $scope.refreshPagination(1);
            }).catch(function (res) {
                console.log(res)
            });
        };


        $scope.export = function () {
            $scope.query.running = true;
            $scope.queryState.queryText = 'Fetching results...';

            Query.export($stateParams.corpus_id, $stateParams.query_id, $scope.query).then(function (res) {
                var data = new Blob([res.data], {type: 'text/plain;charset=utf-8'});
                FileSaver.saveAs(data, $scope.query.name + ' export.csv');
                $scope.query.running = false;
                $scope.queryState.queryText = 'Run query';
            });


        };

        $scope.getDetail = function (index) {
            $state.go('query-detail', {
                corpus_id: $stateParams.corpus_id,
                query_id: $stateParams.query_id,
                detail_index: index + $scope.queryState.offset
            });
        };

        $scope.addPrevious = function (a_type) {
            var pos;
            if ($scope.query.positions[a_type][0] == 'current') {
                pos = 'previous'
            }
            else {
                pos = 'previous_' + $scope.query.positions[a_type][0]
            }
            $scope.query.positions[a_type].unshift(pos);
            $scope.query.filters[a_type][pos] = {};
            $scope.query.filters[a_type][pos].property_filters = [];
            $scope.query.filters[a_type][pos].subset_filters = [];
            $scope.query.filters[a_type][pos].left_aligned_filter = undefined;
            $scope.query.filters[a_type][pos].right_aligned_filter = undefined;

        };

        $scope.removePrevious = function (a_type) {
            if ($scope.query.positions[a_type][0] != 'current') {
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].property_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].subset_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].left_aligned_filter = undefined;
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].right_aligned_filter = undefined;
                $scope.query.positions[a_type].shift();
            }
        };

        $scope.addFollowing = function (a_type) {
            var pos;
            if ($scope.query.positions[a_type][$scope.query.positions[a_type].length - 1] == 'current') {
                pos = 'following';
            }
            else {
                pos = 'following_' + $scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]
            }
            $scope.query.positions[a_type].push(pos);
            $scope.query.filters[a_type][pos] = {};
            $scope.query.filters[a_type][pos].property_filters = [];
            $scope.query.filters[a_type][pos].subset_filters = [];
            $scope.query.filters[a_type][pos].left_aligned_filter = undefined;
            $scope.query.filters[a_type][pos].right_aligned_filter = undefined;
        };

        $scope.removeFollowing = function (a_type) {
            if ($scope.query.positions[a_type][$scope.query.positions[a_type].length - 1] != 'current') {
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].property_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].subset_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].left_aligned_filter = undefined;
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].right_aligned_filter = undefined;
                $scope.query.positions[a_type].pop();
            }
        };

        $scope.addFilter = function (a_type, position) {
            $scope.query.filters[a_type][position].property_filters.push({});
        };

        $scope.removeFilter = function (a_type, position, index) {
            $scope.query.filters[a_type][position].property_filters.splice(index, 1);
        };

        $scope.clearFilters = function () {
            var inc, a_type;
            for (j = 0; j < $scope.annotation_types.length; j++) {
                inc = j >= $scope.annotation_types.indexOf($scope.query.annotation_type);
                if (!inc) {
                    continue
                }
                a_type = $scope.annotation_types[j];
                for (i = 0; i < $scope.query.positions[a_type]; i++) {
                    $scope.query.filters[$scope.annotation_types[j]] = [];
                    $scope.query.filters[a_type][$scope.query.positions[a_type][i]].property_filters = [];
                    $scope.query.filters[a_type][$scope.query.positions[a_type][i]].subset_filters = [];
                    $scope.query.filters[a_type][$scope.query.positions[a_type][i]].left_aligned_filter = undefined;
                    $scope.query.filters[a_type][$scope.query.positions[a_type][i]].right_aligned_filter = undefined;

                }

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
        };

        $scope.refreshOrdering = function (column_value) {
            var new_ordering;
            if ('subannotation_type' in column_value){
                new_ordering = column_value.type + '.' + column_value.position + '.' + column_value.subannotation_type + '.' + column_value.property;

            }
            else {
                new_ordering = column_value.type + '.' + column_value.position + '.' + column_value.property;

            }
            if (new_ordering === $scope.queryState.ordering) {
                new_ordering = '-' + new_ordering
            }
            $scope.queryState.ordering = new_ordering;
            $scope.getQueryResults();
        };

        $scope.refreshSearch = function () {
            $scope.getQueryResults()
        };

        $scope.$on('authenticated', $scope.refreshPermissions);
        if ($rootScope.authenticated) {
            $scope.refreshPermissions();
        }
        $scope.$on('unauthenticated', function () {
            $state.go('home');
        });


        var getData = function () {

            if ($scope.query != undefined) {
                console.log($scope.refreshing, $scope.query.running, $scope.query.result_count)
                if ($scope.refreshing || $scope.query.running || $scope.query.result_count == null) {
                    Query.one($stateParams.corpus_id, $stateParams.query_id).then(function (res) {
                        $scope.query = res.data;
                        $scope.query.annotation_type = $scope.query.annotation_type.toLowerCase();
                        console.log('GOT QUERY getdata')
                        console.log($scope.query)
                        $scope.ensureColumns();
                        if (!$scope.query.running && $scope.query.result_count != null) {
                            $scope.getQueryResults();
                        }

                    });
                }
            }
            nextLoad(loadTime);
        };

        var cancelNextLoad = function () {
            $timeout.cancel(loadPromise);
        };

        var nextLoad = function (mill) {
            mill = mill || loadTime;

            //Always make sure the last timeout is cleared before starting a new one
            cancelNextLoad();
            loadPromise = $timeout(getData, mill);
        };


        //Start polling the data from the server
        getData();

        //Always clear the timeout when the view is destroyed, otherwise it will keep polling and leak memory
        $scope.$on('$destroy', function () {
            cancelNextLoad();
        });
    });
