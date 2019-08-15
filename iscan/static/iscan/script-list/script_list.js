angular.module('scriptList', [
    'iscan.corpora',
    'iscan.enrichment',
    'iscan.errors',
    'iscan.scripts'
]).controller('ScriptListCtrl', function ($scope, $rootScope, $interval, Errors, Scripts, $mdDialog, $state, $stateParams, $timeout, djangoAuth) {
    $scope.script_args = {script: "", target_corpus: "", reset: false}; 
    $scope.disabled_running_scripts = false;
    $scope.corpora = [];
    $scope.scripts = [];
    $scope.script_runs = [];

    Scripts.list_corpora().then(res => $scope.corpora = res.data);
    Scripts.list_scripts().then(res => $scope.scripts = res.data);
    
    $scope.update_runs = function () {
        Scripts.list().then(res => $scope.script_runs = res.data);
    }
    $scope.update_runs();

    $interval($scope.update_runs, 2000);

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
        Scripts.get_script_log(script_run.id)
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
