angular.module('scriptList', [
    'iscan.corpora',
    'iscan.enrichment',
    'iscan.errors',
    'iscan.scripts'
]).controller('ScriptListCtrl', function ($scope, $rootScope, Errors, Scripts, $mdDialog, $state, $stateParams, $timeout, djangoAuth) {

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
