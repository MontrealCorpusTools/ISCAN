angular.module('scriptList', [
    'iscan.corpora',
    'iscan.enrichment',
    'iscan.errors',
    'iscan.scripts'
]).controller('ScriptListCtrl', function ($scope, $rootScope, Errors, Scripts, $mdDialog, $state, $stateParams, $timeout, djangoAuth) {
    $scope.script_args = {script: "", target_corpus: "", reset: false}; 
    $scope.corpora = [];
    $scope.scripts = [];
    $scope.script_runs = [];

    Scripts.list_corpora().then(res => $scope.corpora = res.data);
    Scripts.list_scripts().then(res => $scope.scripts = res.data);
    Scripts.list().then(res => $scope.script_runs = res.data; console.log(res.data));

    $scope.submit_script = function() {
        Scripts.run_script($scope.script_args).then(res => {
            console.log("script ran");
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
