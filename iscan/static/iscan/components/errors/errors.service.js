
angular.module('iscan.errors')
    .service('Errors', function ($mdToast, $mdDialog, $http, __env) {
    let Errors = {};

    let base_url = __env.apiUrl + 'errors/';

    Errors.popUp = function (error_cause_text, error) {
                $mdToast.show(
                    $mdToast.simple()
                        .textContent(error_cause_text)
                        .position("bottom right")
                        .action('More info')
                        .actionKey('x')
                        .hideDelay(10000)
                        .highlightAction(true)).then(function (response, e) {
                    if (response == 'ok') {
                        $mdDialog
                            .show($mdDialog
                                .alert()
                                .title('Error ' + error.status + ': ' + error.statusText)
                                .textContent(error.data)
                                .ariaLabel('Error ' + error.status + ': ' + error.statusText)
                                .ok('Dismiss')
                                .targetEvent(e)
                            )
                    }
                });
    };

    Errors.getTaskExceptions = function(task_id){
        return $http.get(base_url + id + '/exceptions/');
    }

    Errors.status = function(task_id) {
        return $http.get(base_url + id + '/status/');
    }

    Errors.isTaskDone = function(task_id) {
        return $http.get(base_url + id + '/finished/');
    }

    return Errors;
});
