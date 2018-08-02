
//var cl = request.createClient('http://localhost:8888/');

function randomStr(count){
    var text = ""; possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    count = count || Math.floor(Math.random() * 10) || 5;

    for (var i = 0; i < count; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

//multi Task handler Class
//Async/sync task manager 
function multiTaskHandler(mthModContructor, tasksList){
    var mth, syncTasks, asyncTasks, mthMod = {}, additionalTasks = [],  _return; 
    mth = this;

    //use mthModConstructon to create mthMod 
    if(typeof mthModContructor === 'function'){        
        mthModContructor.apply(mthMod, []);
        _return = mthMod._return; 
    }
         
    tasksList = tasksList || {};
    syncTasks = tasksList.syncTasks || Object.getOwnPropertyNames(mthMod);
    asyncTasks = tasksList.asyncTasks || [];    
   
    //remove _return from tasksList
    var r = syncTasks.indexOf('_return')
    if(r > -1){syncTasks.splice(r, 1)}      
        
    function taskRunner(mainCallback, mthMod, syncTasks, asyncTasks){  
    //console.log('_startTasks callBack: ' + mainCallback.toString())  

        var taskRunner, i;
        mainCallback = mainCallback || function(){}
        taskRunner = this;                

        if (syncTasks.indexOf('_endTasks') === -1) {syncTasks.push('_endTasks')}
        if (asyncTasks.indexOf('_startTasks') === -1) {asyncTasks.unshift('_startTasks')}

        mthMod._endTasks = function(err, results){
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

        mthMod._startTasks = function(callBack){          
            callBack()
        }            

        i = 0;
        //execute each task (function) in the syncTasks array/object
        taskRunner.execSync = function(){    
            var fn = mthMod[syncTasks[i]];                                            
                                   
            function cb(err){         
                if(err){                
                    if(typeof mainCallback === 'function'){mainCallback(err)}
                    return false
                }

                i++
                                    
                taskRunner.execSync();              
            }   

            return fn(cb, mthMod._endTasks);                
        }
        
        //create a new instance
        taskRunner.execAsync = function(){
            var cb_counter = 0, return_val;                                
            
            for (var i = 0; i < asyncTasks.length; i++) {                
                tasks_fn(asyncTasks[i]);                                                                                   
            }

            function tasks_fn(taskName){            
                var fn = mthMod[taskName]                

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

                return_val = fn(cb, mthMod._endTasks); 
            }    

            return return_val
        }

        return taskRunner            
    }

    function isValidTaskList(tasksNames){

        if(!(tasksNames instanceof Array)){
            throw 'TasksJS ERROR: setTasks & setTasksAsync functions must pass an array of strings'
        }

        for (var i = 0; i < tasksNames.length; i++) {
            if(!(mthMod[tasksNames[i]])){
                return false
            }            
        }
        return true
    }
    
    mth.setTasks = function(syncList){        
        syncList = (syncList) ? Array.from(syncList) :Object.getOwnPropertyNames(mthMod);

        if(isValidTaskList(syncList)){
            //creates an new instance of tasks if contstructor was passed on init
            if(typeof mthModContructor === 'function'){
                return new multiTaskHandler(mthModContructor, {syncTasks:syncList}) ;     
            }else{
                syncTasks = syncList;
            }
        }else{
            throw 'TasksJS ERROR: multiTaskHandler Class ---> Invalid taskList!!!';
        }   
    }
    
    mth.setTasksAsync = function(asyncList, syncList){
        syncList = (syncList) ? Array.from(syncList) : [];
        asyncList = (asyncList) ? Array.from(asyncList) :Object.getOwnPropertyNames(mthMod);
        
        if(isValidTaskList(asyncList) && isValidTaskList(syncList)){
            //creates an new instance of tasks if contstructor was passed on init
            if(typeof mthModContructor === 'function'){
                return new multiTaskHandler(mthModContructor, {syncTasks:syncList, asyncTasks:asyncList}) ;    
            }else{
                syncTasks = syncList;
                asyncTasks = asyncList;
            }
        }else{
            throw 'TasksJS ERROR: multiTaskHandler Class ---> Invalid taskList!!!';
        }        
    }

    mth.runTasks = function(){
        var args = [], callBack, i = 1, _mthMod = {};
        //seperate the callBack from the remaining arguments
        if(typeof arguments[0] === 'function'){
            callBack = arguments[0];                        
        }

        for (i; i < arguments.length; i++) {
            args.push(arguments[i])
        }        
        
        if (args.length > 0 && typeof mthModContructor === 'function'){
            //create new instance of the mthMod with new args
            mthModContructor.apply(_mthMod, args);
        }else{
            _mthMod = mthMod;
        }
        
        //add additional tasks to mthMod
        for (var i = 0; i < additionalTasks.length; i++) {
            _mthMod[additionalTasks[i].name] = additionalTasks[i].fn 
        }                    

       //create new instance of the taskRunner to run methods on the mthMod
       return new taskRunner(callBack, _mthMod, syncTasks, asyncTasks).execAsync();          
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
            //overwrite mthMod with new one with args
            mthModContructor.apply(mthMod, args);
            return mth
        }    
    }
    

    //a subscription will exect the syncTasks every x seconds
    mth.createSubscription = function(seconds){
        
        var subscription = function(){
            var runningSub;
            
            var interval = (seconds) ? seconds * 1000: 1000;
            
            this.start = function(){ 
                var args = [], callBack, i = 1, _mthMod = {};
                //seperate the callBack from the remaining arguments
                if(typeof arguments[0] === 'function'){
                    callBack = arguments[0];                        
                }

                for (i; i < arguments.length; i++) {
                    args.push(arguments[i]);
                }        
                
                if (args.length > 0 && typeof mthModContructor === 'function'){
                    //create new mthMod with new args
                    mthModContructor.apply(_mthMod, args);
                }else{
                    _mthMod = mthMod;
                }
                            
               //use setInterval to run taskRunner on repeat                   
                runningSub = setInterval(new taskRunner(callBack, _mthMod, syncTasks, asyncTasks).execAsync, interval); 
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

    var io = require(process.cwd() + "\\node_modules\\socket.io\\node_modules\\socket.io-client");
    var tasks = {}, app = {}, _server, _host, _client = client(), modules = [], backendServices = {}, configurations = {}, initAsync = [], initSync = [];

    tasks.multiTaskHandler = multiTaskHandler;
    tasks.connectToService = connectToService;
    tasks.addModule = addModule;    
    tasks.initServer = initServer;    
    tasks.getModules = getModules;
    tasks._passMods = _passMods;
    tasks.obj = obj;
    tasks.config = config;    
    tasks.ProjxViewer = ProjxViewer;
    
    function serverModInit(appName, modName, serverModName, modConstructor){
        var _serverMod = {}, config_all = {}, config_options = {}, socketEvents;

        _serverMod._class = 'serverMod';
        _serverMod._name = serverModName;            

        _serverMod.config = config;
        _serverMod.configAll = configAll;
        _serverMod.handle = handle;        

        function config(name, options){
            config_options[name] = options;
        }

        function configAll(options){
            config_all = options;
        }
        
        function handle(eventName, handler){
            socketEvents = socketEvents ||{};
            socketEvents[eventName] = socketEvents[eventName] || {};
            socketEvents[eventName].handler = handler
        }
      
        //emit collects the event call while mod is initializing
        _serverMod.emit = function(eventName, emitterData){
            socketEvents = socketEvents ||{};
            socketEvents[eventName] = socketEvents[eventName] || {};

            socketEvents.emitOnConn = socketEvents.emitOnConn || [];
            socketEvents.emitOnConn.push({name:eventName, data:emitterData})
        }

        modConstructor.apply(_serverMod, []);        
        
        //loop through all properties on serverMod
        obj(_serverMod).forEach(function(value, pName){            
            if(['config', 'configAll', 'handle', 'emit'].indexOf(pName) === -1 && typeof _serverMod[pName] === 'function'){ 
                
                config_options[pName] = config_options[pName] || {};

                //loop through all config options on config_all object
                obj(config_all).forEach(function(opt){                    
                    //apply config_all options for each serverMod method where config_options have not already been set
                    config_options[pName][opt] = config_options[pName][opt] || config_all[opt];                    
                })               
                
                //all request to serverMod are PUTs by default
                config_options[pName].request_method = config_options[pName].request_method || 'PUT';
            }
        })            
        var  _nsp = randomStr();
        if(socketEvents){
            var nsp = _server.io.of('/'+_nsp);
            //var nsp = _server.io.of('/'+modName+'/'+serverModName);
            console.log('socket=-----------------------------')
            console.log('/'+_nsp)

            nsp.on('connection', function(socket){
                console.log(modName+'/'+serverModName+' connected!');                

                function dispatcher(eventName, data){
                    var handler = socketEvents[eventName].handler;
                    if(handler){
                        handler({
                            name:eventName,
                            data:data,
                            broadcast:function(){                        
                               nsp.emit('dispatch', {name:eventName, data:data});
                            }
                        })
                    }else{
                        //broadcast event directly
                        nsp.emit('dispatch', {name:eventName, data:data});
                    }
                }             
                //after initializing serverMod.emit will dispatch the event to subscribers
                _serverMod.emit = function(eventName, data){
                    new dispatcher(eventName, data);
                }

                socketEvents
                .emitOnConn.forEach(function(e){  
                    console.log('---------------e-----------------')
                    console.log(e)                  
                    new dispatcher(e.name, e.data)
                })
                socket.on('disconnect', function(){
                    console.log('disconnect')    
                })                
            
            })
        }
        
        _server.addRoute(appName, modName, serverModName, _serverMod, config_options, _nsp);                           
        return _serverMod
    }

    function mod(modName){
        var thisMod = {}, events = {};
        thisMod.subMod = subMod;
        thisMod.mthMod = mthMod;
        thisMod.serverMod = serverMod;
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
            if(thisMod[name]){throw 'TasksJS ERROR: Naming Conflict: Sub module already existings using ' + name + '  in moduleName: ('+ thisMod._name +') !!!'}
        }     

        function mthMod(mthName, mthContructer){ 
            subModExistsCheck(mthName);

            var _mth = new multiTaskHandler(mthContructer);
            _mth._class ='multiTaskHandler';
            _mth._name = mthName;

            thisMod[mthName] = _mth;
            return thisMod[mthName]
        }

        
        function serverMod(serverModName, _modConstructor){
            //if the server mod already exists in thisMod this instance of the server mod needs a unique name
            if(app[modName][serverModName]){
                if(thisMod._class != 'serverMod'){
                    throw 'TasksJS ERROR: Naming Conflict: Sub module already existings using ' + serverModName + ' in moduleName: ('+ thisMod._name +') !!!'
                }
            }else{
                subModExistsCheck(serverModName);
                thisMod[serverModName] = new serverModInit(thisMod._instance.usedBy, modName, serverModName, _modConstructor);                                        
                return thisMod[serverModName]
            }                                                                
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
            if(!(backendServices[serviceName])){throw 'TasksJS ERROR: unable to use service ' + serviceName + '. Service not found!!!'}

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
            if(!(app[modToUse])){throw 'TasksJS ERROR: unable to use module ' + modToUse + '. Module not found!!!'}

            if(app[modToUse].mod){
                return load(modToUse, args, false);
            }else{
                modInit(modToUse, app[modToUse].modConstructor)
            }                
        }

        function loadModule(modToLoad, args){
            if(!(app[modToUse])){throw 'TasksJS ERROR: unable to load module ' + modToUse + '. Module not found!!!'}
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
            throw "TasksJS ERROR: SERVICE NAMING CONFLICT!!! Two Services cannot be assigned the same name: " + name;                                
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
                if(configurations.devMode){console.log('TasksJS: - init');}
                if(configurations.devMode){console.log('TasksJS: tasks.config(configurations, initCallBack); --> initCallBack must be called in order to continue initializing <--');}
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

    function initServer(connPath, port, host, validationFn){
        _host = host || 'localhost';
        _server  = require('./server')(connPath, port, _host, validationFn);          
        //console.log(_server)
        _server.io.on('connection', function (socket) {
          socket.emit('news', { hello: 'world' });
          socket.on('my other event', function (data) {
            console.log(data);
          });
        });      
        return _server.server
    }

    function getModules(path, mods){

        require(path).tasks._passMods(mods, app)
        return tasks
    }

    function _passMods(modList, _app){
        modList = modList || Object .getOwnPropertyNames(app)

        for (var i = 0; i <   modList.length; i++) {
            _app[modList[i]] = app[modList[i]]
        }

        return _app
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
            if(typeof cb === 'function'){
                pNames.forEach(function(pName){
                    cb(obj[pName], pName)
                })
            }
            return pNames
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
            var index = -1;             
            
            function next(){            
                index++;                
                cb(obj[index], index, next);
            }
            next()
        }
    }


    function cloneKeys(keys, toObj){
        var copy = toObj || {};

        var pNames = keys || Object.getOwnPropertyNames(obj);
        
        for (var i = 0; i < pNames.length; i++) {
            copy[pNames[i]] = obj[pNames[i]];
        } 

        return copy
    };

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
    var http = require('request');

    var client = {};        
    client.request = request;
    client.requestHandler =requestHandler;

    //request can only be made through the request obj and request handler
    function request(method, url, data){
        return {
            _id:randomStr(),            
            cId:'clientId',            
            url:url,
            method:method,
            data:data
        };             
    }

    function requestHandler(request, callBack){
        console.log(request)
        http({
            method:request.method,
            url:request.url,
            body:request,
            json:true
        }, function(err, res, body){          
            if(err){
                console.log(err)
                             
            }else if(res.statusCode >= 400){               
                console.log('REQUEST ERROR: STATUSCODE: ' + res.statusCode);   
                if(typeof callBack === 'function'){callBack(body);}     
            }else{
                if(typeof callBack === 'function'){callBack(null, body);}                
            }
        })
    }  

    function fileUploadHandler(request, callBack){

    }

    return client
}


exports.tasks = tasks;

exports.obj = obj;
exports.multiTaskHandler = multiTaskHandler;


