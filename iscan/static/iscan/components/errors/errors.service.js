
angular.module('iscan.errors')
    .service('Errors', function ($mdToast, $mdDialog) {
    let Errors = {};

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
    return Errors;
});
