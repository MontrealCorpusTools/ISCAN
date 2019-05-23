angular.module('importCsv', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('ImportCSVCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, djangoAuth, $mdDialog) {


    djangoAuth.authenticationStatus(true).then(function () {
	    Corpora.hierarchy($stateParams.corpus_id).then(function (res) {
            $scope.hierarchy = res.data;
            $scope.phone_subsets = $scope.hierarchy.subset_types.phone.concat($scope.hierarchy.subset_tokens.phone);
	    });
    })

    $scope.excludeIds = function (x) {
        return !x.name.endsWith("_id");
    }

    $scope.uploading = false;
    $scope.uploaded = false;

    if ($stateParams.enrichment_id == null) {
        $scope.newCSV = true;
        $scope.enrichment = {enrichment_type: "importcsv"};
    } else {
        $scope.newCSV = false;
        Enrichment.one($stateParams.corpus_id, $stateParams.enrichment_id).then(function (res) {
            $scope.enrichment = res.data.config;
        });
    }

    $scope.save = function () {
        if ($scope.newCSV && !$scope.uploaded) {
            $scope.error_message = "You must upload a CSV"
            return;
        }

        if ($scope.newCSV) {
            Enrichment.create($stateParams.corpus_id, $scope.enrichment).then(function (res) {
                const id = res.data.id;
                Enrichment.create_file($stateParams.corpus_id, id, $scope.uploaded_data).then(function(e) {
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }).catch(function(res) {
                    $scope.error_message;
                });
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        } else {
            Enrichment.update($stateParams.corpus_id, $stateParams.enrichment_id, $scope.enrichment).then(function (res) {
                if($scope.uploaded){
                    Enrichment.create_file($stateParams.corpus_id, $stateParams.enrichment_id, $scope.uploaded_data).then(function(e) {
                        $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                    });
                }else{
                    $state.go('enrichment', {corpus_id: $stateParams.corpus_id});
                }
            }).catch(function (res) {
                $scope.error_message = res.data;
            });
        }
    };

    $scope.uploadCSV = function (id) {
        if (document.getElementById('csv-file').files.length < 1)
            return false;
        $scope.uploading = true;

        let f = document.getElementById('csv-file').files[0],
            r = new FileReader();
        const name = f.name;
        r.onloadend = function (e) {
            const data = e.target.result;
            $scope.uploaded = true;
            $scope.uploaded_data = {text: "data:application/octet-stream;base64,"+window.btoa(data), file_name: name};
            let cols = data.split('\n').shift().split(',').map(x => x.trim());
            cols = cols.map(x => ({name: x, included:false}));
            $scope.enrichment.columns = cols;
            $scope.enrichment.id_column = cols.find(x => x.endsWith("_id"));
            $scope.enrichment.annotation_type = $scope.enrichment.id_column.split("_id")[0];
            $scope.uploading = false;
        }
        r.readAsText(f);
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
});
