
angular.module('iscan.errors')
    .service('Errors', function ($mdToast, $mdDialog, $http, __env) {
    let Errors = {};

    let base_url = __env.apiUrl + 'tasks/';

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
        return $http.get(base_url + task_id + '/exceptions/');
    }

    Errors.status = function(task_id) {
        return $http.get(base_url + task_id + '/status/');
    }

    Errors.isTaskDone = function(task_id) {
        return $http.get(base_url + task_id + '/finished/');
    }

    Errors.taskFailed = function(task_id) {
        return $http.get(base_url + task_id + '/failed/');
    }

    Errors.checkForErrors = function(task_id) {
        Errors.isTaskDone(task_id).then(done_res => {
            if(done_res.data){
                Errors.taskFailed(task_id).then(fail_res => {
                    if(fail_res.data){
                        Errors.getTaskExceptions(task_id).then(err_res => {
                            Errors.popUp("There was an error with task: "+err_res.data["name"],
                                err_res.data["message"]);
                        })
                    }
                });
            }else{
                //If the task ain't done, check again in 5 seconds
                setTimeout(Errors.checkForErrors(task_id), 5000);
            }
        });
    }

    return Errors;
});
