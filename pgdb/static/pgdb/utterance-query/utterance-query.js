angular.module('utteranceQuery', [
    'pgdb.corpora',
    'pgdb.utterances'
]).directive('dlEnterKey', function () {
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
    }]).controller('UtteranceQueryCtrl', function ($scope, Utterances, Corpora, $state, $stateParams) {
        $scope.ordering = '-discourse.name';
        $scope.currentPage = 1;
        $scope.resultsPerPage = 100;
        $scope.offset = 0;
        $scope.numPages = 0;
        $scope.update = function () {
            Utterances.all($stateParams.corpus_id, $scope.offset, $scope.ordering, $scope.searchText).then(function (res) {
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

        $scope.refreshOrdering = function (new_ordering) {
            if (new_ordering == $scope.ordering) {
                new_ordering = '-' + new_ordering
            }
            $scope.ordering = new_ordering;
            $scope.update();
        };

        $scope.refreshSearch = function () {
            $scope.update()
        }
    });