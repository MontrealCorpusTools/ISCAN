angular.module('bestiaryPlot', [
    'pgdb.annotationQuery'
])
    .controller('BestiaryPlotCtrl', function ($scope, AnnotationQuery, Corpora, $state, $stateParams) {
        $scope.filters = {discourse: {}, speaker:{name: 'All'}};
        $scope.export = {};
        $scope.filter_options = {};
        $scope.currentPage = 1;
        $scope.resultsPerPage = 100;
        $scope.offset = 0;
        $scope.numPages = 0;
        $scope.update = function () {
            var params = {};
            for (var key in $scope.filters){
                console.log(key);
                var data = $scope.filters[key];
                console.log(data);
                for (var key2 in data){
                    if (data[key2] == undefined){
                    params[key + '__' + key2 ]= 'null';
                    }
                    else if (data[key2] != 'All'){
                    params[key + '__' + key2 ]= data[key2];
                    }
                }
            }
            console.log(params);
            AnnotationQuery.subset($stateParams.corpus_id, 'utterance', $scope.offset, $scope.ordering, true, params).then(function (res) {
                console.log(res.data);
                $scope.count = res.data.count;
                $scope.numPages = Math.ceil($scope.count / $scope.resultsPerPage);
                $scope.utterances = res.data.results;
                $scope.updatePagination();
            });

        };

        Corpora.discourse_property_options($stateParams.corpus_id).then(function (res) {
            for (i =0; i < res.data.length; i ++){
                res.data[i].options.unshift('All');
                $scope.filters.discourse[res.data[i].name] = 'All';
            }
            $scope.filter_options.discourse = res.data;

            console.log(res.data)
        });

        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
        });
        Corpora.speakers($stateParams.corpus_id).then(function (res) {
            res.data.unshift('All')
            $scope.speakers = res.data;
            $scope.update();
        });
        Corpora.discourses($stateParams.corpus_id).then(function (res) {
            $scope.discourses = res.data;
        });

        $scope.$on('DETAIL_REQUESTED', function (e, res) {
            console.log($stateParams.corpus_id, res);
            $state.go('utterance-detail', {corpus_id: $stateParams.corpus_id, utterance_id:res});
        });

        $scope.$on('SOUND_REQUESTED', function (e, res) {

            var snd = new Audio(Utterances.sound_file_url($scope.corpus.id, res)); // buffers automatically when created
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

        $scope.export_url = Utterances.export_pitch_tracks($stateParams.corpus_id);
    });