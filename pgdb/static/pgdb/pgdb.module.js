var env = {};

// Import variables if present (from env.js)
if (window) {
    Object.assign(env, window.__env);
}

var app = angular.module('pgdb', [
    'ui.router',
    'ngCookies',
    'ngMaterial',
    'angular-mousetrap',
    'databaseList',
    'databaseDetail',
    'corpusDetail',
    'bestiaryPlot',
    'utteranceDetail',
    'navbar'
]).run(
    function ($http, $cookies) {
        $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
        // Add the following two lines
        $http.defaults.xsrfCookieName = 'csrftoken';
        $http.defaults.xsrfHeaderName = 'X-CSRFToken';
    });


app.constant('__env', env);

app.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('database-list', {
            url: '/databases',
            templateUrl: static('pgdb/database-list/database_list.html'),
            controller: 'DatabaseListCtrl'
        }).state('database-detail', {
        url: '/databases/{database_id:int}',
        templateUrl: static('pgdb/database-detail/database_detail.html'),
        controller: 'DatabaseDetailCtrl'
    }).state('corpus-detail', {
        url: '/corpora/:corpus_id',
        templateUrl: static('pgdb/corpus-detail/corpus_detail.html'),
        controller: 'CorpusDetailCtrl'
    }).state('bestiary-plot', {
        url: '/bestiary/:corpus_id',
        templateUrl: static('intonation/bestiary-plot/bestiary_plot.html'),
        controller: 'BestiaryPlotCtrl'
    }).state('utterance-detail', {
        url: '/utterances/:corpus_id/:utterance_id',
        templateUrl: static('intonation/utterance-detail/utterance_detail.html'),
        controller: 'UtteranceDetailCtrl'
    });

    $urlRouterProvider.otherwise('/');
});