angular.module('app', [
    'ui.router',
    'ui.date',
    'ordersCentralMod',
    'receiptsCentralMod',
    'workCentralMod',
    'boxesCentralMod',
    'productsCentralMod',
    'reportsCentralMod',
    'tblMod',
    '$$msgbox',
    '_client',
    '$$OPS',
    'tasks',
])
.config([
    '$urlRouterProvider',
    '$stateProvider',
    function($urlRouterProvider, $stateProvider){
        $urlRouterProvider.otherwise('ordersCentral');

        $stateProvider
            .state('ordersCentral',{
                url:'/ordersCentral',
                templateUrl:'templates/main.html',
                controller:'ordersCentralCtrl'
            }).state('receiptsCentral',{
                url:'/receiptsCentral',
                templateUrl:'templates/main.html',
                controller:'receiptsCentralCtrl'
            }).state('workCentral',{
                url:'/workCentral',
                templateUrl:'templates/main.html',
                controller:'workCentralCtrl'
            }).state('boxesCentral',{
                url:'/boxesCentral',
                templateUrl:'templates/main.html',
                controller:'boxesCentralCtrl'
            }).state('productsCentral',{
                url:'/productsCentral',
                templateUrl:'templates/main.html',
                controller:'productsCentralCtrl'
            }).state('reportsCentral',{
                url:'/reportsCentral',
                templateUrl:'templates/main.html',
                controller:'reportsCentralCtrl'
            }).state('reportsCentral.reportName',{
                url:'/:reportName',
            }).state('reportsCentral.reportName.orderWeek',{
                url:'/:orderWeek',
            })            
    }
])


.controller('navBarCtrl', ['$scope','sysMsg', 'navBar', function($scope, sysMsg, navBar){

    $scope.navBar = navBar;

    $scope.sysMsg = sysMsg;
    
    $scope.clearNote = function (msg){

        var i = sysMsg.notifications.indexOf(msg)
        sysMsg.notifications.splice(i, 1)

        if(sysMsg.notifications.length === 0){sysMsg.showNotifications = false ;sysMsg.toggleCallout()}
        console.log(msg)
    }    

}])

.service('sysMsg',['tasks', '_client', function(tasks, _client){
    
    var sysMsg = new tasks.multiTaskHandler(function(){
       
        function getSysMsg(callBack){
            var request = _client.generateRequestObj('sysMsg @sysMsg');

            request.path = '/sysnotifications/' + 'asinDataCheck';
            request.method = 'GET';

            _client.requestHandler(request, function(data){

                if(data){                    
                    callBack(null, data)                                    
                }else{
                    callBack({errMsg:'error'})
                }    
            })                
        }
     
        return{
            getSysMsg:getSysMsg
        }
    })

    sysMsg.toggleCallout = function(){        
        if(sysMsg.showNotifications){
            $('#callouts').slideDown()
        }else{
            $('#callouts').slideUp()
        }
    }

    sysMsg.notifications = [];

    //perform initial notification update
    /*sysMsg.getSysMsg(function(err, results){
        if(err){
            console.log(err)
        }else{
            console.log(results)
            sysMsg.notifications = results;
            sysMsg.showNotifications = true;
            sysMsg.toggleCallout();
        }
    })*/

    /*sub = sysMsg.createSubscription(300)

    sub.run(function(err, results){
        
        if(err){
            console.log(err);
            sub.endSubscription()
        }else{                  
            console.log(results)
        }
    })*/


    return sysMsg


}])

.service('navBar', [function(){
    this.currentView = ""
}])