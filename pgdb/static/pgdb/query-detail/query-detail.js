angular.module('queryDetail', [
    'pgdb.corpora',
    'pgdb.utterances',
    'annotations'
]).directive('myEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.myEnter);
                });

                event.preventDefault();
            }
        });
    };
}).directive('blur', [function () {
    return {
        restrict: 'A',
        link: function (scope, element) {
            element.on('click', function () {
                element.blur();
            });
        }
    };
}])
    .controller('QueryDetailCtrl', function ($scope, $rootScope, Utterances, Corpora, $state, $stateParams, $document, QueryState, Annotations) {
            $scope.queryState = QueryState;
            $scope.newAnnotation = {};
            $scope.selectedAnnotation = $scope.queryState.results[$scope.queryState.detailIndex];
            $scope.selectedType = $scope.queryState.type;
            if ($scope.queryState.type === 'word') {
                $scope.utterance_id = $scope.selectedAnnotation.utterance.id;
            }
            else if ($scope.queryState.type === 'utterance') {
                $scope.utterance_id = $scope.selectedAnnotation.id;
            }
            $scope.headline = 'Loading detail...';
            $scope.selection_begin = 0;
            $scope.selection_end = null;
            $scope.selection_anchor = null;

            Annotations.all().then(function (res){
                $scope.annotations = res.data;
                    for (i = 0; i < $scope.annotations.length; i++) {
                        $scope.newAnnotation[$scope.annotations[i].label] = {};
                    }
                console.log($scope.annotations)
            }
            );

            $scope.updateProperties = function(){
                var prop;
                $scope.properties = {
                    utterance: [],
                    discourse: [],
                    speaker: []
                };
                $scope.propertyValues = {
                    utterance: {},
                    discourse: {},
                    speaker: {}
                };
                if ($scope.selectedType === 'word'){
                    $scope.properties.word = [];
                    $scope.properties.word = {};
                    for (i = 0; i < $scope.hierarchy.token_properties.word.length; i++) {
                        prop = $scope.hierarchy.token_properties.word[i][0];

                        if ($scope.properties.word.indexOf(prop) === -1 && prop !== 'id') {
                            $scope.properties.word.push(prop);
                            $scope.propertyValues.word[prop] = $scope.selectedAnnotation[prop];
                        }
                    }
                    for (i = 0; i < $scope.hierarchy.type_properties.word.length; i++) {
                        prop = $scope.hierarchy.type_properties.word[i][0];

                        if ($scope.properties.word.indexOf(prop) === -1 && prop !== 'id') {
                            $scope.properties.word.push(prop);
                            $scope.propertyValues.word[prop] = $scope.selectedAnnotation[prop];
                        }
                    }

                }

                for (i = 0; i < $scope.hierarchy.token_properties.utterance.length; i++) {
                    prop = $scope.hierarchy.token_properties.utterance[i][0];
                    if ($scope.properties.utterance.indexOf(prop) === -1 && prop !== 'id') {
                        $scope.properties.utterance.push(prop);
                        if ($scope.selectedType === 'word') {
                            $scope.propertyValues.utterance[prop] = $scope.selectedAnnotation.utterance[prop];
                        }
                        else if ($scope.selectedType === 'utterance') {
                            $scope.propertyValues.utterance[prop] = $scope.selectedAnnotation[prop];
                        }
                    }
                }

                for (i = 0; i < $scope.hierarchy.discourse_properties.length; i++) {
                    prop = $scope.hierarchy.discourse_properties[i][0];
                    if ($scope.properties.discourse.indexOf(prop) === -1 && prop !== 'id') {
                        $scope.properties.discourse.push(prop);
                        $scope.propertyValues.discourse[prop] = $scope.selectedAnnotation.discourse[prop];
                    }
                }

                for (i = 0; i < $scope.hierarchy.speaker_properties.length; i++) {
                    prop = $scope.hierarchy.speaker_properties[i][0];
                    if ($scope.properties.speaker.indexOf(prop) === -1 && prop !== 'id') {
                        $scope.properties.speaker.push(prop);
                        $scope.propertyValues.speaker[prop] = $scope.selectedAnnotation.speaker[prop];
                    }
                }
            };


            Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
                $scope.hierarchy = res.data;
                $scope.updateProperties();
            });


            $scope.runQuery = function () {
                console.log($scope.queryState.detailIndex, $scope.utterance_id);
                if ($rootScope.user == undefined) {
                    $state.go('home');
                }
                if ($rootScope.user.is_superuser) {

                    $scope.can_listen = true;
                    $scope.can_edit = true;

                }
                else {

                    $scope.can_listen = false;
                    $scope.can_edit = false;
                    for (i = 0; i < $rootScope.user.corpus_permissions.length; i++) {
                        if ($rootScope.user.corpus_permissions[i].corpus === $stateParams.corpus_id) {
                            $scope.can_listen = $rootScope.user.corpus_permissions[i].can_listen;
                            $scope.can_edit = $rootScope.user.corpus_permissions[i].can_edit;
                        }
                    }
                }
                Utterances.one($stateParams.corpus_id, $scope.utterance_id, true, true, true).then(function (res) {
                    $scope.utterance = res.data;
                    console.log($scope.utterance);
                    $scope.headline = $scope.utterance.discourse.name + ' (' + $scope.utterance.begin + ' to ' + $scope.utterance.end + ')';
                    console.log($scope.headline);
                    if ($scope.can_listen) {
                        $scope.initPlayer();
                    }
                })
                    .catch(function (data) {
                        if (data.status === 423) {
                            $scope.utterance = {};
                            $scope.headline = 'Could not load utterance';
                        }
                    });
            };

            $scope.$on('authenticated', function (e, res) {
                $scope.user = $rootScope.user;
                $rootScope.authenticated = true;
                $scope.runQuery()
            });

            if ($rootScope.authenticated) {
                $scope.runQuery()
            }

            $scope.get_next = function () {
                $scope.queryState.detailIndex += 1;
                if ($scope.queryState.type === 'word') {
                    $scope.utterance_id = $scope.queryState.results[$scope.queryState.detailIndex].utterance.id;
                }
                else {
                    $scope.utterance_id = '';
                }
                $scope.runQuery();
            };

            $scope.get_previous = function () {
                $scope.queryState.detailIndex -= 1;
                if ($scope.queryState.type === 'word') {
                    $scope.utterance_id = $scope.queryState.results[$scope.queryState.detailIndex].utterance.id;
                }
                else {
                    $scope.utterance_id = '';
                }
                $scope.runQuery();
            };

            Corpora.one($stateParams.corpus_id).then(function (res) {
                $scope.corpus = res.data;
            });

            $scope.initPlayer = function () {
                Howler.unload();
                $scope.wav_url = Utterances.sound_file_url($scope.corpus.id, $scope.utterance_id);
                $scope.player = new Howl({
                    src: [$scope.wav_url],
                    format: ['wav'],
                    onplay: function () {
                        requestAnimationFrame($scope.updatePlayLine)
                    }
                });
            };

            $scope.$on('$locationChangeStart', function (event) {
                Howler.unload();
            });

            $scope.playPause = function () {
                if ($scope.can_listen) {
                    console.log('playpausing!');
                    if ($scope.player.playing()) {
                        $scope.player.stop();
                    }
                    else {
                        $scope.player.start();
                    }
                }
            };

            $scope.seek = function (time) {
                $scope.selection_begin = time;
                if ($scope.can_listen) {
                    $scope.player.seek(time - $scope.utterance.begin);
                }
            };
            $scope.updateSelectionEnd = function (time) {
                $scope.selection_end = time;
            };

            $scope.$on('SEEK', function (e, res) {
                $scope.seek(res);
            });

            $scope.$on('BEGIN_SELECTION', function (e, res) {
                $scope.selection_begin = res;
                $scope.selection_end = null;
                $scope.selection_anchor = res;
                $scope.seek(res);
                $scope.$broadcast('SELECTION_UPDATE', $scope.selection_begin, $scope.selection_end);

            });
            $scope.$on('UPDATE_SELECTION', function (e, res) {
                if (res < $scope.selection_anchor) {
                    $scope.selection_begin = res;
                    $scope.selection_end = $scope.selection_anchor;
                    $scope.selection_begin = res;
                    $scope.seek(res);
                }
                else {
                    $scope.selection_begin = $scope.selection_anchor;
                    $scope.selection_end = res;
                }
                $scope.$broadcast('SELECTION_UPDATE', $scope.selection_begin, $scope.selection_end);
            });

            $scope.$on('ZOOM_REQUESTED', function (e, res) {
                $scope.$broadcast('ZOOM', res);
            });

            $scope.$on('TRACK_REQUESTED', function (e, res) {
                Utterances.generate_pitch_track($stateParams.corpus_id, $stateParams.utterance_id, res).then(function (res) {
                    $scope.utterance.pitch_track = res.data;
                    $scope.utterance = $scope.utterance;
                    console.log($scope.utterance.pitch_track);
                    $scope.$broadcast('UPDATE_PITCH_TRACK', res.data);
                });
            });

            $scope.$on('SAVE_TRACK', function (e, res) {
                Utterances.save_pitch_track($scope.corpus.name, $stateParams.utterance_id, $scope.utterance.pitch_track).then(function (res) {
                    console.log(res.data);
                    $scope.$broadcast('SAVE_RESPONSE', res);
                });
            });

            $scope.updatePlayLine = function () {
                var actual_time = $scope.player.seek() + $scope.utterance.begin;
                if ($scope.player.playing()) {
                    $scope.$broadcast('UPDATEPLAY', actual_time);
                    if ($scope.selection_end != null && $scope.selection_begin != $scope.selection_end && actual_time > $scope.selection_end - 0.005) {
                        $scope.player.stop();
                        $scope.player.seek($scope.selection_begin - $scope.utterance.begin);
                    }
                    requestAnimationFrame($scope.updatePlayLine);

                }
                $scope.$broadcast('UPDATEPLAY', actual_time);
            };

            $document.bind('keypress', function (event) {
                if (event.keyCode == 32) {
                    event.preventDefault();
                    if ($scope.can_listen) {
                        if (!$scope.player.playing()) {
                            $scope.player.play();
                        }
                        else {
                            $scope.player.pause();
                        }
                    }
                }
            });

        }
    );