function cloneKeys(fromObj, keys, toObj){
	var copy = toObj || {};
	var pNames = keys || Object.getOwnPropertyNames(fromObj);
	for (var i = 0; i < pNames.length; i++) {
		copy[pNames[i]] = fromObj[pNames[i]];
	} 
	return copy
};

function findByKey(arr, keyName, searchStr, multi){
    var results = [];

    for (var i = 0; i < arr.length; i++) {
        if(arr[i][keyName] === searchStr) {
            results.push(arr[i]);
            if(!multi){break}
        }
    }

    return results
}
function uniqueKeys(arr, key){var uniqueList = [];for (var i = 0; i < arr.length; i++) {if( uniqueList.indexOf(arr[i][key]) === -1 ){uniqueList.push(arr[i][key]);}}return uniqueList};
function sumOfKeys(arr, key){var sum = 0; for (var i = 0; i < arr.length; i++) {var num = arr[i][key]*1; num = (isNaN(num))? 0:num; sum = sum + num } return sum }

var objHandler = function(obj){
    var handler = {}

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


    handler.cloneKeys = function (keys, toObj){
        var copy = toObj || {};

        var pNames = keys || Object.getOwnPropertyNames(obj);
        
        for (var i = 0; i < pNames.length; i++) {
            copy[pNames[i]] = obj[pNames[i]];
        } 

        return copy
    };

    handler.uniqueKeys = function (key){
        var uniqueList = [], arr = obj;
        
        for (var i = 0; i < arr.length; i++) {
            if( uniqueList.indexOf(arr[i][key]) === -1 ){
                uniqueList.push(arr[i][key]);
            }
        }
        return uniqueList
    };
    
    handler.sumOfKeys = function (key){
        var sum = 0, arr = obj; 

        for (var i = 0; i < arr.length; i++) {
            var num = arr[i][key]*1
            ; num = (isNaN(num))? 0:num; sum = sum + num 
        } 
        return sum
    }    
    handler.findByKey = function (key, searchArr, multi){
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

    handler.navigate = function (pNames, start){
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

angular.module('tasks', [])

.service('tasks',[ function(){
	
	//multi Task handler Class
	//Async/snyc task manager 
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

	    mth._runTasks = function(callBack, taskArgs){     
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

	var tasks = {};
	tasks.multiTaskHandler = multiTaskHandler;
	
	return tasks
}])
