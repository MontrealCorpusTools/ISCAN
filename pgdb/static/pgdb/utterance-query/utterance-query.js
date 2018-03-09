angular.module('utteranceQuery', [
    'pgdb.corpora',
    'pgdb.utterances',
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
    }]).controller('UtteranceQueryCtrl', function ($scope, $rootScope, Utterances, Corpora, $state, $stateParams, QueryState) {
    $scope.queryState = QueryState;
    console.log($scope.queryState.columns);


    $scope.properties = [];

    $scope.$on('authenticated', $scope.refreshPermissions);

    $scope.refreshPermissions = function(){
        $scope.user = $rootScope.user;
        $scope.authenticated = $rootScope.authenticated;
        if ($scope.user === undefined) {
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
        $scope.queryState.type = 'utterance';
        $scope.queryState.query_running = true;
        $scope.queryState.query_text = 'Fetching results...';
        Utterances.all($stateParams.corpus_id, $scope.queryState.offset, $scope.queryState.ordering, false, $scope.queryState.query).then(function (res) {
            console.log(res.data);
            $scope.queryState.count = res.data.count;
            $scope.queryState.numPages = Math.ceil($scope.queryState.count / $scope.queryState.resultsPerPage);
            $scope.queryState.results = res.data.results;
            $scope.updatePagination();
            $scope.queryState.query_running = false;
            $scope.queryState.query_text = 'Run query';
        });

    };

    $scope.addFilter = function(a_type){
        $scope.queryState.query[a_type].push({});
    };

    $scope.removeFilter = function(a_type, index){
        $scope.queryState.query[a_type].splice(index, 1);
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
            utterance: [],
            discourse: [],
            speaker: []
        };
        $scope.propertyTypes = {
            utterance: {},
            discourse: {},
            speaker: {}
        };
        for (i = 0; i < $scope.hierarchy.token_properties.utterance.length; i++) {
            prop = $scope.hierarchy.token_properties.utterance[i][0];
            $scope.propertyTypes.utterance[prop] = $scope.hierarchy.token_properties.utterance[i][1];
            if ($scope.properties.utterance.indexOf(prop) === -1 && prop !== 'id') {
                $scope.properties.utterance.push(prop);
            }
        }

        for (i = 0; i < $scope.hierarchy.discourse_properties.length; i++) {
            prop = $scope.hierarchy.discourse_properties[i][0];
            $scope.propertyTypes.discourse[prop] = $scope.hierarchy.discourse_properties[i][1];
            if ($scope.properties.discourse.indexOf(prop) === -1 && prop !== 'id') {
                $scope.properties.discourse.push(prop);
            }
        }

        for (i = 0; i < $scope.hierarchy.speaker_properties.length; i++) {
            prop = $scope.hierarchy.speaker_properties[i][0];
            $scope.propertyTypes.speaker[prop] = $scope.hierarchy.speaker_properties[i][1];
            if ($scope.properties.speaker.indexOf(prop) === -1 && prop !== 'id') {
                $scope.properties.speaker.push(prop);
            }
        }
    });


    $scope.updatePagination = function () {
        $scope.queryState.pages = [];
        $scope.queryState.pages.push(1);
        for (i = 2; i < $scope.queryState.numPages; i++) {
            if (i === 2 && $scope.queryState.currentPage - i >= 3) {
                $scope.queryState.pages.push('...');
            }
            if (Math.abs($scope.queryState.currentPage - i) < 3) {
                $scope.queryState.pages.push(i);
            }
            if (i === $scope.queryState.numPages - 1 && $scope.queryState.numPages - 1 - $scope.queryState.currentPage >= 3) {
                $scope.queryState.pages.push('...');
            }
        }
        $scope.queryState.pages.push($scope.queryState.numPages);
    };

    $scope.next = function () {
        if ($scope.queryState.currentPage !== $scope.queryState.numPages) {
            $scope.refreshPagination($scope.queryState.currentPage + 1);
        }
    };
    $scope.first = function () {
        if ($scope.queryState.currentPage !== 1) {
            $scope.refreshPagination(1);
        }
    };
    $scope.last = function () {
        if ($scope.queryState.currentPage !== $scope.queryState.numPages) {
            $scope.refreshPagination($scope.queryState.numPages);
        }
    };

    $scope.previous = function () {
        if ($scope.queryState.currentPage !== 1) {
            $scope.refreshPagination($scope.queryState.currentPage - 1);
        }
    };

    $scope.refreshPagination = function (newPage) {
        $scope.queryState.currentPage = newPage;
        $scope.queryState.offset = ($scope.queryState.currentPage - 1) * $scope.queryState.resultsPerPage;
        $scope.update()
    };

    //$scope.update();

    $scope.refreshOrdering = function (new_ordering) {
        if (new_ordering === $scope.queryState.ordering) {
            new_ordering = '-' + new_ordering
        }
        $scope.queryState.ordering = new_ordering;
        $scope.update();
    };

    $scope.refreshSearch = function () {
        $scope.update()
    };

    $scope.refreshPermissions();
});