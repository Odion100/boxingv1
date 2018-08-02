angular.module('app', [
    'ui.router',
    'boxingMod',
    'userConfigMod',
    'infinite-scroll',
    '_client',
    '$$OPS',
    'tasks',
    '$$msgbox',
])
.config([
    '$urlRouterProvider',
    '$stateProvider',
    function($urlRouterProvider, $stateProvider){
        $urlRouterProvider.otherwise('/order-picking/')

        $stateProvider.state('orderSearch',{
            url:'/order-picking/:client_id',
            templateUrl:'boxing/templates/boxing.html',
            controller:'boxingCtrl'
        }).state('users',{
            url:'/users-config',
            templateUrl:'boxing/templates/user-config.html',
            controller:'userViewCtrl'
        })
    }
])

.service('stateHandler', ['_client', '$$db', 'tasks', '$state', '$stateParams', '_client', '$$db', function(_client, $$db, tasks, $state, stateParams, _client, db){

    var sh = this, _states = [];
    
    sh.addState = _stateManager;    
    sh.init = init;    
    sh.user = {};
    sh.loginFrm = {
        show:true,
        username:'',
        login:login,
        loginKeydown:loginKeydown,
        logout:logout
    }        

    function updateState(){
        $state.go('orderSearch', {client_id:sh.user._id}, {notify:true})        
    }
    function logout(){
       // sh.loginFrm.username= '';
       // sh.user = {};
        window.location.replace('http://dev7:4000/boxing-app#/')
        window.location.reload();
    }
    function loadUser(username, _id, callBack){
        var request = _client.generateRequestObj('loadUser in stateHandler in app.config');

        request.mongoQuery.find = (username) ? {username:username}:{_id:_id};
                    
        request.parse_id = true;

        db.collection('users').find(request, function(data){
            console.log(data)
            if(data.length > 0){
                sh.user = data[0];                                
                sh.loginFrm.username = sh.user.username;                                                 
                sh.loginFrm.show = false;
                
                applyAllState();
                                 
                if(username){updateState()} 
                if(typeof callBack === 'function'){callBack()}                                    
            }else{
                sh.loginFrm.username = '';  
                sh.loginFrm.show = true; 
            }
        })
    }    
        
    function applyAllState(){
        for (var i = 0; i < _states.length; i++) {
            _states[i].applyState(_states[i].load_cb);
        }
    }

    function _stateManager(self, stateName, pNames){
        
        var state = {};
        state.load_cb = null;

        state.save = function (callBack){
            if (sh.user._id) {
                var _stateManager = sh.user.state || {};
                _stateManager[stateName] = cloneKeys(self, pNames)

                var request = _client.generateRequestObj('saveState in stateHandler in app.config');
                
                request.mongoQuery.find = {_id:sh.user._id};
                request.mongoQuery.update = {$set:{state:_stateManager}};
                request.parse_id = true;

                db.collection('users').update(request, function(data){
                    console.log(data); 
                    if(typeof callBack === 'function'){callBack()}                 
                })
            }
        }

        state.load = function (callBack){
            state.load_cb = callBack;
            if(isValidObjectID(stateParams.client_id)){                
                loadUser(null, stateParams.client_id, function(){
                    applyState(callBack);  
                })
            }else{
                callBack();
            }
        }

        function applyState(callBack){
            if(sh.user.state[stateName]){
                for (var i = 0; i < pNames.length; i++) {
                    self[pNames[i]]  = sh.user.state[stateName][pNames[i]];
                }
                if(typeof callBack === 'function'){callBack()}  
            }else{
                callBack();
            }           
        }
        state.applyState = applyState;

        _states.push(state)
        return state
    }

    function isValidObjectID(str) {
      // A valid Object Id must be 24 hex characters
      return (/^[0-9a-fA-F]{24}$/).test(str);
    }

    var initCallback;

    function loginKeydown(username, keyEvent){
        if(keyEvent.which === 13){
            loadUser(username, null, initCallback);
        }
    }
    
    function login(username){
        loadUser(username, null, initCallback);
    }
    function init(callBack){
        initCallback = callBack;
        if(!isValidObjectID(stateParams.client_id)){
            sh.loginFrm.show = true;
        }else if(sh.user._id != stateParams.client_id){
            loadUser(null, stateParams.client_id, callBack);
        }else{
            sh.loginFrm.show = false;
        }
    }    
}])


