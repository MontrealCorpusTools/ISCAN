angular.module('query', [
    'pgdb.corpora',
    'pgdb.annotationQuery',
    'pgdb.query'
]).filter('titlecase', function() {
    return function (input) {
        var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i;

        input = input.toLowerCase();
        return input.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function(match, index, title) {
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
}).directive('dlEnterKey', function () {
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
    }]).controller('QueryCtrl', function ($scope, $rootScope, AnnotationQuery, Corpora, $state, $stateParams, QueryState) {
    $scope.queryState = QueryState.state;
    $scope.selectedType = $stateParams.type;
    if ($scope.queryState == undefined || $scope.queryState.type != $stateParams.type){
        QueryState.reset($stateParams.type);
        $scope.queryState = QueryState.state;
    }
    $scope.annotation_types = ['phone', 'syllable', 'word', 'utterance'];
    console.log($scope.queryState.columns);


    $scope.properties = [];

    $scope.$on('authenticated', $scope.refreshPermissions);

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
    };
    $scope.update = function () {
        $scope.queryState.queryRunning = true;
        $scope.queryState.queryText = 'Fetching results...';
        console.log($scope.queryState.query);
        AnnotationQuery.all($stateParams.corpus_id,$scope.queryState.type,  $scope.queryState.offset, $scope.queryState.ordering, false, $scope.queryState.query).then(function (res) {
                console.log(res.data);
                $scope.queryState.count = res.data.count;
                $scope.queryState.numPages = Math.ceil($scope.queryState.count / $scope.queryState.resultsPerPage);
                $scope.queryState.results = res.data.results;
                $scope.updatePagination();
                $scope.queryState.queryRunning = false;
                $scope.queryState.queryText = 'Run query';
            });

    };

    $scope.export = function(){
        $scope.queryState.queryRunning = true;
        $scope.queryState.queryText = 'Fetching results...';
        console.log($scope.queryState.query);
        AnnotationQuery.export($stateParams.corpus_id,$scope.queryState.type,   $scope.queryState.ordering, false, $scope.queryState).then(function (res) {
                $scope.queryState.queryRunning = false;
                $scope.queryState.queryText = 'Run query';
            });


    };

    $scope.addFilter = function (a_type) {
        $scope.queryState.query[a_type].push({});
    };

    $scope.removeFilter = function (a_type, index) {
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
            discourse: [],
            speaker: []
        };
        $scope.propertyTypes = {
            discourse: {},
            speaker: {}
        };


        var inc;
        for (j=0; j< $scope.annotation_types.length; j++) {
            inc = j >= $scope.annotation_types.indexOf($scope.selectedType);
            if (!inc) {
                continue
            }
            $scope.properties[$scope.annotation_types[j]] = [];
            $scope.propertyTypes[$scope.annotation_types[j]] = {};
            for (i = 0; i < $scope.hierarchy.type_properties[$scope.annotation_types[j]].length; i++) {
                prop = $scope.hierarchy.type_properties[$scope.annotation_types[j]][i][0];
                $scope.propertyTypes[$scope.annotation_types[j]][prop] = $scope.hierarchy.type_properties[$scope.annotation_types[j]][i][1];
                if ($scope.properties[$scope.annotation_types[j]].indexOf(prop) === -1 && prop !== 'id') {
                    $scope.properties[$scope.annotation_types[j]].push(prop);
                }
            }
            for (i = 0; i < $scope.hierarchy.token_properties[$scope.annotation_types[j]].length; i++) {
                prop = $scope.hierarchy.token_properties[$scope.annotation_types[j]][i][0];
                $scope.propertyTypes[$scope.annotation_types[j]][prop] = $scope.hierarchy.token_properties[$scope.annotation_types[j]][i][1];
                if ($scope.properties[$scope.annotation_types[j]].indexOf(prop) === -1 && prop !== 'id') {
                    $scope.properties[$scope.annotation_types[j]].push(prop);
                }
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