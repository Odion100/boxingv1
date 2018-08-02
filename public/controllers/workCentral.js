angular.module('workCentralMod', [])

.controller('workCentralCtrl', ['$scope', 'ordersTbl', '$$msgbox', 'navBar', function($scope, ordersTbl, $$msgbox, navBar){
	
    navBar.currentView = "workCentral"

    $scope.$$msgbox = $$msgbox;
	/*$scope.tbl = ordersTbl;*/

	ordersTbl.getData({});
	ordersTbl.sortPropertyName = 'order_date';
	ordersTbl.sortReverse = true;
	$scope.test = function(){
		console.log(ordersTbl)
	}
}])