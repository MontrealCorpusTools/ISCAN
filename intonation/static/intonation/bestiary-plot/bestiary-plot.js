angular.module('bestiaryPlot', [
    'intonation.query'
])
    .controller('BestiaryPlotCtrl', function ($scope, BestiaryQuery, Corpora, $state, $stateParams, $interval, $rootScope) {
        $scope.filter_options = {discourse:[], speaker:[]};
        $scope.facet_attribute = null;
        $scope.color_attribute = null;
        $scope.max_lines = 100;
        $scope.queryText = 'Update';
        $scope.refreshing = false;
        $scope.color_options = [];
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
            BestiaryQuery.getBestiaryQuery($stateParams.corpus_id).then(function (res) {
                $scope.query = res.data;

                $scope.export_link = BestiaryQuery.getExportLink($stateParams.corpus_id, $scope.query.id);
                $scope.query.annotation_type = $scope.query.annotation_type.toLowerCase();
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
                    for (i =0; i < res.data.length; i ++){
                        res.data[i].options.unshift('All');
                    }
                    $scope.filter_options.discourse = res.data;

                    console.log(res.data)
                });

                Corpora.one($stateParams.corpus_id).then(function (res) {
                    $scope.corpus = res.data;
                });
                Corpora.speakers($stateParams.corpus_id).then(function (res) {
                    res.data.unshift('All');
                    $scope.speakers = res.data;
                });
                Corpora.discourses($stateParams.corpus_id).then(function (res) {
                    $scope.discourses = res.data;
                });
                console.log($scope.query);
                $scope.getQueryResults();
            });
        };

        $scope.getQueryResults = function () {
            BestiaryQuery.getResults($stateParams.corpus_id, $scope.query.id).then(function (res) {
                $scope.utterances = res.data;
                console.log($scope.query);
        $scope.queryText = 'Update';
        $scope.refreshing = false;

            }).catch(function (res) {
                console.log(res)
            });
        };

        $scope.clearFilters = function () {
            $scope.query.filters.speaker = [];
            $scope.query.filters.discourse = [];
        };


        $scope.updateQuery = function () {
            $scope.queryText = 'Refreshing...';
            $scope.refreshing = true;
            console.log($scope.queryState);
            BestiaryQuery.update($stateParams.corpus_id, $scope.query.id, $scope.query).then(function (res) {
                $scope.query = res.data;

            })

        };

        $scope.$on('DETAIL_REQUESTED', function (e, res) {
            console.log($stateParams.corpus_id, res);
            $state.go('query-detail', {corpus_id: $stateParams.corpus_id, query_id: $scope.query.id, detail_index: res});
        });

        $scope.$on('SOUND_REQUESTED', function (e, res) {

            var snd = new Audio(BestiaryQuery.sound_file_url($scope.corpus.id, res)); // buffers automatically when created
            snd.play();

        });

        $scope.refreshPermissions();

        $scope.intervalFunction = function () {
            console.log('hellloooooooo')
            console.log($scope.query)
            if ($scope.query != undefined) {
                if ($scope.refreshing || $scope.query.running || $scope.query.result_count == null) {
                    BestiaryQuery.getBestiaryQuery($stateParams.corpus_id).then(function (res) {
                        $scope.query = res.data;
                        $scope.query.annotation_type = $scope.query.annotation_type.toLowerCase();
                        if (!$scope.query.running) {
                            $scope.getQueryResults();
                        }

                    });
                }
            }
        };
        $scope.intervalFunction();
        var promise = $interval($scope.intervalFunction, 5000);

        // Cancel interval on page changes
        $scope.$on('$destroy', function () {
            if (angular.isDefined(promise)) {
                $interval.cancel(promise);
                promise = undefined;
            }
        });

        $scope.$on('authenticated', $scope.refreshPermissions);

    });