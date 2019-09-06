var env = {};

// Import variables if present (from env.js)
if (window) {
    Object.assign(env, window.__env);
}

var app = angular.module('iscan', [
    'ui.router',
    'long2know',
    'ngResource',
    'ngFileSaver',
    'ui.bootstrap',
    'ngCookies',
    'ngMaterial',
    'ngSanitize',
    'angular-mousetrap',
    'checklist-model',
    'md.data.table',
    'changePassword',
    'userList',
    'userDetail',
    'userCreate',
    'databaseList',
    'databaseDetail',
    'corpusDetail',
    'bestiaryPlot',
    'queryDetail',
    'query',
    'relativization',
    'enrichment',
    'pitch_tracks',
    'formant_tracks',
    'intensity_tracks',
    'formant_points',
    'praat_script',
    'navbar',
    'scriptList',
    'login',
    'logout',
    'subset',
    'pausesEnrichment',
    'utterancesEnrichment',
    'stressWordPropEnrichment',
    'syllableEnrichment',
    'hierarchical',
    'vot',
    'importCsv',
    'csvProperties'
]).run(
    function ($http, $cookies) {
        //$http.defaults.headers.post['X-CSRFToken'] = $cookies.get('csrftoken');
        //console.log($http.defaults.headers.post)
        // Add the following two lines
        $http.defaults.xsrfCookieName = 'csrftoken';
        $http.defaults.xsrfHeaderName = 'X-CSRFToken';
    }).run(function ($rootScope) {
        $rootScope.Utils = {
            keys: Object.keys
        }
    });


app.constant('__env', env);

app.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('home', {
            url: '/',
            template: '<div></div>'
        }).state('database-list', {
            url: '/databases',
            templateUrl: static('iscan/database-list/database_list.html'),
            controller: 'DatabaseListCtrl'
        }).state('change-password', {
            url: '/change_password',
            templateUrl: static('iscan/change-password/change_password.html'),
            controller: 'ChangePasswordCtrl'
        }).state('user-list', {
            url: '/users',
            templateUrl: static('iscan/user-list/user_list.html'),
            controller: 'UserListCtrl'
        }).state('script-list', {
            url: '/scripts',
            templateUrl: static('iscan/script-list/script_list.html'),
            controller: 'ScriptListCtrl'
        }).state('user-create', {
            url: '/users/create/',
            templateUrl: static('iscan/user-create/user_create.html'),
            controller: 'UserCreateCtrl'
        }).state('user-detail', {
            url: '/users/:user_id',
            templateUrl: static('iscan/user-detail/user_detail.html'),
            controller: 'UserDetailCtrl'
        }).state('database-detail', {
        url: '/databases/{database_id:int}',
        templateUrl: static('iscan/database-detail/database_detail.html'),
        controller: 'DatabaseDetailCtrl'
    }).state('corpus-detail', {
        url: '/corpora/:corpus_id',
        templateUrl: static('iscan/corpus-detail/corpus_detail.html'),
        controller: 'CorpusDetailCtrl'
    }).state('enrichment', {
        url: '/corpora/:corpus_id/enrichment',
        templateUrl: static('iscan/enrichment/enrichment.html'),
        controller: 'EnrichmentCtrl'
    }).state('bestiary-plot', {
        url: '/bestiary/:corpus_id',
        templateUrl: static('intonation/bestiary-plot/bestiary_plot.html'),
        controller: 'BestiaryPlotCtrl'
    }).state('utterance-detail', {
        url: '/utterances/:corpus_id/:utterance_id',
        templateUrl: static('iscan/utterance-detail/utterance_detail.html'),
        controller: 'UtteranceDetailCtrl'
    }).state('query', {
        url: '/query/:corpus_id/{query_id:int}',
        templateUrl: static('iscan/query/query.html'),
        controller: 'QueryCtrl'
    }).state('new_query', {
        url: '/new_query/:corpus_id/:type',
        templateUrl: static('iscan/query/query.html'),
        controller: 'QueryCtrl'
    }).state('query-detail', {
        url: '/query_results/:corpus_id/:query_id/:detail_index',
        templateUrl: static('iscan/query-detail/query_detail.html'),
        controller: 'QueryDetailCtrl'
    }).state('edit_subset', {
        url: '/subset/:corpus_id/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/subset/subset.html'),
        controller: 'NewSubsetCtrl'
    }).state('new_subset', {
        url: '/subset/:corpus_id/:type',
        templateUrl: static('iscan/enrichment/subset/subset.html'),
        controller: 'NewSubsetCtrl'
    }).state('edit_hierarchical_property', {
        url: '/hierarchical/:corpus_id/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/hierarchical/hierarchical.html'),
        controller: 'NewHierarchicalCtrl'
    }).state('new_hierarchical_property', {
        url: '/hierarchical/:corpus_id',
        templateUrl: static('iscan/enrichment/hierarchical/hierarchical.html'),
        controller: 'NewHierarchicalCtrl'
    }).state('edit_relativize_property', {
        url: '/property_relativization/:corpus_id/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/relativization/property_relativization.html'),
        controller: 'PropertyRelativizationCtrl'
    }).state('new_relativize_property', {
        url: '/property_relativization/:corpus_id',
        templateUrl: static('iscan/enrichment/relativization/property_relativization.html'),
        controller: 'PropertyRelativizationCtrl'
    }).state('edit_relativize_track', {
        url: '/track_relativization/:corpus_id/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/relativization/track_relativization.html'),
        controller: 'TrackRelativizationCtrl'
    }).state('new_relativize_track', {
        url: '/track_relativization/:corpus_id',
        templateUrl: static('iscan/enrichment/relativization/track_relativization.html'),
        controller: 'TrackRelativizationCtrl'
    }).state('check', {
            url: '/check'
        })
        .state('login', {
            url: '/login',
            templateUrl: static('iscan/login/login.html'),
            controller: 'LoginCtrl',
            resolve: {
            }
        }).state('logout',{
            url: '/logout',
            templateUrl: static('iscan/logout/logout.html'),
            controller: 'LogoutCtrl',
            resolve: {
            }
        }).state('new_pitch_tracks', {
        url: '/corpora/:corpus_id/enrichment/pitch_tracks',
        templateUrl: static('iscan/enrichment/pitch_tracks/pitch_tracks.html'),
        controller: 'PitchTrackCtrl'
        }).state('edit_pitch_tracks', {
	url: '/corpora/:corpus_id/enrichment/pitch_tracks/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/pitch_tracks/pitch_tracks.html'),
        controller: 'PitchTrackCtrl'
        }).state('new_formant_tracks', {
        url: '/corpora/:corpus_id/enrichment/formant_tracks',
        templateUrl: static('iscan/enrichment/formant_tracks/formant_tracks.html'),
        controller: 'FormantTrackCtrl'
        }).state('edit_formant_tracks', {
	url: '/corpora/:corpus_id/enrichment/formant_tracks/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/formant_tracks/formant_tracks.html'),
        controller: 'FormantTrackCtrl'
        }).state('new_intensity_tracks', {
        url: '/corpora/:corpus_id/enrichment/intensity_tracks',
        templateUrl: static('iscan/enrichment/intensity_tracks/intensity_tracks.html'),
        controller: 'IntensityTrackCtrl'
        }).state('edit_intensity_tracks', {
	url: '/corpora/:corpus_id/enrichment/intensity_tracks/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/intensity_tracks/intensity_tracks.html'),
        controller: 'IntensityTrackCtrl'
        }).state('new_formant_points', {
        url: '/corpora/:corpus_id/enrichment/formant_points',
        templateUrl: static('iscan/enrichment/formant_points/formant_points.html'),
        controller: 'FormantPointCtrl'
        }).state('edit_formant_points', {
	url: '/corpora/:corpus_id/enrichment/formant_points/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/formant_points/formant_points.html'),
        controller: 'FormantPointCtrl'
        }).state('new_custom_praat_script', {
        url: '/corpora/:corpus_id/enrichment/praat_script',
        templateUrl: static('iscan/enrichment/praat_script/praat_script.html'),
        controller: 'PraatScriptCtrl'
        }).state('edit_custom_praat_script', {
	url: '/corpora/:corpus_id/enrichment/praat_script/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/praat_script/praat_script.html'),
        controller: 'PraatScriptCtrl'
        }).state('new_csv-properties', {
        url: '/corpora/:corpus_id/enrichment/csv-properties',
        templateUrl: static('iscan/enrichment/csv-properties/csv-properties.html'),
        controller: 'CSVPropertiesCtrl'
        }).state('edit_csv-properties', {
        url: '/corpora/:corpus_id/enrichment/csv-properties/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/csv-properties/csv-properties.html'),
        controller: 'CSVPropertiesCtrl'
        }).state('new_vot', {
        url: '/corpora/:corpus_id/enrichment/vot',
        templateUrl: static('iscan/enrichment/vot/vot.html'),
        controller: 'VOTCtrl'
        }).state('edit_vot', {
        url: '/corpora/:corpus_id/enrichment/vot/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/vot/vot.html'),
        controller: 'ImportCSVCtrl'
        }).state('new_import_csv', {
        url: '/corpora/:corpus_id/enrichment/import-csv',
        templateUrl: static('iscan/enrichment/import-csv/import-csv.html'),
        controller: 'ImportCSVCtrl'
        }).state('edit_import_csv', {
        url: '/corpora/:corpus_id/enrichment/import-csv/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/import-csv/import-csv.html'),
        controller: 'VOTCtrl'
        }).state('new_utterances', {
        url: '/corpora/:corpus_id/enrichment/utterances',
        templateUrl: static('iscan/enrichment/annotation-level/utterance.html'),
        controller: 'UtterancesEnrichmentCtrl'
        }).state('edit_utterances', {
        url: '/corpora/:corpus_id/enrichment/utterances/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/annotation-level/utterance.html'),
        controller: 'UtterancesEnrichmentCtrl'
        }).state('new_pauses', {
        url: '/corpora/:corpus_id/enrichment/pauses',
        templateUrl: static('iscan/enrichment/annotation-level/pause.html'),
        controller: 'PausesEnrichmentCtrl'
        }).state('edit_pauses', {
        url: '/corpora/:corpus_id/enrichment/pauses/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/annotation-level/pause.html'),
        controller: 'PausesEnrichmentCtrl'
        }).state('new_syllables', {
        url: '/corpora/:corpus_id/enrichment/syllables',
        templateUrl: static('iscan/enrichment/annotation-level/syllable.html'),
        controller: 'SyllableEnrichmentCtrl'
        }).state('edit_syllables', {
        url: '/corpora/:corpus_id/enrichment/syllables/{enrichment_id:int}',
        templateUrl: static('iscan/enrichment/annotation-level/syllable.html'),
        controller: 'SyllableEnrichmentCtrl'
        }).state('new_stress-word-prop', {
        url: '/corpora/:corpus_id/enrichment/stress-word-prop',
        templateUrl: static('iscan/enrichment/stress-word-prop/stress-word-prop.html'),
        controller: 'StressWordPropEnrichmentCtrl'
    });

    $urlRouterProvider.otherwise('/');
});
app.run(['$transitions', function($transitions) {
	//Makes each page scroll to top after a page change.
	$transitions.onSuccess({}, function() {
		document.body.scrollTop = document.documentElement.scrollTop = 0;
	})
}]);
