angular.module('enrichment', [
    'pgdb.corpora',
    'pgdb.enrichment'
]).controller('EnrichmentCtrl', function ($scope, $rootScope, Enrichment, Corpora, $state, $stateParams, $timeout) {

        $scope.$on('unauthenticated', function(){
            $state.go('home');
        });
        var loadTime = 10000, //Load the data every second
            errorCount = 0, //Counter for the server errors
            loadPromise; //Pointer to the promise created by the Angular $timout service


        var getData = function () {
            Corpora.one($stateParams.corpus_id).then(function (res) {
            $scope.corpus = res.data;
            console.log($scope.corpus);
            if ($scope.corpus.imported) {
                Corpora.status($stateParams.corpus_id).then(function (res) {
                    $scope.corpus_status = res.data;
                });

                Enrichment.all($stateParams.corpus_id).then(function (res) {
                    $scope.enrichments = res.data;
                });
            }
            else if ($scope.corpus.busy){


            }
            nextLoad(loadTime);
        });
        };

        var cancelNextLoad = function () {
            $timeout.cancel(loadPromise);
        };

        var nextLoad = function (mill) {
            mill = mill || loadTime;

            //Always make sure the last timeout is cleared before starting a new one
            cancelNextLoad();
            loadPromise = $timeout(getData, mill);
        };


        //Start polling the data from the server
        getData();


        //Always clear the timeout when the view is destroyed, otherwise it will keep polling and leak memory
        $scope.$on('$destroy', function () {
            cancelNextLoad();
        });

        $scope.runEnrichment = function (enrichment_id) {
            Enrichment.run($stateParams.corpus_id, enrichment_id).then(function (res) {
            getData();
            });
        };
        $scope.resetEnrichment = function(enrichment_id){
            Enrichment.reset($stateParams.corpus_id, enrichment_id).then(function (res) {
            getData();
            });
        };
        $scope.createAcoustics = function(){
           $state.go('acoustic_enrichment', {corpus_id: $stateParams.corpus_id})
        };
});