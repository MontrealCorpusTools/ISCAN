angular.module('bestiaryPlot', [
    'pgdb.utterances'
])
    .controller('BestiaryPlotCtrl', function ($scope, Utterances, Corpora, $state, $stateParams) {
        $scope.currentPage = 1;
        $scope.resultsPerPage = 100;
        $scope.offset = 0;
        $scope.numPages = 0;
        $scope.update = function () {
            Utterances.all($stateParams.corpus_id, $scope.offset, $scope.ordering, true).then(function (res) {
                console.log(res.data);
                $scope.count = res.data.count;
                $scope.numPages = Math.ceil($scope.count / $scope.resultsPerPage);
                $scope.utterances = res.data.results;
                $scope.updatePagination();
            });

        };


        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
        });

        $scope.$on('DETAIL_REQUESTED', function (e, res) {
            $state.go('utterance-detail', {corpus_id: $stateParams.corpus_id, utterance_id:res});
        });

        $scope.$on('SOUND_REQUESTED', function (e, res) {

            var snd = new Audio(Utterances.sound_file_url($scope.corpus.name, res)); // buffers automatically when created
            snd.play();

        });

        $scope.updatePagination = function () {
            $scope.pages = [];
            $scope.pages.push(1);
            for (i = 2; i < $scope.numPages; i++) {
                if (i === 2 && $scope.currentPage - i >= 3) {
                    $scope.pages.push('...');
                }
                if (Math.abs($scope.currentPage - i) < 3) {
                    $scope.pages.push(i);
                }
                if (i === $scope.numPages - 1 && $scope.numPages - 1 - $scope.currentPage >= 3) {
                    $scope.pages.push('...');
                }
            }
            $scope.pages.push($scope.numPages);
        };

        $scope.next = function () {
            if ($scope.currentPage != $scope.numPages) {
                $scope.refreshPagination($scope.currentPage + 1);
            }
        };
        $scope.first = function () {
            if ($scope.currentPage != 1) {
            $scope.refreshPagination(1);
            }
        };
        $scope.last = function () {
            if ($scope.currentPage != $scope.numPages) {
            $scope.refreshPagination($scope.numPages);
            }
        };

        $scope.previous = function () {
            if ($scope.currentPage != 1) {
                $scope.refreshPagination($scope.currentPage - 1);
            }
        };

        $scope.refreshPagination = function (newPage) {
            $scope.currentPage = newPage;
            $scope.offset = ($scope.currentPage - 1) * $scope.resultsPerPage;
            $scope.update()
        };

        $scope.update();
    });