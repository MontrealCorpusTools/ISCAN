angular.module('utteranceDetail', [
    'pgdb.corpora',
    'pgdb.utterances'
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
})
    .controller('UtteranceDetailCtrl', function ($scope, Utterances, Corpora, $state, $stateParams, $document) {
        $scope.selection_begin = 0;
        Utterances.one($stateParams.corpus_id, $stateParams.utterance_id, true, true, true).then(function (res) {
            $scope.utterance = res.data;
            console.log($scope.utterance);
            $scope.initPlayer();
        })
            .catch(function (data) {
                if (data.status === 423){
                    $scope.utterance = {};
                }
            });

        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
        });

        $scope.initPlayer = function () {
            $scope.wav_url = Utterances.sound_file_url($scope.corpus.name, $stateParams.utterance_id);

            $scope.player = new Howl({
                src: [$scope.wav_url],
                format: ['wav'],
                onplay: function () {
                    requestAnimationFrame($scope.updatePlayLine)
                }
            });

        };
        $scope.playPause = function () {
            console.log('playpausing!');
            if ($scope.player.playing()) {
                $scope.player.stop();
            }
            else {
                $scope.player.start();
            }
        };

        $scope.seek = function (time) {
            $scope.selection_begin = time;
            $scope.player.seek(time - $scope.utterance.begin);
        };
        $scope.updateSelectionEnd = function (time) {
            $scope.selection_end = time;
        };

         $scope.$on('SEEK', function (e, res) { $scope.seek(res) });

         $scope.$on('UPDATESELECT', function (e, res) { $scope.selection_end = res; });

         $scope.$on('ZOOM_REQUESTED', function (e, res){
             $scope.$broadcast('ZOOM', res);
         });

         $scope.$on('TRACK_REQUESTED', function (e, res){
             Utterances.generate_pitch_track($stateParams.corpus_id, $stateParams.utterance_id, res).then(function(res){
                 $scope.utterance.pitch_track = res.data;
                 console.log($scope.utterance.pitch_track);
             });
         });

         $scope.$on('SAVE_TRACK', function (e, res){
             Utterances.save_pitch_track($scope.corpus.name, $stateParams.utterance_id, $scope.utterance.pitch_track).then(function (res) {
                 console.log(res.data);
             });
         });

        $scope.updatePlayLine = function () {
            var actual_time = $scope.player.seek() + $scope.utterance.begin;
            if ($scope.player.playing()) {
                $scope.$broadcast('UPDATEPLAY', actual_time);
                if ($scope.selection_end != null && actual_time > $scope.selection_end - 0.005) {
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
                    if (!$scope.player.playing()) {
                        $scope.player.play();
                    }
                    else {
                        $scope.player.pause();

                    }
                }
            });
        }
    );