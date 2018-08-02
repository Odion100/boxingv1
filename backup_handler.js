const moment = require("moment");
const mongo = require("mongojs");
const orders = mongo("VC_OPS", ['orders']).orders
const boxes = mongo("VC_OPS", ['boxes']).boxes

const orders_bd = mongo("VC_OPS", ['orders_bd']).orders_bd
const boxes_bd = mongo("VC_OPS", ['boxes_bd']).boxes_bd
const orders_bd2 = mongo("VC_OPS", ['orders_bd2']).orders_bd2
const boxes_bd2 = mongo("VC_OPS", ['boxes_bd2']).boxes_bd2


const csv2json = require('csvtojson');
const eachesCalc = require('./$$OPS').eachesCalc;


setInterval(function(){
	backup.runTasks(function(err, results){
		if(err){
			console.log(err)
		}else{
			console.log(results)
			console.log('backup-----')
		}
	})
}, 300000)

setInterval(function(){
	backup2.runTasks(function(err, results){
		if(err){
			console.log(err)
		}else{
			console.log(results)
			console.log('backup2-----')
		}
	})
}, 900000)

var backup = new multiTaskHandler(function(){
	this.getBoxes = function(nextTask){
		console.log('getBoxes----------------------------')
		boxes.find({}, function(err, doc){
			if(err){
				nextTask(err)
			}else{				
				removeBoxes_bd(doc, nextTask)
			}	
		})
	}

	this.getOrders = function(nextTask){
		console.log('getOrders----------------------------')
		orders.find({}, function(err, doc){
			if(err){
				nextTask(err)
			}else{				
				removeOrders_bd(doc, nextTask)
			}				
		})			
	}

	function removeBoxes_bd(data, nextTask){
		boxes_bd.remove(null, function(err, doc){
			if(err){
				nextTask(err)
			}else{
				insertBoxesBackup(data, nextTask)
			}
		})
	}
	function removeOrders_bd(data, nextTask){
		orders_bd.remove(null, function(err, doc){
			if(err){
				nextTask(err)				
			}else{
				insertOrderBackups(data, nextTask)
			}
		})			
	}
	function insertBoxesBackup(data, nextTask){
		console.log('insertBoxesBackup-------------------------')
		boxes_bd.insert(data, function(err, doc){
			if(err){
				nextTask(err)
			}else{
				nextTask(null, doc)
			}
		})
	}

	function insertOrderBackups(data, nextTask){
		console.log('insertOrderBackups-------------------------')
		orders_bd.insert(data, function(err, doc){
			if(err){
				nextTask(err)
			}else{
				nextTask(null, doc)
			}
		})
	}
}).setTasksAsync()

backup.runTasks(function(err, results){
	if(err){
		console.log(err)
	}else{
		console.log(results)
		console.log(Date())
	}
})
var backup2 = new multiTaskHandler(function(){
	this.getBoxes = function(nextTask){
		console.log('getBoxes----------------------------')
		boxes.find({}, function(err, doc){
			if(err){
				nextTask(err)
			}else{				
				removeBoxes_bd(doc, nextTask)
			}	
		})
	}

	this.getOrders = function(nextTask){
		console.log('getOrders----------------------------')
		orders.find({}, function(err, doc){
			if(err){
				nextTask(err)
			}else{				
				removeOrders_bd(doc, nextTask)
			}				
		})			
	}

	function removeBoxes_bd(data, nextTask){
		boxes_bd2.remove(null, function(err, doc){
			if(err){
				nextTask(err)
			}else{
				insertBoxesBackup(data, nextTask)
			}
		})
	}
	function removeOrders_bd(data, nextTask){
		orders_bd2.remove(null, function(err, doc){
			if(err){
				nextTask(err)				
			}else{
				insertOrderBackups(data, nextTask)
			}
		})			
	}
	function insertBoxesBackup(data, nextTask){
		console.log('insertBoxesBackup-------------------------')
		boxes_bd2.insert(data, function(err, doc){
			if(err){
				nextTask(err)
			}else{
				nextTask(null, doc)
			}
		})
	}

	function insertOrderBackups(data, nextTask){
		console.log('insertOrderBackups-------------------------')
		orders_bd2.insert(data, function(err, doc){
			if(err){
				nextTask(err)
			}else{
				nextTask(null, doc)
			}
		})
	}
}).setTasksAsync()


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