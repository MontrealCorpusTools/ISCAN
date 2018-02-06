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
    'utteranceList',
    'navbar',
    'angularAuth',
    'login',
    'logout'
]).run(
    function ($http, $cookies) {
        $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
        // Add the following two lines
        $http.defaults.xsrfCookieName = 'csrftoken';
        $http.defaults.xsrfHeaderName = 'X-CSRFToken';
    });


app.constant('__env', env);
app.factory(
  'Config', function() {
    return {
      apiRoot: 'http://localhost:8080/api'
      };
    });
app.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('home', {
            url: '/',
            template: '<div></div>'
        })
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
        templateUrl: static('pgdb/utterance-detail/utterance_detail.html'),
        controller: 'UtteranceDetailCtrl'
    }).state('utterance-list', {
        url: '/utterances/:corpus_id',
        templateUrl: static('pgdb/utterance-list/utterance_list.html'),
        controller: 'UtteranceListCtrl'
    }).state('check', {
            url: '/check'
        })
        .state('login', {
            url: '/login',
            templateUrl: static('pgdb/login/login.html'),
            controller: 'LoginCtrl',
            resolve: {
            }
        }).state('logout',{
            url: '/logout',
            templateUrl: static('pgdb/logout/logout.html'),
            controller: 'LogoutCtrl',
            resolve: {
            }
        });

    $urlRouterProvider.otherwise('/');
});