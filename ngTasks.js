
function randomStr(count){
    var text = ""; possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    count = count || Math.floor(Math.random() * 10) || 5;

    for (var i = 0; i < count; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

var tasks = (function(window){        
    //multi Task handler Class
    //Async/sync task manager 
    function multiTaskHandler(mthModContructor, tasksList){
        var mth, syncTasks, asyncTasks, mthModule = {}, additionalTasks = [],  _return; 
        mth = this;

        //use mthModConstructon to create mthModule 
        if(typeof mthModContructor === 'function'){        
            mthModContructor.apply(mthModule, []);
            _return = mthModule._return; 
        }
             
        tasksList = tasksList || {};
        syncTasks = tasksList.syncTasks || Object.getOwnPropertyNames(mthModule);
        asyncTasks = tasksList.asyncTasks || [];    
       
        //remove _return from tasksList
        var r = syncTasks.indexOf('_return')
        if(r > -1){syncTasks.splice(r, 1)}      
            
        function taskRunner(mainCallback, mthModule, syncTasks, asyncTasks){  
        //console.log('_startTasks callBack: ' + mainCallback.toString())  

            var taskRunner, i;
            mainCallback = mainCallback || function(){}
            taskRunner = this;                

            if (syncTasks.indexOf('_endTasks') === -1) {syncTasks.push('_endTasks')}
            if (asyncTasks.indexOf('_startTasks') === -1) {asyncTasks.unshift('_startTasks')}

            mthModule._endTasks = function(err, results){
                if(typeof mainCallback === 'function'){
                    if(err || results){
                        mainCallback(err, results)
                    }else
                    if(typeof _return === 'function'){
                        mainCallback(err, _return())
                    }else{
                        mainCallback();
                    } 
                }
                    
                i = 0;
                return
            }

            mthModule._startTasks = function(callBack){          
                callBack()
            }            

            i = 0;
            //execute each task (function) in the syncTasks array/object
            taskRunner.execSync = function(){    
                var fn = mthModule[syncTasks[i]];                                            
                                       
                function cb(err){         
                    if(err){                
                        if(typeof mainCallback === 'function'){mainCallback(err)}
                        return false
                    }

                    i++
                                        
                    taskRunner.execSync();              
                }   

                return fn(cb, mthModule._endTasks);                
            }
            
            //create a new instance
            taskRunner.execAsync = function(){
                var cb_counter = 0, return_val;                                
                
                for (var i = 0; i < asyncTasks.length; i++) {                
                    tasks_fn(asyncTasks[i]);                                                                                   
                }

                function tasks_fn(taskName){            
                    var fn = mthModule[taskName]                

                    function cb(err){
                        if(err){                
                            if(typeof mainCallback === 'function'){mainCallback(err)}
                            return false
                        }
                        //add the results to the correct property of the results obj                    
                        cb_counter++; 

                        //after running async tasks run sync tasks
                        if(cb_counter >= asyncTasks.length){                     
                            taskRunner.execSync();                            
                        }
                    }

                    return_val = fn(cb, mthModule._endTasks); 
                }    

                return return_val
            }

            return taskRunner            
        }

        function isValidTaskList(tasksNames){

            if(!(tasksNames instanceof Array)){
                throw 'tasksJS ERROR: setTasks & setTasksAsync functions must pass an array of strings'
            }

            for (var i = 0; i < tasksNames.length; i++) {
                if(!(mthModule[tasksNames[i]])){
                    return false
                }            
            }
            return true
        }
        
        mth.setTasks = function(syncList){        
            syncList = (syncList) ? Array.from(syncList) :Object.getOwnPropertyNames(mthModule);

            if(isValidTaskList(syncList)){
                //creates an new instance of tasks if contstructor was passed on init
                if(typeof mthModContructor === 'function'){
                    return new multiTaskHandler(mthModContructor, {syncTasks:syncList}) ;     
                }else{
                    syncTasks = syncList;
                }
            }else{
                throw 'tasksJS ERROR: multiTaskHandler Class ---> Invalid taskList!!!';
            }   
        }
        
        mth.setTasksAsync = function(asyncList, syncList){
            syncList = (syncList) ? Array.from(syncList) : [];
            asyncList = (asyncList) ? Array.from(asyncList) :Object.getOwnPropertyNames(mthModule);
            
            if(isValidTaskList(asyncList) && isValidTaskList(syncList)){
                //creates an new instance of tasks if contstructor was passed on init
                if(typeof mthModContructor === 'function'){
                    return new multiTaskHandler(mthModContructor, {syncTasks:syncList, asyncTasks:asyncList}) ;    
                }else{
                    syncTasks = syncList;
                    asyncTasks = asyncList;
                }
            }else{
                throw 'tasksJS ERROR: multiTaskHandler Class ---> Invalid taskList!!!';
            }        
        }

        mth.runTasks = function(){
            var args = [], callBack, i = 1, _mthModule = {};
            //seperate the callBack from the remaining arguments
            if(typeof arguments[0] === 'function'){
                callBack = arguments[0];                        
            }

            for (i; i < arguments.length; i++) {
                args.push(arguments[i])
            }        
            
            if (args.length > 0 && typeof mthModContructor === 'function'){
                //create new instance of the mthModule with new args
                mthModContructor.apply(_mthModule, args);
            }else{
                _mthModule = mthModule;
            }
            
            //add additional tasks to mthModule
            for (var i = 0; i < additionalTasks.length; i++) {
                _mthModule[additionalTasks[i].name] = additionalTasks[i].fn 
            }                    

           //create new instance of the taskRunner to run methods on the mthModule
           return new taskRunner(callBack, _mthModule, syncTasks, asyncTasks).execAsync();          
        }
        
        mth.addTask = function(name, fn){
            name = name || randomStr();
            additionalTasks.push({name:name, fn:fn})

            if(syncTasks.indexOf('_endTasks') === syncTasks.length - 1){
                syncTasks.pop();
                syncTasks.push(name);
                syncTasks.push('_endTasks');
            }else{
                syncTasks.push(name);    
            }
            
            return mth
        }

        mth.addTaskAsync = function(name, fn){
            name = name || randomStr();
            additionalTasks.push({name:name, fn:fn})
            asyncTasks.push(name);
            return mth   
        }
        //tasks an array of random fns to add to syncTasks list
        mth.addMultiTask = function(tasksArr){
            for (var i = 0; i < tasksArr.length; i++) {
                mth.addTask(null, tasksArr[i]);
            }
            return mth
        }
        //tasks an array of random fns to add to asyncTasks list
        mth.addMultiTaskAsync = function(tasksArr){
            for (var i = 0; i < tasksArr.length; i++) {
                mth.addTaskAsync(null, tasksArr[i]);
            }        
            return mth
        }

        //if mth is initialzed without a construnction don't add setArgs fn
        if(typeof mthModContructor === 'function'){
            mth.setArgs = function(){
                var args = [];
                for (var i = 0; i < arguments.length; i++) {
                    args.push(arguments[i]);
                }
                //overwrite mthModule with new one with args
                mthModContructor.apply(mthModule, args);
                return mth
            }    
        }
        

        //a subscription will exect the syncTasks every x seconds
        mth.createSubscription = function(seconds){
            
            var subscription = function(){
                var runningSub;
                
                var interval = (seconds) ? seconds * 1000: 1000;
                
                this.start = function(){ 
                    var args = [], callBack, i = 1, _mthModule = {};
                    //seperate the callBack from the remaining arguments
                    if(typeof arguments[0] === 'function'){
                        callBack = arguments[0];                        
                    }

                    for (i; i < arguments.length; i++) {
                        args.push(arguments[i]);
                    }        
                    
                    if (args.length > 0 && typeof mthModContructor === 'function'){
                        //create new mthModule with new args
                        mthModContructor.apply(_mthModule, args);
                    }else{
                        _mthModule = mthModule;
                    }
                                
                   //use setInterval to run taskRunner on repeat                   
                    runningSub = setInterval(new taskRunner(callBack, _mthModule, syncTasks, asyncTasks).execAsync, interval); 
                }

                this.end = function(){                
                    clearInterval(runningSub);
                }
            }           

            return new subscription()
        }   
        
        return mth
    }


    function tasks(){        
        var tasks = window.tasks || (window.tasks = {}), app = {}, modules = [], ngMod = angular.module('ngMod', []), backendServices = {}, configurations = {}, initAsync = [], initSync = [];
        
        tasks.multiTaskHandler = multiTaskHandler;
        tasks.connectToService = connectToService;
        tasks.addModule = addModule;        
        tasks.obj = obj;
        tasks.ngService = angular.injector(['ng', 'ngFileUpload']).get                
        tasks.config = config;
        tasks.ProjxViewer = ProjxViewer;

        function mod(modName){
            var thisMod = {};

            thisMod.subMod = subMod;
            thisMod.mthMod = mthMod;
            thisMod.ctrlMod = ctrlMod;
            thisMod.useModule = useModule;
            thisMod.loadModule = loadModule;        
            thisMod.useService = useService;
            thisMod.handle = handle;
            thisMod.emit = emit;
            thisMod.on = on;

            thisMod._instance = {};
            thisMod._instance.usedBy = 'app';
            thisMod._class = 'module';
            thisMod._name = modName;
            
            function subModExistsCheck(name){
                if(thisMod[name]){throw 'tasksJS ERROR: Naming Conflict: Sub module already existings using ' + name + '  in moduleName: ('+ thisMod._name +') !!!'}
            }

            function mthMod(mthName, mthContructer){ 
                subModExistsCheck(mthName);

                var _mth = new multiTaskHandler(mthContructer);
                _mth._class ='multiTaskHandler';
                _mth._name = mthName;

                thisMod[mthName] = _mth;
                return thisMod[mthName]
            }

            function ctrlMod(ctrlName, modConstructor){
                subModExistsCheck(ctrlName);
                var scope = angular.element($("div[scope="+ctrlName+"]")).scope();
                var cMod = {};

                scope.$apply(function(){                    
                    modConstructor.apply(cMod, [scope]);
                    thisMod[ctrlName] = cMod;
                })            
            }

            function subMod(subModName, _modConstructor, args){
                subModExistsCheck(subModName);
                args = args || [];
                var subMod = {};
                subMod.cloneMod = cloneMod;

                function cloneMod(){
                    var _subMod = {}, args = [];

                    for (i = 0; i < arguments.length; i++) {
                        args.push(arguments[i])
                    }
                    
                    _modConstructor.apply(_subMod, args);
                    return _subMod
                }

                _modConstructor.apply(subMod, args);            
                thisMod[subModName] = subMod;
                return subMod;

            }            

            function load(modToUse, args, load){
                //basically record the modToUse as a dependency of thisMod
                if(app[modName].dependencies.indexOf(modToUse) === -1){
                    app[modName].dependencies.push(modToUse);
                }
                //record the thisMode as a dependent of modToUse
                if(app[modToUse].dependents.indexOf(modName) === -1){
                    app[modToUse].dependents.push(modName);
                }

                var _mod = new mod(modToUse), _modVal;                      
                _mod._instance.usedBy = modName;
                //if args (array) is passed return new instance using apply
                if(args){
                    _modVal = app[modToUse].modConstructor.apply(_mod, args);   
                    //collect info on each instance of a mod loaded into another mod     
                }else{
                    _mod = app[modToUse].mod;
                    _modVal = app[modToUse].modVal;    
                }
     

                return (load) ? _modVal:_mod;
            }

            function useService(serviceName){
                if(!(backendServices[serviceName])){throw 'tasksJS ERROR: unable to use service ' + serviceName + '. Service not found!!!'}

                //record dependencies;
                if(app[modName].service_dependencies.indexOf(serviceName) === -1){
                    app[modName].service_dependencies.push(serviceName);
                }
                if(backendServices[serviceName].dependents.indexOf(modName) === -1){
                    backendServices[serviceName].dependents.push(modName);
                }

                return backendServices[serviceName].service;                    
            }

            function useModule(modToUse, args){  
                if(!(app[modToUse])){throw 'tasksJS ERROR: unable to use module ' + modToUse + '. Module not found!!!'}

                if(app[modToUse].mod){
                    return load(modToUse, args, false);
                }else{
                    modInit(modToUse, app[modToUse].modConstructor)
                }                
            }

            function loadModule(modToLoad, args){
                if(!(app[modToUse])){throw 'tasksJS ERROR: unable to load module ' + modToUse + '. Module not found!!!'}
                return load(modToLoad, args, true);
            }

            function dispatcher(handler, subs, emitter, emitData){
                //if the event has a handler allow hander to decide whether to broadcast
                
                if(handler){
                    handler.apply({
                        broadcast:function(data){                        
                            subs.forEach(function(sub){
                                sub(data)
                            })
                        }
                    }, [emitter, emitData])
                }else{
                    //broadcast event directly
                    subs.forEach(function(sub){sub()})
                }
            }

            function emit(eventName, emitter, emitData){
                //emit passes off work to a new instance of the dispathcer
                //so that the parameteres passed can remain static
                //if the same event is emitted twice around the same time            
                emitter = emitter || '';            

                if(events[eventName]){
                    new dispatcher(events[eventName].handler, events[eventName].subscribers, emitter, emitData)                                
                    //call any subscriber to the specific emitter
                    if(events[eventName][emitter]){
                        var targetedEmitter = events[eventName][emitter];                    
                        new dispatcher(events[eventName].handler, targetedEmitter.subscribers, emitter, emitData)                   
                    } 
                }

                               
            }
            
            function handle(eventName, handler){
                events[eventName] = events[eventName] || {};
                events[eventName].handler = handler;
            }

            function on(eventName, handler){            
                //user can use dot notation to subscribe to specific emitters of events
                var eNames = eventName.split('.');
                
                events[eNames[0]] = events[eNames[0]] || {};
                //if dot notation is used add subscribers to the eventName.emitter.subscribers object hierachy
                if(eNames.length > 1){
                    events[eNames[0]][eNames[1]] = events[eNames[0]][eNames[1]] || {};
                    events[eNames[0]][eNames[1]].subscribers = events[eNames[0]][eNames[1]].subscribers || [];
                    events[eNames[0]][eNames[1]].subscribers.push(handler)
                }else{                                
                    events[eventName].subscribers = events[eventName].subscribers || [];
                    events[eventName].subscribers.push(handler)
                }                
            }

            return thisMod;
        }

        function modInit(modName, modConstructor){
            var thisMod;            
                                                                                
            thisMod = new mod(modName);              
            app[modName].modVal = modConstructor.apply(thisMod, []);
            
            //set the value of these methods to null after module is constructed so
            //that these methods can only be used during module contruction stage
            thisMod.useModule = null;
            thisMod.loadModule = null;        
            thisMod.mthMod = null;
            thisMod.handler = null;
            thisMod.useService = null;
            app[modName].mod = thisMod;            
        }

        var initializer_set = false;
        //modules need to be initialized only after backendServices have been loaded
        //so we're collect modules, services, and config init functions to be run in
        //a paricular sequence. this is handled by multiTaskHandler in inti function below
        function addModule(modName, modConstructor){    
            app[modName] = {            
                modConstructor:modConstructor,
                dependencies:[],
                dependents:[],
                service_dependencies:[],
                name:modName,  
            }
      
            modules.push(app[modName])

            //setTimeout will inti app after all modules are added to the modules array above            
            if(!initializer_set){
                //because js is "single threaded", this will only run at next avialable moment when all fns have executed
                initializer_set = true; 
                setTimeout(init, 1)
            }
            return tasks
        }   

        function connectToService(name, url, cb){      
            if(backendServices[name]){
                //if the service already exists
                throw "tasksJS ERROR: SERVICE NAMING CONFLICT!!! Two Services cannot be assigned the same name: " + name;                                
            }

             backendServices[name] = {                                                                            
                dependents:[],
                name:name                            
            }  

            initAsync.push(new getService(url, name, cb).run)
            return tasks
        }

        function initMods() {
            
            for (var i = 0; i < modules.length; i++) {
                if(!(modules[i].mod)){
                    modInit(modules[i].name, modules[i].modConstructor)
                }
            }
            //by clearing these arrays more modules can be added after the original initialization
            initSync = [];
            initAsync = [];
            initializer_set = false;            
        }  

        function getService(url, name, cb){
                 
            return {//run will be called by a mth
                run:function(nextTask){
                    var req = _client.request('GET', url);

                    _client.requestHandler(req, function(err, data){
                        if (err) {
                            console.log(err);
                            //user can check fo the existance of connectionErr property inside modules to check if the service has loaded correctly
                            //so that the app can optionally be made to work even when some services fail
                            backendServices[name].service = {connectionErr:true, data:err};
                            if(typeof cb === 'function'){cb(err)};
                        }else{                    
                            //console.log(data);                                

                            backendServices[name].service = new createServiceAPI(data, name);
                            
                            if(typeof cb === 'function'){cb(null)}
                        }
                        nextTask();
                    })
                }
            }
        }            

        function serviceRequestHandler(map, host, serviceName){
            //handles request to backend server mod

            //use maps (an array) to regenerate backend  api
            var serverMod = {}, path = 'http://' + host + '/' + map.route.join('/'), method_names = map.methods;

            for (var i = 0; i < method_names.length; i++) {                
                serverMod[method_names[i]] = reqHandler(method_names[i] , map.config[method_names[i]].request_method).run
            }

            var  attempts = 0;
            function mapErrHandler(new_api, req, callBack, handler){                    
                attempts++
                if(attempts >= 3){                
                    throw "tasksJS ERROR: Invalid Map!!! FAILED TO CONNECT TO APP AFTER "+attempts+" ATTEMPTS!!!"
                }else{
                    var _obj = tasks.obj(backendServices[serviceName].service), newMaps = new_api.maps;

                    //use updated newMaps to update the path for each serverMod of this service
                    for (var i = 0; i < newMaps.length; i++) {
                        
                        var new_path = newMaps[i].route.join('/');
                        var start_at = (newMaps[i].api[0] === 'app')?1:0;

                        _obj.navigate(newMaps[i].api, start_at)._updatePath(new_path, new_api.host, nsp);
                    }
                    //use this handle on reqHandler to resend request
                    handler.run(req.data, function(err, data){
                        callBack(err, data);
                        attempts = 0;
                    })                        
                }              
            }

            function reqHandler(method_name, reqType){

                var handler =  {
                    run:function(data, callBack){
                        var req = _client.request(reqType, path+'/'+method_name, data);

                        _client.requestHandler(req, function(err, data){
                            if (err) {
                                console.log(err);
                                if (err.invalidMap) {
                                    mapErrHandler(err, req, callBack, handler)                          
                                }else{
                                    if(typeof callBack === 'function'){callBack(err)}     
                                }                                                            
                            }else{                                
                                if(typeof callBack === 'function'){callBack(null, data)}                            
                            }
                        })
                    }
                }
                return handler
            }            

           serverMod._updatePath = function(new_path, new_host){
                path = 'http://' + new_host + '/' + new_path
           } 

           /*-------------WebScoket Event Handling-----------------------*/                
           function dispatch(e){
                if(eventHandlers[e.name]){
                    eventHandlers[e.name].subscribers.forEach(function(sub){
                        sub(e.data)
                    })
                }
           }

           serverMod.on = function(eventName, handler){
                eventHandlers[eventName] = eventHandlers[eventName] || {};
                eventHandlers[eventName].subscribers = eventHandlers[eventName].subscribers || [];
                eventHandlers[eventName].subscribers.push(handler)
           }
           
           var socket = io.connect(map.nsp), eventHandlers = {};
           console.log(map.nsp)
           socket.on('dispatch', function (data) {
                console.log(data);  
                dispatch(data)
            });
           
           return serverMod
        }  

        function createServiceAPI(apiMap, serviceName){
            var service = {}, maps = apiMap.maps;

            for (var i = 0; i < maps.length; i++) {
                var api = maps[i].api;

                if(api[0] === 'app'){
                    var obj = service
                }else{
                    var obj = service[api[0]] || (service[api[0]] = {});
                }
                for (var n = 1; n < api.length - 1; n++) {
                    obj[api[n]] = obj[api[n]] || {};
                    obj[api[n]][api[n + 1]] = {};
                    obj = obj[api[n]];
                }
                //here the serviceRequestHandler is the backend server mod being assigned to the object replicating the backend module
                obj[api[n]] = new serviceRequestHandler(maps[i], apiMap.host, serviceName) 
                
            }

            return service
        }

        function taskConfig(fn){

            return {//will be called by mth
                run:function(config_cb){
                    //if config is used config_cb needs to be called for app to start
                    fn(configurations, config_cb);
                    if(configurations.devMode){console.log('tasksJS: - init');}
                    if(configurations.devMode){console.log('tasksJS: tasks.config(configurations, initCallBack); --> initCallBack must be called in order to continue initializing <--');}
                }
            }
        }

        function config(fn){
            initSync.push(new taskConfig(fn).run)
            return tasks
        }

        function init(){
            //last fn to call is intiMods 
            initSync.push(initMods);

            multiTaskHandler()
            .addMultiTask(initSync)
            .addMultiTaskAsync(initAsync)            
            .runTasks()
        }

         function ProjxViewer(proj_id){
          
        }

        return tasks
    }


    var objHandler = function(obj){
        var handler = {}
        handler.cloneKeys = cloneKeys;
        handler.uniqueKeys = uniqueKeys;
        handler.sumOfKeys = sumOfKeys
        handler.findByKey = findByKey;
        handler.navigate = navigate;

        if(!Array.isArray(obj)){
            //obj.forEach & obj.forEachSync loops through each property on an object        
            handler.forEach = function(cb, descend){
                var pNames = Object.getOwnPropertyNames(obj), index = -1; 
                pNames.forEach(function(pName){
                    cb(obj[pName], pName)
                })
            }  
            handler.forEachSync = function(cb, descend){
                var pNames = Object.getOwnPropertyNames(obj), index = -1;             
                
                function next(){            
                    index =index++;
                    cb(obj[pNames[index]], pNames, next);
                }
                next()
            }      
        }else{
            //obj.forEachSync loops through each index of an array
            handler.forEach = function(cb){
                throw "obj ERROR: obj(OBJ).forEach is not an avialable method when handling an Array!!!"
            }
            handler.forEachSync = function(cb, descend){
                var index = (descend)? obj.length+1:-1;             
                
                function next(){            
                    index = (descend)? index-- : index++;
                    cb(obj[index], index, next);
                }
                next()
            }
        }

        function uniqueKeys(key){
            var uniqueList = [], arr = obj;
            
            for (var i = 0; i < arr.length; i++) {
                if( uniqueList.indexOf(arr[i][key]) === -1 ){
                    uniqueList.push(arr[i][key]);
                }
            }
            return uniqueList
        };
        
        function sumOfKeys(key){
            var sum = 0, arr = obj; 

            for (var i = 0; i < arr.length; i++) {
                var num = arr[i][key]*1
                ; num = (isNaN(num))? 0:num; sum = sum + num 
            } 
            return sum
        }    
        function findByKey(key, searchArr, multi){
            var searchArr = (Array.isArray(searchArr)) ? searchArr : [searchArr]
            var results = [];

            for (var i = 0; i < obj.length; i++) {
                if(searchArr.indexOf(obj[i][key]) > -1 ) {
                    results.push(obj[i]);
                    if(!multi){break}
                }
            }

            return results
        }

        function navigate(pNames, start){
            var _obj = obj;

            for (var i = start || 0; i < pNames.length; i++) {
               _obj = _obj[pNames[i]]
            }
            return _obj
        }

        return handler
    }

    function obj(_obj){
        return new objHandler(_obj)
    }    

    function client(){

        var http = _tasks.ngService('$http'), upload = _tasks.ngService('Upload');

        var client = {};        
        client.request = request;
        client.requestHandler =requestHandler;
               
        //request can only be made through the request obj and request handler
        function request(method, url, data){
            return {
                _id:uniqueNumber(),                
                cId:'clientId',                
                url:url,
                method:method,
                data:data
            };             
        }
        //request can only be made through the request obj and request handler
        function requestHandler (request, callBack){            
            http({
                method:request.method,
                url:request.url,
                data:request
            }).then(function successCallback(res){
                if (typeof callBack === 'function') {callBack(null, res.data)}                    
            }, function errorCallback(res){
                if(res.data){
                    if(res.data.errMsg){
                        console.log('dub requests')
                        showErrMsg(res.data.errMsg)
                    }                       
                }     
                
                if (typeof callBack === 'function') {callBack(res.data)}
                console.log(res);
            })
        }
        //borrowed code to create unique id from Date
        function uniqueNumber() {
            var date = moment()._d;
            
            // If created at same millisecond as previous
            if (date <= uniqueNumber.previous) {
                date = ++uniqueNumber.previous;
            } else {
                uniqueNumber.previous = date;
            }
            
            return date;
        }

        client.uniqueNumber = uniqueNumber;

        uniqueNumber.previous = 0;

        function showErrMsg(errMsg){
            if(errMsg){
                // $$msgbox.message = errMsg
                // $$msgbox.button2.show = false;
                // $$msgbox.show = true;                    
            }        
        }

        function fileUploadHandler(request, callBack){
            console.log(request)
            upload.upload({
                url:request.url,
                data:request
            }).then(function successCallback(res){
                if (typeof callBack === 'function') {callBack(null, res.data)}
                    console.log(res)
            }, function errorCallback(res){
                if(res.data){
                    if(res.data.errMsg){
                        console.log('dub requests')
                        showErrMsg(res.data.errMsg)
                    }

                } 


                if (typeof callBack === 'function') {callBack(res.data)}
                console.log(res);
            })
        }

        return client

    }
    
    var _tasks = tasks(), _client = client()    

    //replace this with on load fn
    /*_tasks.init(function(err){        
        if(err){
            console.log(err);
        }
    });*/
    return _tasks
})(window)




