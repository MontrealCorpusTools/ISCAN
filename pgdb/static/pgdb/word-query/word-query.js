angular.module('wordQuery', [
    'pgdb.corpora',
    'pgdb.words'
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
    }]).controller('WordQueryCtrl', function ($scope, $rootScope, Words, Corpora, $state, $stateParams) {
        $scope.ordering = '-discourse.name';
        $scope.currentPage = 1;
        $scope.query = {};
        $scope.resultsPerPage = 100;
        $scope.offset = 0;
        $scope.numPages = 0;
        $scope.query_running = true;
        $scope.query_text = 'Fetching results...';

        $scope.properties = [];

            $scope.$on('authenticated', function (e, res) {
                $scope.user = $rootScope.user;
                $scope.authenticated = true;
                if ($scope.user.id == undefined) {
                    $state.go('home');
                }
                if ($scope.user.is_superuser) {

                    $scope.can_view = true;

                }
                else {

                    $scope.can_view = false;
                    console.log($scope.user.corpus_permissions);
                    for (i = 0; i < $scope.user.corpus_permissions.length; i++) {
                        if ($scope.user.corpus_permissions[i].corpus === $stateParams.corpus_id) {
                            $scope.can_view = $scope.user.corpus_permissions[i].can_view_detail;
                        }
                    }
                }
            });


        $scope.update = function () {
            $scope.query_running = true;
            $scope.query_text = 'Fetching results...';
            Words.all($stateParams.corpus_id, $scope.offset, $scope.ordering, $scope.query).then(function (res) {
                console.log(res.data);
                $scope.count = res.data.count;
                $scope.numPages = Math.ceil($scope.count / $scope.resultsPerPage);
                $scope.words = res.data.results;
                $scope.updatePagination();
                $scope.query_running = false;
                $scope.query_text = 'Run query';
            });

        };

        Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
            console.log($scope.corpus)
        });

        Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            console.log($scope.hierarchy);
            var prop;
            $scope.properties = [];
            for (i=0; i < $scope.hierarchy.type_properties.word.length; i++){
                prop = $scope.hierarchy.type_properties.word[i][0];
                if ($scope.properties.indexOf(prop) === -1 && prop !== 'label' && prop !== 'id'){
                    $scope.properties.push(prop);
                }
            }
            for (i=0; i < $scope.hierarchy.token_properties.word.length; i++){
                prop = $scope.hierarchy.token_properties.word[i][0];
                if ($scope.properties.indexOf(prop) === -1 && prop !== 'label' && prop !== 'id'){
                    $scope.properties.push(prop);
                }
            }
            console.log($scope.properties)
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