angular.module('csvProperties', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('CSVPropertiesCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {


    djangoAuth.authenticationStatus(true).then(function () {

    }).catch(function () {
        $state.go('home');
    });

    if ($stateParams.enrichment_id == null) {
        $scope.newCSV = true;
        $scope.enrichment = {};
        $scope.hasFiles = false;
    } else {
        $scope.newCSV = false;
        $scope.hasFiles = true;
        Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
            $scope.enrichment = res.data.config;
        });
    }

    $scope.csv_options = [
        {
            name: 'Speaker CSV',
            type: 'speaker_csv'
        },
        {
            name: 'Lexicon CSV',
            type: 'lexicon_csv'
        },
        {
            name: 'Phone CSV',
            type: 'phone_csv'
        },
        {
            name: 'Sound file CSV',
            type: 'discourse_csv'
        },
    ];
    $scope.enrichment = {};
    $scope.save = function () {
        if ($scope.enrichment.path == null && document.getElementById('CSV-properties-file').files.length == 0) {
            $scope.error_message = "You must upload a file";
        } else if ($scope.newCSV) {
            Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                $scope.uploadCSVProperties(res.data.id);
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        } else {
            Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                if (document.getElementById('CSV-properties-file').files.length > 0) {
                    $scope.uploadCSVProperties($stateParams.enrichment_id);
                } else {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        }
    };
    $scope.newFiles = function (e) {
        $scope.$apply(function () {
            $scope.hasFiles = document.getElementById('CSV-properties-file').files.length > 0;
            $scope.fileName = '';
            if ($scope.hasFiles){
            $scope.fileName = document.getElementById('CSV-properties-file').files[0].name;

            }
        });
    };


    $scope.uploadCSVProperties = function (id) {
        var f = document.getElementById('CSV-properties-file').files[0],
            r = new FileReader();
        var name = f.name;
        r.onloadend = function (e) {
            var data = e.target.result;
            var resp = {text: data, file_name: name};
            Enrichment.create_file($stateParams.corpus_id, id, resp).then(function (e) {
                if (e.data) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        }
        r.readAsText(f);
    };
    $scope.help_titles = {
        file_type: 'File type',
        csv_file: 'CSV File'
    };
    $scope.help_text = {
        file_type: 'Specify what to enrich. Speaker CSV will add properties (i.e., gender, age, dialect, ' +
        'etc) from a CSV file to the speakers in  the first column of the CSV. ' +
        'Lexicon CSV will add properties (i.e., part of speech, stress pattern, etc) to the word types listed in the ' +
        'first column. Phone CSV will add properties (i.e., phonological features, (un)natural class specification, ' +
        'etc) to the phone types listed in the first column. Sound file CSV ' +
        'will add properties (i.e., recording location, recording quality, etc) to sound files.',
        csv_file: 'Specify the CSV file to upload and enrich from.'
    };

    $scope.getHelp = function (ev, helpType) {
        // Appending dialog to document.body to cover sidenav in docs app
        // Modal dialogs should fully cover application
        // to prevent interaction outside of dialog
        $mdDialog.show(
            $mdDialog.alert()
                .parent(angular.element(document.querySelector('html')))
                .clickOutsideToClose(true)
                .title($scope.help_titles[helpType])
                .textContent($scope.help_text[helpType])
                .ariaLabel('Help')
                .ok('Got it!')
                .targetEvent(ev)
        );
    };
}).directive('customOnChange', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var onChangeHandler = scope.$eval(attrs.customOnChange);
            element.on('change', onChangeHandler);
            element.on('$destroy', function () {
                element.off();
            });
        }
    };
});
