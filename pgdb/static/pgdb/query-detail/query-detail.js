angular.module('queryDetail', [
    'pgdb.corpora',
    'pgdb.query',
    'pgdb.annotations'
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
}).directive('myEnter', function () {
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
    .controller('QueryDetailCtrl', function ($scope, $rootScope, Query, Corpora, $state, $stateParams, $document, Annotations, djangoAuth) {
            $scope.paginateParams = Query.paginateParams;
            $scope.annotation_types = Query.annotation_types;
            $scope.newAnnotation = {};
            $scope.currentAnnotations = {};
            $scope.headline = 'Loading detail...';
            $scope.selection_begin = 0;
            $scope.selection_end = null;
            $scope.selection_anchor = null;
            $scope.detail_index = parseInt($stateParams.detail_index);


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
                $scope.selectedType = $scope.query.annotation_type.toLowerCase();
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

                    console.log($scope.query);
                    $scope.runQuery();
                });
            });
        };

            $scope.updateProperties = function () {
                console.log('BEGIN PROPERTIES')
                console.log($scope.annotation_types)
                console.log($scope.selectedType)
                console.log($scope.hierarchy)
                var prop;
                $scope.properties = {
                    discourse: [],
                    speaker: []
                };
                $scope.propertyValues = {
                    discourse: {},
                    speaker: {}
                };
                var inc;
                for (j = 0; j < $scope.annotation_types.length; j++) {
                    inc = j >= $scope.annotation_types.indexOf($scope.selectedType);
                    console.log(inc, j, $scope.annotation_types.indexOf($scope.selectedType))
                    if (!inc) {
                        continue
                    }
                    console.log($scope.annotation_types[j])
                    $scope.properties[$scope.annotation_types[j]] = [];
                    $scope.propertyValues[$scope.annotation_types[j]] = {};
                    console.log($scope.hierarchy.token_properties[$scope.annotation_types[j]])
                    for (i = 0; i < $scope.hierarchy.token_properties[$scope.annotation_types[j]].length; i++) {
                        prop = $scope.hierarchy.token_properties[$scope.annotation_types[j]][i][0];
                        console.log(prop)
                        console.log($scope.properties)
                        if ($scope.properties[$scope.annotation_types[j]].indexOf(prop) === -1 && prop !== 'id') {
                            $scope.properties[$scope.annotation_types[j]].push(prop);
                            $scope.propertyValues[$scope.annotation_types[j]][prop] = $scope.selectedResult[$scope.annotation_types[j]].current[prop];
                        }
                    }


                    for (i = 0; i < $scope.hierarchy.discourse_properties.length; i++) {
                        prop = $scope.hierarchy.discourse_properties[i][0];
                        if ($scope.properties.discourse.indexOf(prop) === -1 && prop !== 'id') {
                            $scope.properties.discourse.push(prop);
                            $scope.propertyValues.discourse[prop] = $scope.discourse[prop];
                        }
                    }

                    for (i = 0; i < $scope.hierarchy.speaker_properties.length; i++) {
                        prop = $scope.hierarchy.speaker_properties[i][0];
                        if ($scope.properties.speaker.indexOf(prop) === -1 && prop !== 'id') {
                            $scope.properties.speaker.push(prop);
                            $scope.propertyValues.speaker[prop] = $scope.speaker[prop];
                        }
                    }
                }
                console.log('PROPERTIES');
                console.log($scope.properties)
                console.log($scope.propertyValues)
            };


            $scope.deleteAnnotation = function (id) {
                Annotations.delete($stateParams.corpus_id, id).then(function (res) {
                    for (i = 0; i < $scope.annotations.length; i++) {
                        $scope.currentAnnotations[$scope.annotations[i].label] = $scope.currentAnnotations[$scope.annotations[i].label].filter(function (annotation) {
                            return annotation.id !== id
                        });
                    }
                });
            };

            $scope.updateAnnotation = function (annotation) {
                Annotations.update($stateParams.corpus_id, annotation.id, annotation).then();
            };

            $scope.addAnnotation = function (annotation) {
                console.log(annotation);
                console.log($scope.selectedAnnotation)
                var data = {};
                data.annotation_type = $scope.query.annotation_type.toLowerCase();
                data.annotation_id = $scope.selectedAnnotation.id;
                data.subannotation_type = annotation.label;
                data.subannotation = $scope.newAnnotation[annotation.label];

                console.log($scope.annotations)
                if (annotation.save_user) {
                    data.subannotation.user = $rootScope.user.username;
                }
                Annotations.create($stateParams.corpus_id, data).then(function (res) {
                    $scope.currentAnnotations[annotation.label].push(res.data);
                })
            };


            $scope.runQuery = function () {
                if ($rootScope.user == undefined) {
                    $state.go('home');
                }
                if ($rootScope.user.is_superuser) {

                    $scope.can_listen = true;
                    $scope.can_edit = true;
                    $scope.can_view_annotations = true;
                    $scope.can_annotate = true;

                }
                else {

                    $scope.can_listen = false;
                    $scope.can_edit = false;
                    $scope.can_view_annotations = false;
                    $scope.can_annotate = false;
                    for (i = 0; i < $rootScope.user.corpus_permissions.length; i++) {
                        if ($rootScope.user.corpus_permissions[i].corpus == $stateParams.corpus_id) {
                            console.log($rootScope.user.corpus_permissions[i])
                            $scope.can_listen = $rootScope.user.corpus_permissions[i].can_listen;
                            $scope.can_edit = $rootScope.user.corpus_permissions[i].can_edit;
                            $scope.can_view_annotations = $rootScope.user.corpus_permissions[i].can_view_annotations;
                            $scope.can_annotate = $rootScope.user.corpus_permissions[i].can_annotate;
                        }
                    }
                    console.log($scope.can_view_annotations, $scope.can_annotate)
                }
                Query.oneAnnotation($stateParams.corpus_id, $stateParams.query_id, $scope.detail_index, $scope.paginateParams.ordering, true, true, true).then(function (res) {
                    $scope.utterance = res.data.utterance;
                    console.log("SANITY", $scope.utterance);
                    $scope.selectedResult = res.data.result;
                    $scope.speaker = $scope.selectedResult.speaker;
                    $scope.discourse = $scope.selectedResult.discourse;
                    $scope.utterance_id = $scope.utterance.id;
                    console.log('helloooooo', $scope.selectedResult);
                    if ($scope.selectedType == 'utterance'){
                        $scope.selectedAnnotation = res.data.utterance;
                    }
                    else{
                    $scope.selectedAnnotation = $scope.selectedResult[$scope.selectedType];
                    }
                    $scope.headline = $scope.utterance.discourse.name + ' (' + $scope.utterance.begin + ' to ' + $scope.utterance.end + ')';
                    console.log($scope.headline, $scope.can_listen);
                    $scope.updateProperties();
                    if ($scope.can_listen) {
                        $scope.initPlayer();
                    }
                    $scope.$broadcast('SELECTED_ANNOTATION_UPDATE', $scope.selectedAnnotation.begin, $scope.selectedAnnotation.end);

            Annotations.all($scope.selectedType).then(function (res) {
                    console.log('selectedannotation', $scope.selectedAnnotation)
                    $scope.annotations = res.data;
                    console.log($scope.annotations);
                    for (i = 0; i < $scope.annotations.length; i++) {
                        console.log($scope.selectedAnnotation[$scope.annotations[i].label])
                        if ($scope.selectedAnnotation[$scope.annotations[i].label] !== undefined) {
                            if ($scope.annotations[i].save_user){
                            $scope.currentAnnotations[$scope.annotations[i].label] = $scope.selectedAnnotation[$scope.annotations[i].label].filter(function (annotation) {
                                return annotation.user == $rootScope.user.username
                            });

                            }
                            else {
                                $scope.currentAnnotations[$scope.annotations[i].label] = $scope.selectedAnnotation[$scope.annotations[i].label]
                            }
                        }
                        $scope.newAnnotation[$scope.annotations[i].label] = {};

                    }
                    console.log('currentannotations', $scope.currentAnnotations)
                }
            );
                })
                    .catch(function (data) {
                        if (data.status === 423) {
                            $scope.utterance = {};
                            $scope.headline = 'Could not load utterance';
                        }
                    });
            };



        djangoAuth.authenticationStatus(true).then(function () {

                $scope.refreshPermissions();
        }).catch(function(){
                $state.go('home');
        });


            $scope.get_next = function () {
                console.log('index', $scope.detail_index)
                if ($scope.detail_index < $scope.query.result_count - 1){
                $state.go('query-detail', {corpus_id: $stateParams.corpus_id, query_id: $stateParams.query_id, detail_index:$scope.detail_index+1});
                }
            };

            $scope.get_previous = function () {

                if ($scope.detail_index > 0){
                $state.go('query-detail', {corpus_id: $stateParams.corpus_id, query_id: $stateParams.query_id, detail_index:$scope.detail_index-1});
                }
            };

            Corpora.one($stateParams.corpus_id).then(function (res) {
                $scope.corpus = res.data;
            });

            $scope.initPlayer = function () {
                Howler.unload();
                $scope.wav_url = Query.sound_file_url($scope.corpus.id, $scope.utterance_id);
                console.log($scope.wav_url);
                $scope.player = new Howl({
                    src: [$scope.wav_url],
                    format: ['wav'],
                    onplay: function () {
                        requestAnimationFrame($scope.updatePlayLine)
                    }
                });
                console.log($scope.player)
            };

            $scope.$on('$locationChangeStart', function (event) {
                Howler.unload();
            });

            $scope.$on('$destroy', function (event) {
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
                Query.generate_pitch_track($stateParams.corpus_id, $scope.utterance.id, res).then(function (res) {
                    $scope.utterance.pitch_track = res.data;
                    console.log($scope.utterance.pitch_track);
                    $scope.$broadcast('UPDATE_PITCH_TRACK', res.data);
                });
            });

            $scope.$on('SAVE_TRACK', function (e, res) {
                Query.save_pitch_track($scope.corpus.id, $scope.utterance.id, $scope.utterance.pitch_track).then(function (res) {
                    console.log(res.data);
                    $scope.utterance.pitch_last_edited = res.data.time_stamp;
                    $scope.propertyValues.utterance.pitch_last_edited = res.data.time_stamp;
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