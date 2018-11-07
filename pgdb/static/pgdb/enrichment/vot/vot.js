angular.module('vot', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('VOTCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {


    djangoAuth.authenticationStatus(true).then(function () {
	    Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
		$scope.hierarchy = res.data;
		$scope.phone_subsets = $scope.hierarchy.subset_types.phone;
	    });
    })

    if ($stateParams.enrichment_id == null) {
        $scope.newVOT = true;
        $scope.enrichment = {enrichment_type: "vot"};
    } else {
        $scope.newVOT = false;
        Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
            $scope.enrichment = res.data.config;
        });
    }

    $scope.save = function () {
        if ($scope.newVOT) {
            Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
	        $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        } else {
            Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
	        $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        }
    };

    $scope.help_titles = {
        stop_subset: 'Stops subset',
        vot_minmax: 'VOT Minimum and Maximum',
        window_minmax: 'Window Minimum and Maximum',
    };

    $scope.help_text = {
        stop_subset: 'Stops subset',
        vot_minmax: 'VOT Min',
        window_minmax: 'WINDOW Max',
    };

    $scope.setToDefault = function(voiced) {
        if(voiced){
            $scope.enrichment.vot_min = 5;
            $scope.enrichment.vot_max = 100;
	}else{
            $scope.enrichment.vot_min = 15;
            $scope.enrichment.vot_max = 250;
	}
        $scope.enrichment.window_min = -30;
        $scope.enrichment.window_max = 30;
    }

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
});
