var app = angular.module('intonation', [
    'ui.router',
    'ngCookies',
    'ngMaterial',
    'angular-mousetrap',
    'bestiaryPlot',
    'utteranceDetail'
]).run(
    function ($http, $cookies) {
        $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
        // Add the following two lines
        $http.defaults.xsrfCookieName = 'csrftoken';
        $http.defaults.xsrfHeaderName = 'X-CSRFToken';
    });


app.constant('BASE_URL', 'http://127.0.0.1:8080/api/');
app.constant('INTONATION_URL', 'http://127.0.0.1:8080/intonation/');

app.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('bestiary-plot', {
            url: '/bestiary/:corpus_id',
            templateUrl: '/static/intonation/bestiary-plot/bestiary_plot.html',
            controller: 'BestiaryPlotCtrl'
        }).state('utterance-detail', {
        url: '/utterances/:corpus_id/:utterance_id',
        templateUrl: '/static/intonation/utterance-detail/utterance_detail.html',
        controller: 'UtteranceDetailCtrl'
    });

    $urlRouterProvider.otherwise('/');
});