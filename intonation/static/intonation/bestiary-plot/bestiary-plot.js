angular.module('bestiaryPlot', [
    'intonation.query',
    'ngFileSaver'
])
    .controller('BestiaryPlotCtrl', function ($scope, BestiaryQuery, Query, Corpora, $state, $stateParams, $timeout, $rootScope) {
        var loadTime = 10000, //Load the data every second
            errorCount = 0, //Counter for the server errors
            loadPromise; //Pointer to the promise created by the Angular $timout service
        $scope.filter_options = {discourse: [], speaker: []};
        $scope.facet_attribute = null;
        $scope.color_attribute = null;
        $scope.queryText = 'Update';
        $scope.refreshing = false;
        $scope.faceted = false;
        $scope.color_options = [];
        $scope.facets = [];
        $scope.plotConfig = {
            relative_pitch: false,
            relative_time: false,
            max_lines: 100
        };
        $scope.relative_time = false;

        $scope.getHierarchy = function () {
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


                $scope.color_options = [];
                for (i = 0; i < $scope.hierarchy.speaker_properties.length; i++) {
                    prop = $scope.hierarchy.speaker_properties[i][0];
                    $scope.propertyTypes.speaker[prop] = $scope.hierarchy.speaker_properties[i][1];
                    if ($scope.properties.speaker.indexOf(prop) === -1 && prop !== 'id') {
                        $scope.properties.speaker.push(prop);
                        $scope.color_options.push('speaker ' + prop);
                    }
                }

                for (i = 0; i < $scope.hierarchy.discourse_properties.length; i++) {
                    prop = $scope.hierarchy.discourse_properties[i][0];
                    $scope.propertyTypes.discourse[prop] = $scope.hierarchy.discourse_properties[i][1];
                    if ($scope.properties.discourse.indexOf(prop) === -1 && prop !== 'id') {
                        $scope.properties.discourse.push(prop);
                        $scope.color_options.push('discourse ' + prop);

                    }
                }
            });

            Corpora.discourse_property_options($stateParams.corpus_id).then(function (res) {
                $scope.filter_options.discourse = res.data;

                console.log(res.data)
            });

            Corpora.one($stateParams.corpus_id).then(function (res) {
                $scope.corpus = res.data;
            });

            Corpora.speaker_property_options($stateParams.corpus_id).then(function (res) {
                $scope.filter_options.speaker = res.data;

                console.log(res.data)
            });
        };

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
            $scope.getHierarchy();
            $scope.refreshing = true;
            getData();
        };

        $scope.getQueryResults = function () {
            BestiaryQuery.getResults($stateParams.corpus_id, $scope.query.id).then(function (res) {
                $scope.utterances = res.data.data;
                $scope.createFacets();
                console.log($scope.query);
                $scope.queryText = 'Update';
                $scope.refreshing = false;

            }).catch(function (res) {
                console.log(res)
                $scope.refreshing = false;
            });
        };


        $scope.createFacets = function () {
        $scope.faceted = true;
            $scope.facets = [];
            if ($scope.facet_attribute) {
                var property = $scope.facet_attribute.split(' ', 2);
                console.log(property)
                console.log($scope.filter_options)
                var values,value, filtered;
                for (var v in $scope.filter_options[property[0]]) {
                    console.log($scope.filter_options[property[0]][v])
                    if ($scope.filter_options[property[0]][v].name == property[1])
                    values = $scope.filter_options[property[0]][v].options;
                }

                console.log(values)
                for (i = 0; i < values.length; i++) {
                    value = values[i];
                    filtered = $scope.utterances.filter(x => x[property[0]][property[1]] == value);
                    $scope.facets.push({name: value, utterances: filtered})
                }

            }
            else {
                $scope.facets.push({name: 'All data', utterances: $scope.utterances})
            }
            console.log($scope.facets)
            console.log('BROADCASTING')
            $rootScope.$broadcast('RESIZE');
    $scope.$apply();
        };

        $scope.removeFilter = function (type, name) {
            delete $scope.query.filters[type][name];
        };
        $scope.clearFilters = function () {
            $scope.query.filters = {};
        };


        $scope.updateQuery = function () {
            $scope.queryText = 'Refreshing...';
            $scope.refreshing = true;
            console.log($scope.queryState);
            BestiaryQuery.update($stateParams.corpus_id, $scope.query.id, $scope.query).then(function (res) {
                $scope.query = res.data;
                getData();

            })

        };

        $scope.$on('DETAIL_REQUESTED', function (e, res) {
            console.log($stateParams.corpus_id, res);
            $state.go('query-detail', {
                corpus_id: $stateParams.corpus_id,
                query_id: $scope.query.id,
                detail_index: res
            });
        });

        $scope.$on('SOUND_REQUESTED', function (e, res) {

            var snd = new Audio(BestiaryQuery.sound_file_url($scope.corpus.id, res)); // buffers automatically when created
            snd.play();

        });

        var getData = function () {
            if ($scope.refreshing || ($scope.query != undefined && ($scope.query.running || $scope.query.result_count == null))) {
                BestiaryQuery.getBestiaryQuery($stateParams.corpus_id).then(function (res) {
                    $scope.query = res.data;
                    console.log($scope.query)
                    $scope.query.annotation_type = $scope.query.annotation_type.toLowerCase();
                    if (!$scope.query.running && $scope.query.result_count != null) {
                        $scope.getQueryResults();
                        cancelNextLoad();
                        return
                    }

                });
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

        //Always clear the timeout when the view is destroyed, otherwise it will keep polling and leak memory
        $scope.$on('$destroy', function () {
            cancelNextLoad();
        });

        $scope.$on('authenticated', $scope.refreshPermissions);
        if ($rootScope.authenticated) {
            $scope.refreshPermissions();
        }
        $scope.$on('unauthenticated', function () {
            $state.go('home');
        });

        $scope.test = function () {
            console.log($scope.plot_config)
        };

    });