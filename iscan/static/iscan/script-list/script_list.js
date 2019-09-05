angular.module('scriptList', [
    'iscan.corpora',
    'iscan.enrichment',
    'iscan.errors',
    'iscan.scripts'
]).controller('ScriptListCtrl', function ($scope, $rootScope, __env, $interval, Errors, Scripts, $mdToast, $mdDialog, $state, $stateParams, $timeout, FileSaver, Blob, djangoAuth) {
    if (!__env.enableSpadeScripts){
        $state.go('home');
    }

    $scope.script_args = {script: "", target_corpus: "", reset: false}; 
    $scope.disabled_running_scripts = false;
    $scope.corpora = [];
    $scope.scripts = [];
    $scope.csvs = {};
    $scope.script_runs = [];

    $scope.update_corpora = function () {
        Scripts.list_corpora().then(res => {
            $scope.corpora = res.data;
            $scope.corpora.forEach((corpus, idx) => {
                Scripts.list_csvs(corpus).then(res => $scope.csvs[corpus] = res.data);
            });
        });
    }
    $scope.update_corpora();

    Scripts.list_scripts().then(res => $scope.scripts = res.data);
    
    $scope.update_runs = function () {
        Scripts.list().then(res => $scope.script_runs = res.data);
    }

    $scope.update_runs();

    $interval($scope.update_runs, 2500);
    $interval($scope.update_corpora, 2500);

    $scope.submit_script = function() {
        Scripts.run_script($scope.script_args).then(res => {
            $scope.disabled_running_scripts = true;
            setTimeout(() => {
                $scope.disabled_running_scripts = false;
            }, 5000);

        });
    }

    $scope.get_status = function (script) {
        if(script.running == true){
            return "running";
        }else if(script.failed == true){
            return "failed";
        }else if(script.running == false){
            return "succeeded";
        }
        return "impossible";
    }
    
    $scope.view_script_log = function(script) {
        Scripts.get_script_log(script.id).then(res => {
            let script_log = res.data;
            $mdDialog.show($mdDialog
                    .alert()
                    .title('Script ' + script.script_name + ' on ' + script.corpus_name)
                    .textContent(script_log)
                    .ariaLabel('Script ' + script.script_name + ' on ' + script.corpus_name)
                    .ok('Dismiss')
                );
        });
    }

    $scope.download_csv = function(corpus, csv) {
        let toast = $mdToast.simple()
                            .textContent("Preparing download");
        $mdToast.show(toast);
        Scripts.download_csv(corpus, csv).then(res => {
            $mdToast.hide(toast);
            let data = new Blob([res.data], {type: 'text/plain;charset=utf-8'});
            FileSaver.saveAs(data, csv);
        });
    }

}).directive('tooltip', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.hover(function () {
                element.tooltip('show');
            }, function () {
                element.tooltip('hide');
            });
        }
    };
});
