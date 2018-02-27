angular.module('wordQuery', [
    'pgdb.corpora',
    'pgdb.words',
    'pgdb.query'
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
    }]).controller('WordQueryCtrl', function ($scope, $rootScope, Words, Corpora, $state, $stateParams, QueryState) {
    $scope.ordering = QueryState.wordOrdering;
    $scope.currentPage = QueryState.wordCurrentPage;
    $scope.query = QueryState.wordQuery;
    $scope.resultsPerPage = QueryState.wordResultsPerPage;
    $scope.offset = QueryState.wordOffset;
    $scope.numPages = QueryState.wordNumPages;
    $scope.query_running = QueryState.wordQueryRunning;
    $scope.query_text = QueryState.wordQueryText;
    $scope.words = QueryState.wordQueryResults;
    $scope.count = QueryState.wordQueryResultCount;
    $scope.columns = QueryState.wordQueryColumns;
    console.log($scope.words);

    $scope.properties = [];

    $scope.$on('authenticated', $scope.refreshPermissions);

    $scope.refreshPermissions = function(){
        $scope.user = $rootScope.user;
        console.log('blah', $scope.user)
        $scope.authenticated = $rootScope.authenticated;
        if ($scope.user == undefined) {
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
    };
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

    $scope.addFilter = function(a_type){
        $scope.query[a_type].push({});
    };

    $scope.removeFilter = function(a_type, index){
        $scope.query[a_type].splice(index, 1);
    };
    Corpora.one($stateParams.corpus_id).then(function (res) {
        $scope.corpus = res.data;
        console.log($scope.corpus)
    });

    Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
        $scope.hierarchy = res.data;
        console.log($scope.hierarchy);
        var prop;
        $scope.properties = {
            word: [],
            utterance: [],
            discourse: [],
            speaker: []
        };
        $scope.propertyTypes = {
            word: {},
            utterance: {},
            discourse: {},
            speaker: {}
        };
        $scope.columns = {
            word: {},
            utterance: {},
            discourse: {},
            speaker: {}
        };
        for (i = 0; i < $scope.hierarchy.type_properties.word.length; i++) {
            prop = $scope.hierarchy.type_properties.word[i][0];
            $scope.propertyTypes.word[prop] = $scope.hierarchy.type_properties.word[i][1];
            if ($scope.properties.word.indexOf(prop) === -1 && prop !== 'id') {
                $scope.properties.word.push(prop);
                $scope.columns.word[prop] = false;
            }
        }
        for (i = 0; i < $scope.hierarchy.token_properties.word.length; i++) {
            prop = $scope.hierarchy.token_properties.word[i][0];
            $scope.propertyTypes.word[prop] = $scope.hierarchy.token_properties.word[i][1];
            if ($scope.properties.word.indexOf(prop) === -1 && prop !== 'id') {
                $scope.properties.word.push(prop);
                $scope.columns.word[prop] = false;
            }
        }
        for (i = 0; i < $scope.hierarchy.token_properties.utterance.length; i++) {
            prop = $scope.hierarchy.token_properties.utterance[i][0];
            $scope.propertyTypes.utterance[prop] = $scope.hierarchy.token_properties.utterance[i][1];
            if ($scope.properties.utterance.indexOf(prop) === -1 && prop !== 'id') {
                $scope.properties.utterance.push(prop);
                $scope.columns.utterance[prop] = false;
            }
        }

        for (i = 0; i < $scope.hierarchy.discourse_properties.length; i++) {
            prop = $scope.hierarchy.discourse_properties[i][0];
            $scope.propertyTypes.discourse[prop] = $scope.hierarchy.discourse_properties[i][1];
            if ($scope.properties.discourse.indexOf(prop) === -1 && prop !== 'id') {
                $scope.properties.discourse.push(prop);
                $scope.columns.discourse[prop] = false;
            }
        }

        for (i = 0; i < $scope.hierarchy.speaker_properties.length; i++) {
            prop = $scope.hierarchy.speaker_properties[i][0];
            $scope.propertyTypes.speaker[prop] = $scope.hierarchy.speaker_properties[i][1];
            if ($scope.properties.speaker.indexOf(prop) === -1 && prop !== 'id') {
                $scope.properties.speaker.push(prop);
                $scope.columns.speaker[prop] = false;
            }
        }

        console.log($scope.properties)
        console.log($scope.propertyTypes)
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

    //$scope.update();

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
    $scope.refreshPermissions();
});