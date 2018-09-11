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
    return function (input, field, delimiter) {
        if (input == undefined) {
            return ''
        }
        var a = [];
        for (i = 0; i < input.length; i++) {
            if (field == undefined) {

                a.push(input[i])
            }
            else {
                a.push(input[i][field])

            }
        }
        return a.join(delimiter || ', ');
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

    .controller('QueryCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, FileSaver, Blob, $timeout, $q, $query, djangoAuth) {

        Query.reset_state($stateParams.query_id);
        $scope.paginateParams = Query.paginateParams;
        $scope.annotation_types = Query.annotation_types;
        $scope.refreshing = false;
        $scope.properties = [];

        $scope.acoustic_aggregates = [{name: 'Mean', function: 'mean'},
            {name: 'SD', function: 'stdev'},
            {name: 'Median', function: 'median'},
            {name: 'Max', function: 'max'},
            {name: 'Min', function: 'min'}
        ];
        $scope.operators = {};
        $scope.operators[0] = ['==', '!=', '<', '>', '<=', '>='];
        $scope.operators[''] = ['==', '!='];

        function success(results) {
            $scope.results = results;
        }

        $scope.paginatorCallback = function () {
            $scope.paginateParams.offset = ($scope.paginateParams.page - 1) * $scope.paginateParams.limit;
            $scope.paginateParams.corpus_id = $stateParams.corpus_id;
            $scope.paginateParams.id = $stateParams.query_id;
            $scope.promise = $query.results.get($scope.paginateParams, success).$promise;

        };

        $scope.updateAutoComplete = function (a_type, filter) {
            if (typeof filter.searchText != 'undefined') {
                deferred = $q.defer();
                Corpora.autocomplete($stateParams.corpus_id, filter.searchText, a_type, filter.property).then(function (res) {
                    deferred.resolve(res.data);
                    console.log(res.data);
                }).catch(function (err) {
                    console.log(err);
                });

                return deferred.promise;
            }
            else {
                return [];
            }
        };

        var loadTime = 10000, //Load the data every second
            errorCount = 0, //Counter for the server errors
            loadPromise, runcheck = true; //Pointer to the promise created by the Angular $timout service

        $scope.export_link = Query.getExportLink($stateParams.corpus_id, $stateParams.query_id);

        $scope.ensureColumns = function () {
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
                        value = {type: current_annotation_type, position: current_pos, property: prop};
                        if ($scope.column_values.filter(x => x.type == current_annotation_type
                                && x.position == current_pos && x.property == prop).length == 0
                        ) {
                            $scope.column_values.push(value);
                        }
                        if (!$scope.query.column_names[current_annotation_type][current_pos][prop]) {
                            $scope.query.column_names[current_annotation_type][current_pos][prop] = current_annotation_type + '_' + prop;
                            if (current_pos != 'current') {
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
                        value = {type: current_annotation_type, position: current_pos, property: prop};

                        if ($scope.column_values.filter(x => x.type == current_annotation_type && x.position == current_pos && x.property == prop).length == 0
                        ) {
                            $scope.column_values.push(value);
                        }
                        if (!$scope.query.column_names[current_annotation_type][current_pos][prop]) {
                            $scope.query.column_names[current_annotation_type][current_pos][prop] = current_annotation_type + '_' + prop;
                            if (current_pos != 'current') {
                                $scope.query.column_names[current_annotation_type][current_pos][prop] = current_pos + '_' + $scope.query.column_names[current_annotation_type][current_pos][prop];
                            }
                        }
                    }
                    if (current_annotation_type in $scope.hierarchy.subannotations) {
                        if (!('subannotations' in $scope.query.column_names[current_annotation_type][current_pos])) {
                            $scope.query.column_names[current_annotation_type][current_pos].subannotations = {};
                        }
                        for (i = 0; i < $scope.hierarchy.subannotations[current_annotation_type].length; i++) {
                            current_subannotation_type = $scope.hierarchy.subannotations[current_annotation_type][i];
                            if (!(current_subannotation_type in $scope.query.column_names[current_annotation_type][current_pos].subannotations)) {
                                $scope.query.column_names[current_annotation_type][current_pos].subannotations[current_subannotation_type] = {};
                            }
                            for (pi = 0; pi < $scope.hierarchy.subannotation_properties[current_subannotation_type].length; pi++) {
                                prop = $scope.hierarchy.subannotation_properties[current_subannotation_type][pi][0];
                                value = {
                                    type: current_annotation_type, position: current_pos,
                                    subannotation_type: current_subannotation_type, property: prop
                                };

                                if ($scope.column_values.filter(x => x.type == current_annotation_type
                                        && x.position == current_pos
                                        && x.subannotation_type == current_subannotation_type
                                        && x.property == prop).length == 0
                                ) {
                                    $scope.subannotation_column_values.push(value);
                                }
                                if (!$scope.query.column_names[current_annotation_type][current_pos].subannotations[current_subannotation_type][prop]) {
                                    $scope.query.column_names[current_annotation_type][current_pos].subannotations[current_subannotation_type][prop] = current_annotation_type + '_' + current_subannotation_type + '_' + prop;
                                    if (current_pos != 'current') {
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

        $scope.getHierarchy = function () {
            if ($scope.hierarchy == undefined) {
                Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
                    $scope.hierarchy = res.data;
                    $scope.annotation_types = $scope.hierarchy.annotation_types;
                    $scope.column_values = [];
                    console.log($scope.hierarchy);
                    $scope.properties = {
                        discourse: [],
                        speaker: []
                    };
                    $scope.subannotationPropertyTypes = {};
                    $scope.propertyTypes = {
                        discourse: {},
                        speaker: {}
                    };

                    $scope.subsets = {};
                    if (!('discourse' in $scope.query.column_names)) {
                        $scope.query.column_names['discourse'] = {};
                        $scope.query.column_names['speaker'] = {};
                    }
                    var inc, current_annotation_type, prop, current_subannotation_type;
                    for (j = 0; j < $scope.annotation_types.length; j++) {
                        current_annotation_type = $scope.annotation_types[j];
                        inc = j >= $scope.annotation_types.indexOf($scope.query.annotation_type);
                        if (!inc) {
                            continue
                        }
                        $scope.subsets[current_annotation_type] = [];
                        Array.prototype.push.apply($scope.subsets[current_annotation_type],
                            $scope.hierarchy.subset_tokens[current_annotation_type]);
                        Array.prototype.push.apply($scope.subsets[current_annotation_type],
                            $scope.hierarchy.subset_types[current_annotation_type]);
                        $scope.properties[current_annotation_type] = [];
                        $scope.propertyTypes[current_annotation_type] = {};

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
                        if (current_annotation_type in $scope.hierarchy.subannotations) {
                            for (i = 0; i < $scope.hierarchy.subannotations[current_annotation_type].length; i++) {
                                current_subannotation_type = $scope.hierarchy.subannotations[current_annotation_type][i];
                                $scope.subannotationPropertyTypes[current_subannotation_type] = {};

                                for (pi = 0; pi < $scope.hierarchy.subannotation_properties[current_subannotation_type].length; pi++) {
                                    prop = $scope.hierarchy.subannotation_properties[current_subannotation_type][pi][0];
                                    $scope.subannotationPropertyTypes[current_subannotation_type][prop] = $scope.hierarchy.subannotation_properties[current_subannotation_type][pi][1];

                                }
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
            }

        };
        $scope.refreshPermissions = function () {
            console.log('REFRESHING');
            $scope.user = $rootScope.user;
            $scope.authenticated = $rootScope.authenticated;
            $scope.exporting = false;
            $scope.refreshing = true;
            if ($scope.user == undefined) {
                $state.go('home');
            }
            if ($scope.user.is_superuser) {
                $scope.can_view = true;
                $scope.can_listen = true;
            }
            else {
                $scope.can_view = false;
                $scope.can_listen = false;
                for (i = 0; i < $scope.user.corpus_permissions.length; i++) {
                    if ($scope.user.corpus_permissions[i].corpus == $stateParams.corpus_id) {
                        $scope.can_view = $scope.user.corpus_permissions[i].can_view_detail;
                        $scope.can_listen = $scope.user.corpus_permissions[i].can_listen;
                    }
                }
            }


            if ($stateParams.query_id == undefined) {
                $scope.newQuery = true;

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
                                subannotation_filters: {}
                            }

                        },
                        syllable: {
                            current: {
                                property_filters: [],
                                subset_filters: [],
                                subannotation_filters: {}
                            }

                        },
                        word: {
                            current: {
                                property_filters: [],
                                subset_filters: [],
                                subannotation_filters: {}
                            }

                        },
                        utterance: {
                            current: {
                                property_filters: [],
                                subset_filters: [],
                                subannotation_filters: {}
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
                $scope.getHierarchy();
            }
            else {
                $scope.refreshing = true;
                $scope.newQuery = false;
                //Start polling the data from the server
                getData();

            }
        };

        $scope.updateQuery = function () {
            $scope.refreshing = true;
            if ($scope.newQuery) {
                Query.create($stateParams.corpus_id, $scope.query).then(function (res) {
                    $state.go('query', {corpus_id: $stateParams.corpus_id, query_id: res.data.id});
                });

            }
            else {
                Query.update($stateParams.corpus_id, $stateParams.query_id, $scope.query, false).then(function (res) {
                    $scope.query = res.data;
                    getData();
                })

            }

        };
        $scope.refreshQuery = function () {
            $scope.refreshing = true;
            Query.update($stateParams.corpus_id, $stateParams.query_id, $scope.query, true).then(function (res) {
                $scope.query = res.data;
                getData();
            })

        };

        $scope.updateOrdering = function () {
            Query.saveOrdering($stateParams.corpus_id, $stateParams.query_id, $scope.paginateParams.ordering).then(function (res) {

            });
        };


        $scope.export = function () {
            $scope.exporting = true;
            console.log($scope.query)
            Query.export($stateParams.corpus_id, $stateParams.query_id, $scope.query).then(function (res) {
                var data = new Blob([res.data], {type: 'text/plain;charset=utf-8'});
                FileSaver.saveAs(data, $scope.query.name + ' export.csv');
                $scope.exporting = false;
            }).catch(function (res) {
                console.log('error!', res);
                $scope.exporting = false;
            });


        };

        $scope.getDetail = function (index) {
            $state.go('query-detail', {
                corpus_id: $stateParams.corpus_id,
                query_id: $stateParams.query_id,
                detail_index: index + (($scope.paginateParams.page - 1) * $scope.paginateParams.limit)
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
            $scope.query.filters[a_type][pos].subannotation_filters = {};
            $scope.query.filters[a_type][pos].left_aligned_filter = undefined;
            $scope.query.filters[a_type][pos].right_aligned_filter = undefined;

        };

        $scope.removePrevious = function (a_type) {
            if ($scope.query.positions[a_type][0] != 'current') {
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].property_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].subset_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][0]].subannotation_filters = [];
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
            $scope.query.filters[a_type][pos].subannotation_filters = {};
            $scope.query.filters[a_type][pos].left_aligned_filter = undefined;
            $scope.query.filters[a_type][pos].right_aligned_filter = undefined;
        };

        $scope.removeFollowing = function (a_type) {
            if ($scope.query.positions[a_type][$scope.query.positions[a_type].length - 1] != 'current') {
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].property_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].subset_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].subannotation_filters = [];
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].left_aligned_filter = undefined;
                $scope.query.filters[a_type][$scope.query.positions[a_type][$scope.query.positions[a_type].length - 1]].right_aligned_filter = undefined;
                $scope.query.positions[a_type].pop();
            }
        };

        $scope.addFilter = function (a_type, position) {
            if (a_type == 'discourse' || a_type == 'speaker') {
                $scope.query.filters[a_type].push({property: 'name', operator: '==', searchText: ''});

            }
            else {
                $scope.query.filters[a_type][position].property_filters.push({
                    property: 'label',
                    operator: '==',
                    searchText: ''
                });

            }
        };

        $scope.removeFilter = function (a_type, position, index) {
            $scope.query.filters[a_type][position].property_filters.splice(index, 1);
        };

        $scope.removeSpokenFilter = function (a_type, index) {
            $scope.query.filters[a_type].splice(index, 1);
        };

        $scope.addSubannotationFilter = function (a_type, position, subannotation_type) {
            if (!(subannotation_type in $scope.query.filters[a_type][position].subannotation_filters)) {
                $scope.query.filters[a_type][position].subannotation_filters[subannotation_type] = [];
            }
            $scope.query.filters[a_type][position].subannotation_filters[subannotation_type].push({subannotation_type: subannotation_type});
        };

        $scope.removeSubannotationFilter = function (a_type, position, subannotation_type, index) {
            $scope.query.filters[a_type][position].subannotation_filters[subannotation_type].splice(index, 1);
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


        $scope.refreshOrdering = function (column_value) {
            var new_ordering;
            if ('subannotation_type' in column_value) {
                new_ordering = column_value.type + '.' + column_value.position + '.' + column_value.subannotation_type + '.' + column_value.property;

            }
            else {
                new_ordering = column_value.type + '.' + column_value.position + '.' + column_value.property;

            }
            if (new_ordering === $scope.paginateParams.ordering) {
                new_ordering = '-' + new_ordering
            }
            $scope.paginateParams.ordering = new_ordering;
            $scope.paginatorCallback();
        };


        $scope.refreshSpokenOrdering = function (type, property) {
            var new_ordering = type + '.' + property;

            if (new_ordering === $scope.paginateParams.ordering) {
                new_ordering = '-' + new_ordering
            }
            $scope.paginateParams.ordering = new_ordering;
            $scope.paginatorCallback();
        };

        $scope.refreshSearch = function () {
            $scope.getQueryResults()
        };


        var getData = function () {
            if ($scope.exporting) {
                return
            }
            if ($scope.refreshing || ($scope.query != undefined && ($scope.query.running || $scope.query.result_count == null))) {
                Query.one($stateParams.corpus_id, $stateParams.query_id).then(function (res) {
                    $scope.query = res.data;
                    $scope.paginateParams.ordering = $scope.query.ordering;
                    $scope.query.annotation_type = $scope.query.annotation_type.toLowerCase();
                    $scope.getHierarchy();
                    console.log('GOT QUERY getdata');
                    console.log($scope.query);
                    if (!$scope.query.running && $scope.query.result_count != null) {
                        $scope.refreshing = false;
                        $scope.paginatorCallback();
                        cancelNextLoad();
                        return
                    }

                });
            }
            nextLoad(loadTime);
        };

        $scope.listen = function (annotation_id) {
            if ($scope.can_listen) {
                var snd = new Audio(Query.sound_file_url($scope.corpus.id, annotation_id)); // buffers automatically when created
                snd.play();

            }

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

        //Always clear the timeout when the view is destroyed, otherwise it will keep polling and leak memory
        $scope.$on('$destroy', function () {
            runcheck = false;
            cancelNextLoad();
        });


        djangoAuth.authenticationStatus(true).then(function () {

            $scope.refreshPermissions();
        }).catch(function () {
            $state.go('home');
        });


    });
