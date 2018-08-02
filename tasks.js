
//multi Task handler Class
//Async/sync task manager 
function multiTaskHandler(tasks_fns, tasksList){
    var mth, syncTasks, asyncTasks, tasksHolder, _return, _tasksArgs; 
    mth = this;

    //user can pass syncTasks as an object or a function that returns an object    
    if(typeof tasks_fns === 'function'){
        tasksHolder = tasks_fns();
    }else{
        tasksHolder = tasks_fns;        
    }
    _return = tasksHolder._return;      

    tasksList = tasksList || {};
    syncTasks = tasksList.syncTasks || Object.getOwnPropertyNames(tasksHolder);
    asyncTasks = tasksList.asyncTasks || [];
    
    //because the multiTaskHandler can create multiple instance of itself where the taskList may already have these keys
    if (syncTasks.indexOf('_endTasks') === -1) {syncTasks.push('_endTasks')}
    if (asyncTasks.indexOf('_startTasks') === -1) {asyncTasks.unshift('_startTasks')}
   
    //remove _return from tasksList
    var r = syncTasks.indexOf('_return')
    if(r > -1){syncTasks.splice(r, 1)}      
        
    function taskRunner(mainCallback){  
    //console.log('_startTasks callBack: ' + mainCallback.toString())  

        var  i, taskRunner, taskResults, error;
        mainCallback = mainCallback || function(){}
        taskRunner = this;                
        taskResults = {};                    

        tasksHolder._endTasks = function(err){   
            if(typeof _return === 'function'){
                mainCallback(error, _return())
            }else if(typeof mainCallback === 'function'){
                mainCallback(error, taskResults)
            }
            delete tasksHolder._endTasks;
            delete tasksHolder._startTasks;
            return taskResults;
        }

        tasksHolder._startTasks = function(callBack, taskResults){          
            //log
            
            callBack(null, {})
            return false
        }            

        i = 0;
        //execute each task (function) in the syncTasks array/object
        taskRunner.execSync = function(){    
            var fn = tasksHolder[syncTasks[i]];                                            
                                   
            function cb(err, results){         
                if(err){                
                    if(typeof mainCallback === 'function'){mainCallback(err)}
                    return false
                }

                taskResults[syncTasks[i]] = results;
                i++
                                    
                taskRunner.execSync();              
            }   

            return fn(cb);                
        }
        
        //create a new instance
        taskRunner.execAsync = function(){
            var cb_counter = 0, return_val;                                
            
            for (var i = 0; i < asyncTasks.length; i++) {                
                tasks_fn(asyncTasks[i]);                                                                                   
            }

            function tasks_fn(taskName){            
                var fn = tasksHolder[taskName]                

                function cb(err, results){
                    if(err){                
                        if(typeof mainCallback === 'function'){mainCallback(err)}
                        return false
                    }
                    //add the results to the correct property of the results obj

                    taskResults[taskName] = results;
                    cb_counter++; 

                    //after running async tasks run sync tasks
                    if(cb_counter >= asyncTasks.length){     
                        delete taskResults._startTasks;                 
                        taskRunner.execSync();                            
                    }
                }

                return_val = fn(cb); 
            }    

            return return_val
        }

        return taskRunner            
    }

    function isValidTaskList(tasksNames){

        if(!(tasksNames instanceof Array)){
            throw 'tasks.js Error: setTasks & setTasksAsync functions must pass an array of strings'
        }

        for (var i = 0; i < tasksNames.length; i++) {
            if(!(tasksHolder[tasksNames[i]])){
                return false
            }            
        }
        return true
    }

    //creates an new instance of tasks with syncTask from params
    mth.setTasks = function(syncList){        
        syncList = (syncList) ? Array.from(syncList) :Object.getOwnPropertyNames(tasksHolder);

        if(isValidTaskList(syncList)){
            return new multiTaskHandler(tasks_fns, {syncTasks:syncList}) ;     
        }else{
            throw 'tasks.js Error: Invalid taskList!!!';
        }   
    }

    //creates an new instance of tasks
    mth.setTasksAsync = function(asyncList, syncList){
        syncList = (syncList) ? Array.from(syncList) : [];
        asyncList = (asyncList) ? Array.from(asyncList) :Object.getOwnPropertyNames(tasksHolder);
        
        if(isValidTaskList(asyncList) && isValidTaskList(syncList)){
            return new multiTaskHandler(tasks_fns, {syncTasks:syncList, asyncTasks:asyncList}) ;    
        }else{
            throw 'tasks.js Error: Invalid taskList!!!';
        }        
    }

    mth.runTasks = function(){
        var taskArgs = [], callBack;
        //seperate the callBack from the remaining arguments
        if(typeof arguments[0] === 'function'){
            callBack = arguments[0];            
        }else{
            throw 'tasks.js Error: The runTasks method must take a callBack function as its first argument'
        }

        for (var i = 1; i < arguments.length; i++) {
            taskArgs.push(arguments[i])
        }
        taskArgs = (taskArgs.length > 0)? taskArgs: _tasksArgs;
       //create new tasksHolder passing runTasks args
       var newTasksHolder = tasks_fns.apply(tasks_fns, taskArgs);

       // create a new mht instance to avoid reference problems
       return new multiTaskHandler(newTasksHolder, {syncTasks:syncTasks, asyncTasks:asyncTasks})._runTasks(callBack);
    }

    mth._runTasks = function(callBack){     
        return new taskRunner(callBack).execAsync()          
    }
    
    mth.setArgs = function(){
         _tasksArgs = []
        for (var i = 0; i < arguments.length; i++) {
            _tasksArgs.push(arguments[i])
        }

        tasksHolder = tasks_fns.apply(tasks_fns, _tasksArgs);
        createMetods()//recreate the methods with new args
        return mth
    }

    //a subscription will exect the syncTasks every x seconds
    mth.createSubscription = function(seconds){
        
        var subscription = function(){
            var runningSub;
            
            var interval = (seconds) ? seconds * 1000: 1000;
            
            this.run = function(callBack, taskArgs){            
                runningSub = setInterval(function(){
                    mth.runTasks(callBack, taskArgs)
                }, interval); 
            }

            this.endSubscription = function(){
                console.log('endSubscription')
                clearInterval(runningSub)
            }
        }           

        return new subscription()
    }   

    
    //crate methods on the mth object to call each task fn directly 
    function createMetods(){
        var methodNames = Object.getOwnPropertyNames(tasksHolder)

        for (var i = 0; i < methodNames.length; i++) {            
            mth[methodNames[i]] = tasksHolder[methodNames[i]];
        } 
    }           
    createMetods();  
    
    return mth
}


function mod(name, modInit, parentMod){
    var childMod = {};    

    function mth(mthName, tasks_fn){
        parentMod[name][mthName] = new multiTaskHandler(tasks_fn);
    }

    function setArgs(){
        var args = [], _mod = {};
        _mod.setArgs = setArgs;
        _mod.mth = mth;
        _mod.addModule = addModule;
        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i])
        }

        return modInit.apply(_mod, args);
    }
    
    function addModule(_name, _modInit){
        return new mod(_name, _modInit, childMod)
    }

    
    childMod.mth = mth;
    childMod.setArgs = setArgs;
    childMod.addModule = addModule;

    parentMod[name] = childMod;

    return modInit.apply(childMod, []);    
}

function addModule(name, modInit){
    new mod(name,  modInit, tasks); 

    return tasks
}   


var objHelper = function(obj){
    var objHelper = this;


    function cloneKeys(keys, toObj){
        var copy = toObj || {};

        var pNames = keys || Object.getOwnPropertyNames(obj);
        
        for (var i = 0; i < pNames.length; i++) {
            copy[pNames[i]] = obj[pNames[i]];
        } 

        return copy
    };

    function uniqueKeys(key){
        var uniqueList = [], uniqueDocs = [], arr = obj;
        
        for (var i = 0; i < arr.length; i++) {
            if( uniqueList.indexOf(arr[i][key]) === -1 ){
                uniqueList.push(arr[i][key]);
                uniqueDocs.push(arr[i]);
            }
        }

        objHelper.uniqueDocs = uniqueDocs
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


    objHelper.cloneKeys = cloneKeys;
    objHelper.uniqueKeys = uniqueKeys;
    objHelper.sumOfKeys = sumOfKeys        
    return objHelper
}
var tasks = {};
tasks.multiTaskHandler = multiTaskHandler;
tasks.addModule = addModule;
tasks.obj = objHelper

exports.tasks = tasks;

exports.obj = objHelper;
exports.multiTaskHandler = multiTaskHandler;
exports.addModule = addModule;

