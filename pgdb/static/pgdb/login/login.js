angular.module("login", ['pgdb.auth'])
  .controller('LoginCtrl', function ($scope, $state, djangoAuth, Validate) {
    $scope.model = {'username':'','password':''};
  	$scope.complete = false;
    $scope.login = function(formData){
      $scope.errors = [];
      Validate.form_validation(formData,$scope.errors);
      if(!formData.$invalid){
        djangoAuth.login($scope.model.username, $scope.model.password)
        .then(function(data){
        	// success case
            console.log('success', data)
        	$state.go("home");
        },function(data){
        	// error case
            console.log('error', data)
        	$scope.errors = data;
        });
      }
    }
  });