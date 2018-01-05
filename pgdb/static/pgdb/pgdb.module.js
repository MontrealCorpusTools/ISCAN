var app = angular.module('pgdb', [
    'ui.router',
    'ngCookies',
    'ngMaterial',
    'databaseList',
    'databaseDetail',
    'corpusDetail'
]).run(
    function ($http, $cookies) {
        $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
        // Add the following two lines
        $http.defaults.xsrfCookieName = 'csrftoken';
        $http.defaults.xsrfHeaderName = 'X-CSRFToken';
    });


app.constant('BASE_URL', 'http://127.0.0.1:8080/api/');

app.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('database-list', {
            url: '/databases',
            templateUrl: '/static/pgdb/database-list/database_list.html',
            controller: 'DatabaseListCtrl'
        }).state('database-detail', {
        url: '/databases/{database_id:int}',
        templateUrl: '/static/pgdb/database-detail/database_detail.html',
        controller: 'DatabaseDetailCtrl'
    }).state('corpus-detail', {
        url: '/corpora/:corpus_id',
        templateUrl: '/static/pgdb/corpus-detail/corpus_detail.html',
        controller: 'CorpusDetailCtrl'
    });

    $urlRouterProvider.otherwise('/');
});