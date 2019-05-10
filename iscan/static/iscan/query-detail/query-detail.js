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
}).directive('blur', [function () {
    return {
        restrict: 'A',
        link: function (scope, element) {
            element.on('click', function () {
                element.blur();
            });
        }
    };
}]).controller('QueryDetailCtrl', function ($scope, Query, Corpora, $state, $stateParams, $document, Annotations, djangoAuth, Users, $mdDialog) {
    $scope.paginateParams = Query.paginateParams;
    $scope.annotation_types = Query.annotation_types;
    $scope.newAnnotation = {};
    $scope.currentAnnotations = {};
    $scope.headline = 'Loading detail...';
    $scope.typing = false;
    $scope.has_edited_subannotations == false;
    $scope.selected_subannotation = '';
    $scope.selection_begin = 0;
    $scope.selection_end = null;
    $scope.selection_anchor = null;
    $scope.detail_index = parseInt($stateParams.detail_index);

    $scope.refreshPermissions = function () {
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
                var prop;
                $scope.properties = {
                    discourse: [],
                    speaker: []
                };
                $scope.propertyTypes = {
                    discourse: {},
                    speaker: {}
                };
                //List of subannotations where subannotations are a 2-array of type and subannotation_type
                $scope.subannotations = Object.keys($scope.hierarchy.subannotations)
                    .map(x => $scope.hierarchy.subannotations[x].map(y => [x, y]))
                    .flat(1);
                $scope.runQuery();
            });
        });
    };

    $scope.updateProperties = function () {
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
            if (!inc) {
                continue
            }
            $scope.properties[$scope.annotation_types[j]] = [];
            $scope.propertyValues[$scope.annotation_types[j]] = {};
            for (i = 0; i < $scope.hierarchy.token_properties[$scope.annotation_types[j]].length; i++) {
                prop = $scope.hierarchy.token_properties[$scope.annotation_types[j]][i][0];
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
        var data = {};
        data.annotation_type = $scope.query.annotation_type.toLowerCase();
        data.annotation_id = $scope.selectedAnnotation.id;
        data.subannotation_type = annotation.label;
        data.subannotation = $scope.newAnnotation[annotation.label];

        if (annotation.save_user) {
            data.subannotation.user = $scope.user.username;
        }
        Annotations.create($stateParams.corpus_id, data).then(function (res) {
            $scope.currentAnnotations[annotation.label].push(res.data);
        })
    };


    $scope.runQuery = function () {
        if ($scope.user.is_superuser) {
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
            for (i = 0; i < $scope.user.corpus_permissions.length; i++) {
                if ($scope.user.corpus_permissions[i].corpus == $stateParams.corpus_id) {
                    $scope.can_listen = $scope.user.corpus_permissions[i].can_listen;
                    $scope.can_edit = $scope.user.corpus_permissions[i].can_edit;
                    $scope.can_view_annotations = $scope.user.corpus_permissions[i].can_view_annotations;
                    $scope.can_annotate = $scope.user.corpus_permissions[i].can_annotate;
                }
            }
        }
        Query.oneWaveform($stateParams.corpus_id, $stateParams.query_id, $scope.detail_index, $scope.paginateParams.ordering).then(function (res){
            $scope.waveform = res.data.waveform;
        })

        Query.oneSpectrogram($stateParams.corpus_id, $stateParams.query_id, $scope.detail_index, $scope.paginateParams.ordering).then(function (res){
            $scope.spectrogram = res.data.spectrogram;
        })

        Query.oneAnnotation($stateParams.corpus_id, $stateParams.query_id, $scope.detail_index, $scope.paginateParams.ordering, true).then(function (res) {
            $scope.utterance = res.data.utterance;
            $scope.utterance.viewableSubannotations = [];
            $scope.utterance.subannotations = $scope.subannotations;
            $scope.utterance.subannotation_list = {}
            $scope.utterance.subannotations.forEach(x => {
                const annotation_type = x[0];
                $scope.utterance.subannotation_list[annotation_type] = {};
            });
            $scope.utterance.subannotations.forEach(x => {
                const annotation_type = x[0];
                const subannotation = x[1];
                $scope.utterance.subannotation_list[annotation_type][subannotation] = [];
            });
            $scope.selectedResult = res.data.result;
            $scope.speaker = $scope.selectedResult.speaker;
            $scope.discourse = $scope.selectedResult.discourse;
            $scope.utterance_id = $scope.utterance.id;
            if ($scope.selectedType == 'utterance'){
                $scope.selectedAnnotation = res.data.utterance;
            }
            else{
                $scope.selectedAnnotation = $scope.selectedResult[$scope.selectedType].current;
            }
            $scope.headline = $scope.utterance.discourse.name + ' (' + $scope.utterance.begin + ' to ' + $scope.utterance.end + ')';
            $scope.updateProperties();
            if ($scope.can_listen) {
                $scope.initPlayer();
            }
            $scope.$broadcast('SELECTED_ANNOTATION_UPDATE', $scope.selectedAnnotation.begin, $scope.selectedAnnotation.end);
        }).catch(function (data) {
            if (data.status === 423) {
                $scope.utterance = {};
                $scope.headline = 'Could not load utterance';
            }
        });
    };



    djangoAuth.authenticationStatus(true).then(function () {
        Users.current_user().then(function (res) {
            $scope.user = res.data;
            $scope.refreshPermissions();
        });
    }).catch(function(res){
        $state.go('home');
    });

    $scope.back_to_query = function(){
        $state.go('query', {corpus_id: $scope.corpus.id, query_id: $scope.query.id});
    };

    $scope.get_next = function () {
        if ($scope.detail_index < $scope.query.result_count - 1){
        $state.go('query-detail', {corpus_id: $stateParams.corpus_id, query_id: $stateParams.query_id, detail_index:$scope.detail_index+1});
        }
    };

    $scope.get_previous = function () {
        if ($scope.detail_index > 0){
            $state.go('query-detail', {corpus_id: $stateParams.corpus_id, query_id: $stateParams.query_id, detail_index:$scope.detail_index-1});
        }
    };

    $scope.$watch('subannotations', function(nv) {
        if($scope.utterance && $scope.utterance.viewableSubannotations){
            $scope.utterance.subannotations = $scope.subannotations;
            $scope.utterance.viewableSubannotations = nv.filter(x => x[2]).map(x => [x[0], x[1]]);
            if($scope.utterance.viewableSubannotations.length == 0){
                $scope.selectSubannotation('');
            }
            $scope.utterance.subannotations.forEach(x => {
                const annotation_type = x[0];
                const subannotation = x[1];
                const is_in_viewable_sub = $scope.utterance.viewableSubannotations.filter(d => d[0] == x[0] && d[1] == x[1]).length > 0;
                $scope.utterance.subannotation_list[annotation_type][subannotation] = is_in_viewable_sub
                              ? $scope.utterance[annotation_type]
                                      .map(x => x[subannotation]
                                          .map(y=>{
                                              y.parent_id=x.id;
                                              y.annotation_type=annotation_type;
                                              y.subannotation=subannotation; 
                                              y.excluded=false;
                                              y.note="";
                                              return y})).flat()
                              : [];
            });
        }
    }, true);


    Corpora.one($stateParams.corpus_id).then(function (res) {
        $scope.corpus = res.data;
    });

    $scope.initPlayer = function () {
        Howler.unload();
        $scope.wav_url = Query.sound_file_url($scope.corpus.id, $scope.utterance_id);
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

    $scope.$on('$destroy', function (event) {
        Howler.unload();
    });

    $scope.playPause = function () {
        if ($scope.can_listen) {
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

    $scope.$on('UPDATE_SUBANNOTATION', (e, res) => {$scope.selectSubannotation(res);$scope.$apply(); });

    $scope.$on('ZOOM_REQUESTED', function (e, res) {
        $scope.$broadcast('ZOOM', res);
    });

    $scope.$on('TRACK_REQUESTED', function (e, res) {
        Query.generate_pitch_track($stateParams.corpus_id, $scope.utterance.id, res).then(function (res) {
            $scope.utterance.pitch_track = res.data;
            $scope.$broadcast('UPDATE_PITCH_TRACK', res.data);
        });
    });

    $scope.$on('SAVE_TRACK', function (e, res) {
        Query.save_pitch_track($scope.corpus.id, $scope.utterance.id, $scope.utterance.pitch_track).then(function (res) {
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

    $scope.$on('MOVE_SUBANNOTATION', function (e, res) {
        $scope.selected_subannotation.begin = res.begin;
        $scope.selected_subannotation.end = res.end;
        $scope.selectSubannotation($scope.selected_subannotation);
        $scope.updateSubannotation($scope.selected_subannotation);
        $scope.$apply();
    });

    $scope.updateSubannotation = function(subannotation){
        const idx = $scope.utterance.subannotation_list[subannotation.annotation_type][subannotation.subannotation]
            .findIndex(x => x.id == $scope.selected_subannotation.id);
        $scope.utterance.subannotation_list[subannotation.annotation_type][subannotation.subannotation][idx] = subannotation;
        $scope.$broadcast('VIEW_UPDATES');
    }

    $scope.selectSubannotation = function(subannotation){
        $scope.has_edited_subannotations = true;
        if(subannotation === ''){
            $scope.$broadcast('SUBANNOTATION_UPDATE', '');
            $scope.selected_subannotation = '';
        }else{
            $scope.selected_subannotation = subannotation;
            $scope.$broadcast('SUBANNOTATION_UPDATE', subannotation);
        }
    }

    $scope.resetSubannotations = function(ev){
        if (!$scope.has_edited_subannotations)
            return;
        const confirm_dialog = $mdDialog.confirm()
            .title("Are you sure you want to reset uncommitted changes?")
            .textContent("All uncommitted changes will be lost.")
            .targetEvent(ev)
            .ok('Yes')
            .cancel('No');
       $mdDialog.show(confirm_dialog).then(function() {
           //This should reset all the subannotation stuff
           $scope.selectSubannotation('');
           $scope.runQuery();
       });
    }

    $scope.commitChanges = function (ev) {
        if (!$scope.has_edited_subannotations)
            return;
        const confirm_dialog = $mdDialog.confirm()
            .title("Do you want to commit changes to the database?")
            .textContent("This will permanently replace what was there previously.")
            .targetEvent(ev)
            .ok('Yes')
            .cancel('No');
       $mdDialog.show(confirm_dialog).then(function() {
           console.log("Changes committed!(not really though)");
           Query.commit_subannotation_changes($stateParams.corpus_id, $scope.utterance_id, $scope.utterance.subannotation_list).then(function (res) {
               console.log("Changes committed!");
           });
       }, 
       function(){
           console.log("Changes not committed!");
       });
    }

    $scope.excludeSubannotation = function(subannotation, check=false){
        if (!check)
            subannotation.excluded = !subannotation.excluded;
        $scope.updateSubannotation(subannotation);
        $scope.selectSubannotation(subannotation);
    }

    $scope.viewableSubannotationDetail = function(p) {
        return !(["annotation_type", "subannotation", "id", "parent_id"].includes(p));
    };
    
    $scope.isTyping = function(){
        $scope.typing = true;
    }

    $scope.isNotTyping = function(){
        $scope.typing = false;
    }

    $document.bind('keypress', function (e) {
        if ($scope.typing)
            return;
        if (e.key == " ") {
            e.preventDefault();
            if ($scope.can_listen) {
                if (!$scope.player.playing()) {
                    $scope.player.play();
                }
                else {
                    $scope.player.pause();
                }
                $scope.$broadcast('SELECTION_UPDATE', $scope.selection_begin, $scope.selection_end);
            }
        }else if(e.key == "x"){
            if(typeof $scope.selected_subannotation !== "undefined" && $scope.selected_subannotation !== ''){
                $scope.excludeSubannotation($scope.selected_subannotation);
            }
        }
        //I had wanted to use arrow keys but for some insane reason,
        //javascript does not allow arrow keys with keypress
        if(typeof $scope.selected_subannotation !== "undefined" && $scope.selected_subannotation !== '' && (e.key == "l"  || e.key == "h")){
            const subannotations = $scope.utterance.subannotation_list[$scope.selected_subannotation.annotation_type][$scope.selected_subannotation.subannotation];

            let idx = subannotations.findIndex(x => x.id == $scope.selected_subannotation.id);
            if (e.key == "l") {
                idx = idx + 1;
            }else if(e.key == "h"){
                idx = idx - 1;
            }
            if(idx >= subannotations.length)
                idx = 0;
            if(idx < 0)
                idx = subannotations.length - 1;
            $scope.selectSubannotation(subannotations[idx]);
        }
        //if(e.key == "r")
        //    $scope.resetSubannotations();
        if(e.key == "c")
            $scope.commitChanges();
        $scope.$apply();
    });
});
