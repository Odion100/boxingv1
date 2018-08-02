
/*
const mongo = require("mongojs");
const asinData = mongo("VC_OPS", ['asinData']).asinData;
const pf = require('./vbs_operations').pointForceQueries
const tasks = require("./tasks");

const aux = mongo("VC_OPS", ['aux']).aux;


var sysCheckService = new tasks.multiTaskHandler(function(){
    var sysUpdate = {};  
    function asinDataCheck(callBack){
        asinData.find({unit_breakdown:null}).count(function(err, count){
            if(err){
                callBack(err);
                 
            }else{
                var results;  
                if(count > 0){
                    sysUpdate.asinDataCheck = count + ' new ASIN(s) missing critical data needed to process orders!'
                   
                }
                
                callBack();
            }
        })            
    }
    function newReceiptsCheck(callBack){            
        pf.getPOs(['128664'], function(data, err){
            if(err){
                callBack(err);
            }else{
                sysUpdate.newReceiptsCheck = data.length + ' untouched receipt(s)!!!'
                callBack();
            }
        })
    }

    function updateSysNotifications(callBack){
        aux.update({_id:'sys_check_service'}, {notifications:sysUpdate}, {upsert:true}, function(err, doc){
            if(err){
                callBack(err);
            }else{
                callBack();
            }
        })
    }
    
    function getUpdate(callBack){
        aux.findOne({_id:'sys_check_service'}, function(err, doc){
            if(err){
                callBack(err);
            }else{
                callBack(null, doc);
            }
        })
    }


    return {
        asinDataCheck:asinDataCheck,
        newReceiptsCheck:newReceiptsCheck,            
        updateSysNotifications:updateSysNotifications,
        getUpdate:getUpdate         
    }
})

sysCheckService.runTasks(function(err, results){
    if(true){
        console.log(err)

        console.log(results.getUpdate)
    }
})
*/

/*tasks.test('scs');


sysCheckService.setArgs('hey look at me!!!')['newReceiptsCheck'](function(err, results){
    if(err){        
        
        console.log('---------------err------------');  
        console.log(err);        
    }else{                
        console.log("------------------['newReceiptsCheck']--------------------------")
        console.log(results);
    }
})

sysCheckService.asinDataCheck(function(err, results){
    if(err){        
        console.log('---------------err------------');  
        console.log(err);        
    }else{                
        console.log('---------------------------.asinDataCheck----------------------');        
        console.log(results);
    }
})

sysCheckService.runTasks(function(err, results){
     if(err){        
        console.log('---------------err------------');  
        console.log(err);        
    }else{                
        console.log('---------------------------.runTasks----------------------');        
        console.log(results);
    }  
}, 'goodbye world')

sysCheckService.setTasksAsync(
    ['asinDataCheck','newReceiptsCheck'],
    ['updateSysNotifications', ]
).runTasks(function(err, results){
    if(err){        
        console.log('---------------err------------');  
        console.log(err);        
    }else{                
        console.log('---------------------------.setTasksAsync----------------------');        
        console.log(results);
    }  
}, 'whatever')*/

/*//5. createSubscription(x).run will execute each task in the current taskList every x seconds
sysCheckService.createSubscription(2).run(function(err, results){
	if(err){
		console.log(err)
	}else{
		console.log('subscription 1: ' + JSON.stringify(results))
	}
})

sysCheckService2.setTaskList(['task2']).createSubscription(3).run(function(err, results){
	if(err){
		console.log(err)
	}else{
		console.log('subscription 2: ' + JSON.stringify(results))
	}
})*/


// const ops = require('./$$OPS');

// var calc = ops.eachesCalc([{sku:'THRNW0023', multiple:2}, {sku:'THRNW1195', multiple:1}])
// console.log('-------------------------toSKU---------------------------------------')
// console.log(calc.toSKU())
// console.log('-------------------------toSKU_HTML---------------------------------------')
// console.log(calc.toSKU_HTML())

// console.log('hell   0')
// console.log(calc.units(10).toEaches());
// console.log('-------------------------subtract---------------------------------------')

// console.log('-------------------------toQty_HTML---------------------------------------')
// console.log(calc.eaches().toQty_HTML())

// console.log(calc.eaches().subtract({'THRNW0023':3/*, 'THRNW1195':5*/}));
// console.log('----------------------------------------------------------------')

// console.log(calc.eaches().toUnits());
// console.log('-------------------toRealUnits---------------------------------------------')
// console.log(calc.eaches().realUnits());
// console.log('-------------------leftOvers---------------------------------------------')

// console.log(calc.eaches().leftOvers());
// console.log(calc.eaches().toString());
// console.log('------------------------add----------------------------------------')

// console.log(calc.eaches().add({'THRNW0023':3, 'THRNW1195':5}));
// console.log(calc.eaches().realUnits());
// console.log(calc.eaches().leftOvers());
// console.log(calc.eaches().toString());

// console.log('----------------------------dsdfs------------------------------------')
// console.log(calc.units().add(5).toEaches());
// console.log(calc.eaches().realUnits());
// console.log(calc.eaches().leftOvers());
// console.log(calc.eaches().toString());

// console.log('----------------------------------------------------------------')
// console.log(calc.units().subtract(2).toEaches());
// console.log(calc.units().subtract(2).toEaches());

// console.log('----------------------------------------------------------------')
// console.log(calc.eaches().toString());
// console.log('----------------------------------------------------------------')
// console.log(calc.isMatchingSku('THRNW1195'));
// console.log(calc.isMatchingSku('THRNW0023'));
// console.log(calc.isMatchingSku('Hellwor'));

/*const aux_fns = require('./vbs_operations').aux_fns;
aux_fns.setOrderLineEditorData(function(data, err){

	if(err){
		console.log(err);
	}else{
		console.log(data);
	}
});*/
/*const pf = require('./vbs_operations').pointForceQueries
pf.getNewSkus('2017-03-23', function(data, err){
	if(err){
		console.log(err);
	}else{
        console.log('data')
        console.log(data)		
	}
});
*/


/*const fs = require('fs');
const cvsConv = require('csvtojson');
var cwd = process.cwd();

const output_path = cwd + '\\PF_OUT\\';
console.log(output_path);

console.log(fs.existsSync(output_path))

if (!(fs.existsSync(output_path))){
	fs.mkdirSync(output_path)
}


cvsConv().fromFile('\\\\nyevrvdc001\\Users\\oedwards\\Documents\\PROJECTS\\data.csv')

.on('data', function(json){
	console.log('json');
	console.log(JSON.parse(json.toString('utf8')));

})

.on('error', function(json){
	console.log(json);
})*/


/*fs.readFile('\\\\nyevrvdc001\\Users\\oedwards\\Documents\\PROJECTS\\data.csv', 'utf8',  function(err, data){
	if(err){
		console.log(err);
	}else{

		console.log(data);
	}
})*/




/*var proc = require('child_process');
//C:\\Windows\\SysWOW64\\cmd.exe 

var cmd = 'C:\\Windows\\SysWOW64\\cmd.exe' 
//console.log(process.env)

var args = '"SELECT POOO_2.PURORD, POOO_2.PRODCT, POOO_2.ORDQTY, POOO_2.RECQTY FROM POOO_2 POOO_2 WHERE POOO_2.PURORD IN \'128805\', \'128664\')"'
args = args + ' "po_number, sku, qty_ordered, qty_received"'
args = args + ' "\\\\nyevrvdc001\\Users\\oedwards\\Documents\\PROJECTS"'

proc.exec('cscript ops.vbs //NoLogo ' + args, {cwd:'C:/OPS2.0/', shell:cmd}, function(error, stdout, stderr) {
    
    console.log('stdout: ' + stdout);
    
    console.log('stderr: ' + stderr);
    
    if (error !== null) {
        console.log('exec error: ' + error);
    }
});
*/
/*const mongo = require("mongojs");
const request_log = mongo("VC_OPS", ['request_log']).request_log;
const aux = mongo("VC_OPS", ['aux']).aux;
const orders = mongo("VC_OPS", ['orders']).orders;
const asinData = mongo("VC_OPS", ['asinData']).asinData;
const receipts = mongo("VC_OPS", ['receipts']).receipts;
const pf_skus = mongo("VC_OPS", ['pf_skus']).pf_skus;

const _request_log = mongo("VC_backup", ['request_log']).request_log;
const _aux = mongo("VC_backup", ['aux']).aux;
const _orders = mongo("VC_backup", ['orders']).orders;
const _asinData = mongo("VC_backup", ['asinData']).asinData;
const _receipts = mongo("VC_backup", ['receipts']).receipts;
const pf_skus_copy = mongo("VC_backup", ['pf_skus']).pf_skus;
const tasks = require("./tasks");


var copy_db = new tasks.multiTaskHandler(function(orgDB, backupDB){
    var data;
    function getData(nextTask){
        orgDB.find({}, function(err, doc){
            if(err){
                console.log(err)
            }else{
                data = doc
                nextTask();
            }
        })
    }

    function deleteFromBackup(nextTask){
        backupDB.remove({}, function(err, doc){
            if(err){
                console.log(err);
            }else{
                console.log(doc);
                nextTask();
            }
        }) 
    }

    function insertBackupData(nextTask){
        backupDB.insert(data, function(err, doc){
            if(err){
                console.log(err);
            }else{
                
                nextTask();
            } 
        })
    }

    return {
        getData:getData,
        deleteFromBackup:deleteFromBackup,
        insertBackupData:insertBackupData
    }
})



copy_db.runTasks(function(err, results){
    if(err){
        console.log('error')
    }else{
        console.log('success')
    }
}, request_log, _request_log)


copy_db.runTasks(function(err, results){
    if(err){
        console.log('error')
    }else{
        console.log('success')
    }
}, aux, _aux)


copy_db.runTasks(function(err, results){
    if(err){
        console.log('error')
    }else{
        console.log('success')
    }
}, orders, _orders)


copy_db.runTasks(function(err, results){
    if(err){
        console.log('error')
    }else{
        console.log('success')
    }
}, asinData, _asinData)


copy_db.runTasks(function(err, results){
    if(err){
        console.log('error')
    }else{
        console.log('success')
    }
}, receipts, _receipts)


copy_db.runTasks(function(err, results){
    if(err){
        console.log('error')
    }else{
        console.log('success')
    }
}, pf_skus, _pf_skus)
*/
/*const ops = require('./$$OPS');
const mongo = require("mongojs");
const orders = mongo("VC_OPS", ['orders']).orders;
orders.findOne({_id:"56EFQ4YNB004TON9BK"}, function(err, doc){

    var calc = ops.eachesCalc(doc.unit_breakdown)  
    doc.in_stock_units = 90;
    doc.in_stock_eaches = calc.units(90).toEaches()
    doc.boxed_units = 0;
    console.log(doc); 
    orders.save(doc)
})
orders.findOne({_id:"4WIWPEJOB002H0SED6"}, function(err, doc){

    var calc = ops.eachesCalc(doc.unit_breakdown)  
    doc.in_stock_units = 10;
    doc.in_stock_eaches = calc.units(10).toEaches()
    doc.boxed_units = 0;
    console.log(doc); 
    orders.save(doc)
})*/

/*const tasks = require("./tasks").tasks;
//console.log(tasks)
tasks

.addModule('db', function(coll){

    db = this;

    console.log('db------------------------------------------------')
    console.log(db)
    db.mth('testTaskHandler', function(){

        this.test1 = function (nextTask){
            console.log('test1---' + coll)
            nextTask()
        }

        function test2(nextTask){
            console.log('test2---' + coll)
            nextTask()
        }

        return {
            test1:test1,
            test2:test2
        }
    })

    db.doSomething = function(){
        console.log('did that!' + coll)
    }

    console.log('db------------------------------------------------2')
    console.log(db)

    db.addModule('xlHandler', function(){
        xlHandler = this;
        console.log('xlHandler-----------------------')
        console.log(xlHandler)
    })

    console.log('this-------------------')
    console.log(this)    

    return db
})

.addModule('anotherTestMod', function(){
    var aMod = this

    aMod.helloWorld = function(){
        console.log('helloWorld')
    }
})

console.log('tasks--------------------')
console.log(tasks)

console.log('-----------------------------')



tasks.db.testTaskHandler.runTasks(function(){

})

tasks.db.setArgs('goodbye world').doSomething()

tasks.db.doSomething();*/

// asinData  = obj(tasks.xlHandler.setArgs(asinData)).cloneKeys(['xlInser', 'xlUpdate'], asinData)
/*const moment = require("moment");
const mongo = require("mongojs");
const orders = mongo("VC_OPS", ['orders']).orders;


console.log('dks')
orders.findOne({_id:"4L2CINBXB000VH6MEK"}, function(err, doc){

    console.log(doc)
    doc.boxed_units = 24
    doc.in_stock_eaches = {KEH00737270:0}   
    doc.in_stock_units = 0
    console.log('doc--------------------------------')
    console.log(doc)
    orders.save(doc) 
})*/


/*function labelNumber(count){
    var count_suffix = ['', '-A', '-B', '-C', '-D', '-E', '-F', '-G', '-H', '-I', '-J', '-K', '-L', '-M', '-N', '-O', '-P', '-Q', '-R', '-S', '-T', '-U', '-V', '-W', '-X', '-Y', '-Z']
    
    var i = parseInt(count/250);

    if((count -(250 * i)) === 0){
        i--;
    }

    return (count -(250 * i))+ count_suffix[i];
}*/
    

/*const moment = require("moment");
const mongo = require("mongojs");
const orders = mongo("VC_OPS", ['orders']).orders
const pf_skus = mongo("VC_OPS", ['pf_skus']).pf_skus
const asinData = mongo("VC_OPS", ['asinData']).asinData
const csv2json = require('csvtojson');
const eachesCalc = require('./$$OPS').eachesCalc;

orders.findOne({_id:"722AA6XUB01KA6ZDVO"}, function(err, doc){
    if(err){
        console.log(err)
        return
    }
    
    //doc.pending_eaches = {'3M1626W':0}
    doc.in_stock_eaches = {'EOS01003':732}
    doc.in_stock_units = 732
    doc.boxed_units = 0
    orders.save(doc)
    console.log(doc)
})

*/

// multiTaskHandler(function(){
//     var fixes = [], order_data

//     this.getFromCSV = function(nextTask){
//         csv2json({
//         delimiter:','               
//         }).fromFile(process.cwd()+'\\'+'fix.csv')

//         .on('json', function(json){            
//             fixes.push(json);
//         })

//         .on('error', function(err){
//             console.log('on error');
//             nextTask(err);
//         })

//         .on('end', function(){
//             nextTask()
//         })
//     }

//     this.getOrders = function(nextTask){
//         var uids = uniqueKeys(fixes, 'order_id')
//         //console.log(fixes)
//         orderQuery.runTasks(function(err, doc){
//             if(err){
//                 nextTask(err)
//             }else{
//                 order_data = doc
//                 //console.log('order_data-------------------------------------')
//                 //console.log(order_data)
//                 nextTask()
//             }
//         }, {_id:{$in:uids}})
//     }

//     this.doUpdate = function(nextTask){
//         obj(fixes).forEachSync(function(fix, index, next){

//             var order = obj(order_data).findByKey('_id', fix.order_id)[0];
//             //console.log(order)
//             order.boxed_units = Number(fix.fix);
//             order.in_stock_eaches = eachesCalc(order.unit_breakdown).units(order.units_confirmed - order.boxed_units).toEaches()
//             order.in_stock_units = order.units_confirmed - order.boxed_units
//             //console.log(order)
//             orders.save(order, function(){
//                 next()
//             })
//             console.log(index)
//         })
//     }
// }).runTasks()











// var orderQuery = new multiTaskHandler(function(orders_query, _orders){
//     var order_data, asin_data, sku_data;

//     this.getOrders = function (nextTask){
//         //follow allow you to optionaly pass orders or query
//         if(orders_query){            
//             orders.find(orders_query, function(err, doc){            
//                 if(err){
//                     nextTask(err)
//                 }else{                                                                               
//                     order_data = doc;                                        
//                     nextTask(err, doc);                
//                 }
//             })
//         }else{
//             order_data = _orders;
//             nextTask();
//         }
        
//     }

//     this.getAsins = function (nextTask){         
//         //unique list of asins        
//         var unique_asins = uniqueKeys(order_data, 'asin')        
//         //get the asin for each order
//         asinData.find({$and:[{asin:{$in:unique_asins}}, /*{unit_breakdown:{$ne:null}}*/]}, function(err, doc){
//             if(err){
//                 nextTask(err)
//             }else{        
//                 asin_data = doc;                
//                 nextTask()                
//             }
//         })
//     }

//     this.getUnitBreakdowns = function (nextTask){
//         //unique list of skus        
//         var unique_skus = uniqueKeys(asin_data, 'pf_sku')        
//         //get the set_breakdown for each asin pf_skus
//         pf_skus.find({sku:{$in:unique_skus}}, function(err, doc){
//             if(err){
//                 nextTask(err)
//             }else{        
//                 sku_data = doc;
//                 nextTask()            
//             }
//         })   
//     }

//     this.combinedData = function(nextTask, endTasks){
//         var skip = false;
//         console.log('jhe    -----------------------------')
//         //attach unit_breakdown to the corresponding order line
//         for (var i = 0; i < order_data.length; i++) {
//             for (var n = 0; n < asin_data.length; n++) {
//                 if(asin_data[n]._id === order_data[i].asin + order_data[i].vendor_code){
//                     for (var a = 0; a < sku_data.length; a++) {
//                         if(sku_data[a].sku === asin_data[n].pf_sku){                           
//                             skip = true
//                             order_data[i].pf_sku = sku_data[a].sku;
//                             order_data[i].item_weight = sku_data[a].weight;

//                             if(sku_data[a].is_set){
//                                 order_data[i].unit_breakdown = sku_data[a].set_breakdown;
//                             }else{
//                                 order_data[i].unit_breakdown = [{
//                                     sku:asin_data[n].pf_sku,
//                                     multiple:asin_data[n].multiple
//                                 }]
//                             }

//                             order_data[i]._skus = eachesCalc(order_data[i].unit_breakdown).toSKU();
//                             break
//                         }
//                     }
//                     if (skip) {skip = false;break}
//                 }                
//             }     
//             //order_data[i].unit_breakdown = order_data[i].unit_breakdown || [];       
//         }
//         console.log('eng===========----------------------')
//         endTasks(null, order_data)
//     }

// })
/*const boxes = mongo("VC_OPS", ['boxes']).boxes

boxes.find({}).forEach(function(err, doc){
    if(err){
        console.log(err);
        return
    }else if(doc){
        //console.log(doc)

        doc.labelNumber = labelNumber(doc.boxNumber);
        doc.open = false;
        boxes.save(doc);
        console.log(doc.labelNumber)
    }else{
        console.log('complete')
    }
    
})*/
// const pf_skus = mongo("VC_OPS", ['pf_skus']).pf_skus;
// const pf = require('./vbs_operations').pointForceQueries

// console.log('dks')
// /*pf.getSuppler('THRII0047', function(results, err){
//     console.log(results)
// })
// return*/
// pf_skus.find({vendor_codes:null}, function(err, doc){

//     if(err){
//         console.log(err)
//         return
//     }

//     function doYou(sku){
//         pf.getSuppler(sku.sku, function(results, err){
//             if(err){
//                 console.log('err-----------------')
//                 console.log(err)
//                 next()
//             }else{
//                 if(results[0].vendor_code){
//                     sku.vendor_codes = uniqueKeys(results, 'vendor_code');
//                     sku.vendor_skus = uniqueKeys(results, 'vendor_sku');
//                 }else{
//                     sku.vendor_codes = []
//                     sku.vendor_skus = []
//                 }
//                 pf_skus.save(sku) 


//                 console.log(sku)
//                 console.log(results)
//                 /*if (results[0].sku){
//                     return
//                 }*/
//                 next()
//             }                
//         })    
//     }

//     function next(){
//         var sku = doc.shift();
//         if(sku){
//             doYou(sku)
//         }else{
//             console.log('complete')
//         }
//     }

//     next()
//     console.log(doc[0])
//     console.log(doc.length)
    
// })



/*var unpause = [
{_id:"1T4M9SBKB0008F4HPQ", boxed_units:50},
{_id:"8E36B7GPB008DQY89M", boxed_units:24},
{_id:"8E36B7GPB01KA6ZDVO", boxed_units:588},
{_id:"1T4M9SBKB019CDVUI6", boxed_units:1},
{_id:"4L2CINBXB00843E5NS", boxed_units:19},
{_id:"4S5LSBACB000WZOJCI", boxed_units:840},
{_id:"1T4M9SBKB007KOOCJ4", boxed_units:12},
{_id:"2UF9O4WQB01IPN8UC8", boxed_units:117},
{_id:"4L2CINBXB0001TMDF0", boxed_units:8},
{_id:"7A6ROG1MB001CMZB4U", boxed_units:198},
{_id:"2UWV2N6AB01AKGR9H0", boxed_units:4},
{_id:"1T4M9SBKB008N1SJ8I", boxed_units:60},
{_id:"14IGG4ZEB00DVMHAUW", boxed_units:36},
{_id:"5C8AJ3IXB00K0U5KGE", boxed_units:1},
{_id:"4S5LSBACB0001TMDF0", boxed_units:19},
{_id:"1FEBBD4DB00IIWQFO2", boxed_units:53},
{_id:"3CG6GBHRB000GCIAQS", boxed_units:12},
{_id:"7A6ROG1MB011A4F6BC", boxed_units:16},
{_id:"1T4M9SBKB005P0MEMM", boxed_units:60},
{_id:"2KEGWWFNB004FI3QBI", boxed_units:5},
{_id:"1Y7OH95AB00BH4AJ36", boxed_units:6},
{_id:"1T4M9SBKB004WP0S74", boxed_units:4},
{_id:"1T4M9SBKB00014EB6O", boxed_units:644},
{_id:"1Y7OH95AB010OV9K1O", boxed_units:12},
{_id:"7A6ROG1MB018GXS7WK", boxed_units:8},
{_id:"1UYDUW6ZB000KHMI44", boxed_units:12},
{_id:"4L2CINBXB000GG16QA", boxed_units:14},
{_id:"8Y6RQXZCB01M8GC66G", boxed_units:1},
{_id:"1GE54L3BB00IC4XC6K", boxed_units:10},
{_id:"1T4M9SBKB008IVS4A6", boxed_units:22},
{_id:"1T4M9SBKB00E4MRRXI", boxed_units:4},
{_id:"7A6ROG1MB00D6O4WUG", boxed_units:12},
{_id:"1Y7OH95AB00HURXN3C", boxed_units:1},
{_id:"4L2CINBXB01ANSKV3O", boxed_units:6},
{_id:"5X77FUUMB01A0UKAZ4", boxed_units:4},
{_id:"1T4M9SBKB0013Z9EBC", boxed_units:134},
{_id:"1T4M9SBKB001AZ022A", boxed_units:12},
{_id:"1Y7OH95AB0001TMDF0", boxed_units:48},
{_id:"3CG6GBHRB00014EGA0", boxed_units:6},
{_id:"7A6ROG1MB00WKNCVU2", boxed_units:6},
{_id:"3CG6GBHRB00B5PYFE6", boxed_units:6},
{_id:"1T4M9SBKB00B5PYFE6", boxed_units:6},
{_id:"1T4M9SBKB0048IC328", boxed_units:4},
{_id:"4L2CINBXB01IN5GHWI", boxed_units:8},
{_id:"4L2CINBXB00E00XQ66", boxed_units:7},
{_id:"1T4M9SBKB00GCZ9X5K", boxed_units:9},
{_id:"1Y7OH95AB004AI9234", boxed_units:18},
{_id:"4L2CINBXB00EKONU1I", boxed_units:9},
{_id:"1Y7OH95AB00XLG3P3E", boxed_units:4},
{_id:"1T4M9SBKB00B7K0Z8E", boxed_units:47},
{_id:"4S5LSBACB00FGKWRIC", boxed_units:3},

]
*/
const mongo = require("mongojs");
const moment = require("moment");
const orders = mongo("VC_OPS", ['orders']).orders
/*const orders_bd2 = mongo("OPS3", ['orders']).orders

const boxes = mongo("VC_OPS", ['boxes']).boxes
const boxes_bd = mongo("VC_OPS", ['boxes_bd']).boxes_bd

const receipts = mongo("VC_OPS", ['receipts']).receipts
const receipts_bd2 = mongo("OPS3", ['receipts']).receipts

const asinData = mongo("VC_OPS", ['asinData']).asinData
const csv2json = require('csvtojson');*/
const eachesCalc = require('./$$OPS').eachesCalc;
const tasks2 = require('./tasks2');
var obj = tasks2.obj;


orders.findOne({_id:"691Z7ZGYB00BT2MK24"}, function(err, doc){
    if(err){
        console.log(err)
        return
    }
    //var calc = eachesCalc([{sku: "COSJOVMCS3", multiple: 1}])
    console.log(doc)

    doc.canceled_units = 0
    doc.in_stock_eaches = {"REG0-25408": 72}
    doc.in_stock_units  = 72 
    doc.boxed_units = 0;    
    orders.save(doc)
    console.log(doc)
})