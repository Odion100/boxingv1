//this file is a wrapper for my database adding logging, excel file processing, error handling, and more functionalities

//db tables
const mongo = require("mongojs");
const request_log = mongo("VC_backup", ['request_log']).request_log;
const aux = mongo("VC_backup", ['aux']).aux;

const orders = mongo("VC_backup", ['orders']).orders;
const asinData = mongo("VC_backup", ['asinData']).asinData;
const receipts = mongo("VC_backup", ['receipts']).receipts;
const pf_skus = mongo("VC_backup", ['pf_skus']).pf_skus;


//project libraries
const aux_fns = require('./vbs_operations').aux_fns;
const pf = require('./vbs_operations').pointForceQueries
const xlToJson = require('./xlToJson');
const ops = require('./$$OPS');
const multiTaskHandler = require('./tasks').multiTaskHandler

const fs = require('fs');
const json2xls = require('json2xls');
const moment = require('moment');

const temp = 'C:/OPS2.0/temp/';

function cloneKeys(original, keys){

    var copy = {}
    var pNames = keys || Object.getOwnPropertyNames(original);

    for (var i = 0; i < pNames.length; i++) {
        copy[pNames[i]] = original[pNames[i]];
    }
    return copy
}

function uniqueKeys(arr, key){
    var uniqueList = [];
    //create a unique list of key from a collection of objects
    for (var i = 0; i < arr.length; i++) {
        if( uniqueList.indexOf(arr[i][key]) === -1 ){
            uniqueList.push(arr[i][key]);
        }
    }
    return uniqueList
}

//data fields to parse and vaildations configs when converting excel files
orders.vaildations = {
    dates:['earliest_ship_date', 'latest_ship_date', 'expected_ship_date', 'order_date'],
    numbers:['cost', 'units_confirmed'],
    booleans:[],
    json:['linked_po_numbers'], 
    object_id:[],
    tests:[
        {
            propertyName:'units_confirmed',
            isValid:function(value, json){
                return value > 0;

            }
        }
    ],

    before:function(json){
        //first two objects are field names from the upload template
        json.splice(0, 2);  
    },

    after:function(json, callBack){
       ordersProcessor.runTasks(function(err, results){
            if(err){
                throw err;
            }else{     
                console.log(results[0])                                    
                callBack(results);
            }
       }, json)
    }
}

pf_skus.vaildations = {
    dates:['created_date'],
    numbers:[],
    booleans:['deprecated'],
    json:['upcs'], 
    object_id:['_id'],
    tests:[],

    before:function(json){
        //first two object are field names from the upload template
        json.splice(0, 2);  
    },

    after:undefined
}

asinData.vaildations = {
    dates:[],
    numbers:['case_quantity', 'multiple'],
    booleans:['labels_required'],
    json:['unit_breakdown'], 
    object_id:[],
    tests:[],

    before:function(json){
        //first object are field names from the upload template
        json.splice(0, 1);  
    },

    after:undefined
}

receipts.vaildations = {
    dates:[],
    numbers:['line', 'rec_qty'],
    booleans:[],
    json:[], 
    object_id:[],
    tests:[],

    before:function(json){
        //first object are field names from the upload template
        json.splice(0, 1);  
    },

    after:function(json, callBack){

        receiptsProcessor.runTasks(function(err, results){
            if(err){
                throw err
            }else{                
                callBack(results)
            }
        }, json)
    }        
}
    
function add_xlHandler(coll, updateFields){

    coll.xlFileHandler = new multiTaskHandler(function(file){
        var new_json;

        function convertToJson(callBack){                            
           xlToJson.convert(file, coll.vaildations, function(err, json){
                if(err){
                   callBack(err);
                   console.log(err)
                }else{
                    console.log(json[0])
                    new_json = json;                        
                    callBack();                
                }                
           })               
        }

        function insert(callBack){              
            if(new_json.length === 0){
                callBack(null, new_json)
                return false
            }

            coll.insert(new_json, function(err, doc){
                if(err){
                    var error = err.toJSON()

                    if (err.code === 11000){                    
                        error.errMsg = 'Duplicate line at the following _id: \n\n' + error.op._id + '.\n\n All following lines were not inserted.'
                    }
                    callBack(err);                  
                }else{
                    callBack(null, doc);
                }
            })
        }

        function update(callBack){
            //create mongoQuery to find all docs to update
            var _ids = uniqueKeys(new_json, '_id');        
            var indexHolder = [];

            for (var i = 0; i < _ids.length; i++) {
                if(_ids[i].toString){
                    indexHolder.push(_ids[i].toString())
                }else{
                    indexHolder.push(_ids[i])
                }                
            }

            coll.find({_id:{"$in":_ids}}).forEach(function(err, doc){
                console.log('doc@1 :' + doc)
                if(err){
                    callBack(err)
                }

                if(doc){
                    var _id = (doc._id.toString) ? doc._id.toString():doc._id    
                    var replaceData = new_json[indexHolder.indexOf(_id)];

                    for (var i = 0; i < updateFields.length; i++) {
                        doc[updateFields[i]] = replaceData[updateFields[i]]
                    }

                    coll.save(doc);   
                }else{
                    callBack(null, {status:'update successful'})
                }  
                console.log('doc@2 :' + doc)              
            })
        }

        return{
            convertToJson:convertToJson,
            insert:insert,
            update:update 
        }
    })
}

add_xlHandler(orders, [
    'title', 
    'cost', 
    'earliest_ship_date', 
    'latest_ship_date', 
    'expected_ship_date', 
    'availablity_status', 
    'vendor_code', 
    'fulfillment_center', 
    'order_date', 
    'linked_po_numbers'
]);
add_xlHandler(pf_skus, [
    'keywords',
    'deprecated',
    'alternative_sku',
    'upcs',
]);

add_xlHandler(asinData, []);
add_xlHandler(receipts, []);

var ordersProcessor = new multiTaskHandler(function(new_orders){
    var asins = [], new_asinsData = [];

    function getUnitBreakdowns(callBack){            
        //create a unique list of asins
        var unique_asins = uniqueKeys(new_orders, 'asin')
        
        orderData.runTasks(function(err, results){
            if(err){
                callBack(err);
            }else{
                callBack()
            }
        }, null, new_orders);
    }

    function updateOrderTracking(callBack){        
        var new_asins = [];
        //asins = asins || [];
        //for each order line use the unit_breakdown and eachesCalc to fill in order tracking data
        for (var i = 0; i < new_orders.length; i++) {

            //set the default value for order tracking data
            new_orders[i].pending_eaches = null;
            new_orders[i].pending_units = new_orders[i].units_confirmed;
            new_orders[i].in_stock_eaches = null;
            new_orders[i].in_stock_units = 0;
            new_orders[i].in_job_eaches = null;
            new_orders[i].in_job_units = 0;
            new_orders[i].boxed_eaches = null;
            new_orders[i].boxed_units = 0;
            new_orders[i].canceled_eaches = null;
            new_orders[i].canceled_units = 0;

                                                  
            if (new_orders[i].unit_breakdown.length > 0){
                //fill out the order tracking data;  
                var eachesCalc = ops.eachesCalc(new_orders[i].unit_breakdown);

                new_orders[i].pending_eaches = eachesCalc.units(new_orders[i].units_confirmed).toEaches();                                                            
                new_orders[i].in_stock_eaches = eachesCalc.units(0).toEaches();      
                new_orders[i].in_job_eaches = eachesCalc.units(0).toEaches();    
                new_orders[i].boxed_eaches = eachesCalc.units(0).toEaches();
                new_orders[i].canceled_eaches = eachesCalc.units(0).toEaches();                                                  
            }
            
            
            //if the tracking data wasn't updated this is a new asin
            if(new_orders[i].pending_eaches === null) {
                
                var asin_id = new_orders[i].asin + new_orders[i].vendor_code;

                if(new_asins.indexOf(asin_id) === -1){

                    new_asins.push(asin_id);

                    new_asinsData.push({
                        _id:asin_id,
                        asin:new_orders[i].asin,
                        vendor_code:new_orders[i].vendor_code
                    })                            
                }
            }
                            
        }    
        callBack()
        insertNewAsins()
    }

    function insertNewAsins(){
        if(new_asinsData.length > 0){            
            asinData.insert(new_asinsData, function(err, doc){
                if(err){
                    console.log(err);
                }else{
                    console.log('insertNewAsins successful');
                }
            })
        }
    }

    
    return{
        getUnitBreakdowns:getUnitBreakdowns,
        updateOrderTracking:updateOrderTracking,        
        _return:function(){
            return new_orders
        }  
    }
})

//combined orders data with asinData unit_breakdonw for a given query to orders collection
var orderData = new multiTaskHandler(function(orders_query, _orders){
    var order_data, asin_data;

    function getOrders(callBack){
        //follow allow you to optionaly pass orders or query
        if(orders_query){            
            orders.find(orders_query, function(err, doc){            
                if(err){
                    callBack(err)
                }else{                                                                               
                    order_data = doc;                                        
                    callBack(err, doc);
                }
            })
        }else{
            order_data = _orders;
            callBack();
        }
        
    }

    function getUnitBreakdowns(callBack){         
        //unique list of asins        
        var unique_asins = uniqueKeys(order_data, 'asin')        
        //get the unit_breakdown for each asin in orders return        
        asinData.find({$and:[{asin:{$in:unique_asins}}, {unit_breakdown:{$ne:null}}]}, function(err, doc){
            if(err){
                callBack(err)
            }else{        
                asin_data = doc;
                callBack()
            }
        })
    }

    function combined_data(){
        //attach unit_breakdown to the corresponding order line
        for (var i = 0; i < order_data.length; i++) {
            for (var n = 0; n < asin_data.length; n++) {
                if(asin_data[n]._id === order_data[i].asin + order_data[i].vendor_code){
                    order_data[i].unit_breakdown = asin_data[n].unit_breakdown;                    
                    break
                }                
            }     
            order_data[i].unit_breakdown = order_data[i].unit_breakdown || [];       
        }

        return order_data
    }

    return{
        getOrders:getOrders,
        getUnitBreakdowns:getUnitBreakdowns,
        _return:combined_data
    }

})

var receiptsProcessor = new multiTaskHandler(function(pf_recs){
    var order_data, newRec_updates = [], orders_updates = [];

    function sortOrders(_orders){
        //sort by highest cost while also putting sets at top
        _orders.sort(function(a, b){                        
            //sort by highest cost while also putting sets at top
            var a_sort_val, b_sort_val

            b_sort_val = b.cost * b.unit_breakdown.length
            a_sort_val = a.cost * a.unit_breakdown.length

            return  b_sort_val - a_sort_val
        })
        return _orders
    }
    /*----------------Ensuring that orders_update remains correct when you have the same item multiple times when processing receipts*/
    //1. track the index of orders_update by using an array of _id
    //2. check if the order line is already in orders_update before pushing
    //3. if it's already in the array override it. 
    var recHandler = new multiTaskHandler(function(rec_line){
        var matching_orders = [];        

        function find_matching_orders(callBack){
            //record the receipt date
            rec_line.receipt_date = new Date();  
            //find matching order lines
            for (var i = 0; i < order_data.length; i++) {
                if(ops.eachesCalc(order_data[i].unit_breakdown).isMatchingSku(rec_line.pf_sku)){

                    matching_orders.push(order_data[i]);                     
                }
                
            }

            callBack();
        }

        function divvy_rec(){
            var rec_qty = rec_line.rec_qty;

            rec_line.linked_orders =[];

            for (var i = 0; i < matching_orders.length; i++) {
                var linked_order = {}, pending_eaches = matching_orders[i].pending_eaches[rec_line.pf_sku]
                if(pending_eaches > 0){                    
                    //divvy the rec qty
                    linked_order._id = matching_orders[i]._id;                
                    linked_order.assigned_eaches = (rec_qty < pending_eaches) ? rec_qty:pending_eaches; 
                    //collect linked order line data on the rec line
                    rec_line.linked_orders.push(linked_order);                   

                    //update order tracking and push it into orders_updates array
                    var eCalc = new ops.eachesCalc(matching_orders[i].unit_breakdown);
                    var assigned_eaches = {};
                    assigned_eaches[rec_line.pf_sku] = linked_order.assigned_eaches;

                    matching_orders[i].in_stock_eaches = eCalc.eaches(matching_orders[i].in_stock_eaches).add(assigned_eaches);
                    matching_orders[i].in_stock_units = eCalc.eaches().realUnits();
                    matching_orders[i].pending_eaches = eCalc.eaches(matching_orders[i].pending_eaches).subtract(assigned_eaches);
                    matching_orders[i].pending_units = eCalc.eaches().realUnits();
                    orders_updates.push(matching_orders[i]);

                    rec_qty = rec_qty - linked_order.assigned_eaches;
                    if(rec_qty === 0){break}     
                }
                              
            }

            return rec_line            
        }


        return {
            find_matching_orders:find_matching_orders,
            _return:divvy_rec
        }
    })    

    function updateOrderTracking(){
        //update order tracking
        var _ids = uniqueKeys(orders_updates, '_id');

        orders.find({_id:{"$in":_ids}}).forEach(function(err, doc){
            if(err){
                console.log(err);
            }

            if(doc){
                doc = orders_updates[_ids.indexOf(doc._id)];    
                orders.save(doc);   
            }else{
                console.log('update successful')
            } 
        });        
    }

    function insertNewWork(){
        //
    }

    function getLinkedPOs(callBack){        
        //unique list of POs
        var POs = uniqueKeys(pf_recs, 'po_number')                    
        //get combined asin and order data
        orderData.runTasks(function(err, results){
            if(err){
                callBack(err)
            }else{                
                order_data = sortOrders(results);                    
                callBack();
            }
        }, {linked_po_numbers:{$in:POs}})        
    }

    function process_new_recs(){                 
        //for each line in the pf_rec find the order line that it can fill
        //divvy the received qty
        for (var i = 0; i < pf_recs.length; i++) { 
            recHandler.runTasks(function(err, results){
                if(err){
                    console.log(err)
                }else{
                    //only collect receipts that have linked order lines
                    if(results.linked_orders.length > 0){
                        newRec_updates.push(results)    
                    }                    
                }
            }, pf_recs[i]);                      
        }

        console.log('--------end----------') 
        console.log(newRec_updates[0])
        console.log(orders_updates[0])
                         
        updateOrderTracking();        
        return newRec_updates
    }

    return{
        getLinkedPOs:getLinkedPOs,        
        _return:process_new_recs         
    }
});

 var pf_recsGetter = new multiTaskHandler(function(){
    var POs = [], new_recs, old_recs, pf_recs;

    function getPOs(callBack){
        orderData.setArgs({pending_units:{$gt:0}}).getOrders(function(err, doc){
            if(err){
                callBack(err)
            }else{                    
                //extract a list of unique POs                    
                for (var i = doc.length - 1; i >= 0; i--) {
                    for (var n = doc[i].linked_po_numbers.length - 1; n >= 0; n--) {
                        if(POs.indexOf(doc[i].linked_po_numbers[n])){
                            POs.push(doc[i].linked_po_numbers[n])
                        }                            
                    }                        
                }
                console.log('POs--------------------------')
                console.log(POs)
                callBack()                  
            }   
       }) 
    }

    function getOldRecs(callBack){
        // exclude any rec# already processed today
        var _date = new Date();
        _date.setHours(0, 0, 0, 0);

        receipts.find({receipt_date:{$gte:_date}},{receipt_number:1, _id:0}, function(err, doc){
            if(err){
                callBack(err);
            }else{
                old_recs = uniqueKeys(doc, 'receipt_number');
                console.log('old_recs---------------------------')
                console.log(old_recs)                
                callBack();
            }
        })

    }
    function get_reciepts(callBack){
        pf.getReceipts(POs, old_recs,function(results, err){
            if(err){
                callBack(err);
            }else if(results){                                            
                pf_recs = results;
                console.log('results-- length------------------------')
                console.log(results.length)
                console.log('results--------------------------')
                console.log(results[0])

                callBack()                                                                               
            }else{
                console.log('no receipts found--------------------------')
            }
        }); 
    }
    function process_recs(callBack){
        //ensure po number from pf query are strings  
        for (var i = pf_recs.length - 1; i >= 0; i--) {
            pf_recs[i].receipt_number = String(pf_recs[i].receipt_number);
            pf_recs[i].po_number = String(pf_recs[i].po_number);
        }

        receiptsProcessor.runTasks(function(err, results){
            if(err){
                callBack(err);
            }else{       
                new_recs = results;         
                callBack();
            }
        }, pf_recs)  
    }

    return{
        getPOs:getPOs,
        getOldRecs:getOldRecs,
        get_reciepts:get_reciepts,
        process_recs:process_recs,
        _return:function(){
            return new_recs
        }
    }     

}).setTasksAsync(
    ['getPOs', 'getOldRecs'], ['get_reciepts', 'process_recs']
)/*.runTasks(function(err, results){
    if(err){
        console.log(err)
    }else if(results.length>0){
        console.log('results---------------------')
        console.log(results[0])
        
        receipts.insert(results, function(err, doc){
            if(err){
                console.log(err)
            }else{
                console.log('doc[0]--------------------')
                console.log(doc[0])
            }
        })
    }
});*/

var newSKUProcessor = new multiTaskHandler(function(){
    var new_skus, sets, skus, last_check;

    function getLastCheckDate(callBack){
        console.log('------------------------getLastCheckDate--------------------------')
        aux.find({_id:"new_skus_check"}, function(err, doc){
            if(err){
                console.log(err);
            }else{                
                last_check = moment(doc[0].last_check).format("YYYY-MM-DD");                
                callBack();
            }
        })
    }

    function getNewSkus(callBack){
        console.log('------------------------getNewSkus--------------------------')
        pf.getNewSkus(last_check, function(data, err){
            if(err){
                console.log(err);
            }else if(data){
                new_skus = data;
                callBack()
            }
        }) 
    }   

    function removeExistingSkus(callBack){
        console.log('------------------------removeExistingSkus--------------------------')
        //since this check may be happening multiple time a day
        //remove any skus already in db for new_skus array
        var _skus = uniqueKeys(new_skus, 'sku');
        console.log('_skus-----------------------------')
        console.log(_skus)
        pf_skus.find({sku:{$in:_skus}}, function(err, doc){
            if(err){
                console.log(err);
            }else{
                console.log('-------------------------------------new_skus')
                console.log(new_skus)
                console.log('doc----------------------------------------')
                console.log(doc)
                if(doc.length > 0){
                    for (var i = 0; i < doc.length; i++) {
                        for (var n = 0; n < new_skus.length; n++) {
                            if(new_skus[n].sku === doc[i].sku){
                                new_skus.splice(n,1)
                                n--
                            }
                        }
                    }
                }
                
                console.log('-------------------------------------new_skus')
                console.log(new_skus)
                
                callBack();
            }
        })
    }
    function parseNewSkus(callBack){
        console.log('------------------------parseNewSkus--------------------------')
        if(new_skus.length > 0){
            for (var i = 0; i < new_skus.length; i++) {
                new_skus[i].created_date = moment(new_skus[i].created_date, 'MM-DD-YYYY')._d;                  
                new_skus[i].upcs = []; 
                new_skus[i].keywords = "";
                new_skus[i].deprecated = false;
                new_skus[i].alternative_sku = '';
            }
            callBack()
        }
    }
    
    function getSetBreakdown(callBack){
        console.log('------------------------getSetBreakdown--------------------------')
        var _skus = uniqueKeys(new_skus, 'sku');

        pf.getSetExplosion(_skus, function(data, err){
            if(err){
                console.log(err);
            }else{
                sets = data;
                callBack();
            }
        })
    }

    function combinedData(callBack){
        console.log('------------------------combinedData--------------------------')
        if (sets) {
            for (var i = 0; i < new_skus.length; i++) {  
                new_skus[i].set_breakdown = [];                
                for (var n = 0; n < sets.length; n++) {
                    if(new_skus[i].sku === sets[n].main_sku){
                        var _each = {};
                        _each.sku = sets[n].sub_sku;
                        _each.multiple = sets[n].multiple;
                        new_skus[i].set_breakdown.push(_each)                    
                    }                
                }

                if(new_skus[i].set_breakdown.length === 0){
                    new_skus[i].set_breakdown = null;
                    new_skus[i].is_set = false; 
                }else{
                    new_skus[i].is_set = true;   
                }
            }
        }
        callBack()
    }

    function insertNewSKUs(callBack){
        console.log('------------------------insertNewSKUs--------------------------')
        console.log('-------------------------------------new_skus')
        console.log(new_skus)

        pf_skus.insert(new_skus, function(err, doc){
            if(err){
                console.log(err);
            }else{
                console.log(doc[0]);
                callBack()
            }
        })
    }

    function setLastCheckDate(callBack){
        console.log('------------------------setLastCheckDate--------------------------')
        aux.findAndModify({
            query:{_id:"new_skus_check"},
            update:{$set:{last_check:moment()._d}}
        }, function(err, doc){
            if(err){
                console.log(err)
            }else{
                console.log(doc)
                callBack()
            }
        })
    }

    return {
       getLastCheckDate:getLastCheckDate,
       getNewSkus:getNewSkus,
       removeExistingSkus:removeExistingSkus,
       parseNewSkus:parseNewSkus,
       getSetBreakdown:getSetBreakdown,
       combinedData:combinedData,
       insertNewSKUs:insertNewSKUs,
       setLastCheckDate:setLastCheckDate

    }
}).runTasks(function(err, results){
    if(err){
        console.log(err)
    }else{
        console.log('kjlsdkjlsjf')
    }
})
    

var sysCheckService = new multiTaskHandler(function(){
    var sysUpdate = [];  
    function asinDataCheck(callBack){
        asinData.find({unit_breakdown:null}).count(function(err, count){
            if(err){
                callBack(err);
                 
            }else{
                var results;  
                if(count > 0){                    
                   sysUpdate.push(count + ' new ASIN(s) missing critical data needed to process Orders!');
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
                sysUpdate.push(data.length + ' untouched receipt(s)!!!');
                callBack();
            }
        })
    }

    function insertData(callBack){
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
                callBack(null, doc.notifications);
            }
        })
    }    

    return {
        asinDataCheck:asinDataCheck,
        newReceiptsCheck:newReceiptsCheck,            
        insertData:insertData,
        getUpdate:getUpdate         
    }
})
/*
sysCheckService.setTasks([
    'asinDataCheck', 
    'insertData'
]).createSubscription(300).run(function(err, results){
    if(err){
        console.log(err)
    }else{
        console.log(results)
    }
})*/


exports.sysCheckService = sysCheckService

exports.getDownload = function(_id, callBack){
    aux.findOne({_id:mongo.ObjectId(_id)}, function(err, doc){
        if(err){
            callBack(null ,err);
        }else{          
            callBack(doc);
            //aux.remove({_id:mongo.ObjectId(_id)});
        }
    })
}


exports.setSkuEditor = function(data, callBack){


    for (var i = 0; i < data.length; i++) {
        data[i].created_date = moment(data[i].created_date).format("M/D/YY");
        data[i].id = data[i]._id

        for (var n = 0; n <= 9; n++) {
            if(data[i].upcs[n]){
               data[i]['upc' + (n + 1)] = data[i].upcs[n]; 
            }else{
                data[i]['upc' + (n + 1)] = '' 
            }
        }
    }


    var xlsx = json2xls(data); 

    fs.writeFile(temp + 'sku_editor_data.xlsx', xlsx, 'binary', function(err, fd){
        if(err){
            callBack(err);
        }else{

            aux_fns.setData('sku_line_editor', function(data, err){
                if(err){
                    callBack(null, err);
                }else{
                    callBack();
                }
            });            
        }
    })

}
exports.setOrderLineEditor = function(data, callBack){
    console.log('here')


    for (var i = 0; i < data.length; i++) {
        //remove all unneeded fields
        delete data[i].pending_eaches;
        delete data[i].in_stock_eaches;
        delete data[i].in_job_eaches;
        delete data[i].boxed_eaches;
        delete data[i].canceled_eaches;        
        delete data[i].selected;
        //overwrite all date with strings
        data[i].earliest_ship_date =  moment(data[i].earliest_ship_date).format("M/D/YY");
        data[i].latest_ship_date =  moment(data[i].latest_ship_date).format("M/D/YY");
        data[i].expected_ship_date =  moment(data[i].expected_ship_date).format("M/D/YY");
        data[i].order_date =  moment(data[i].order_date).format("M/D/YY");
        data[i].id = data[i]._id
        
        //write each PO number to its own property
        for (var n = 0; n <= 9; n++) {
            if(data[i].linked_po_numbers[n]){
                data[i]['PO' + (n + 1)] = data[i].linked_po_numbers[n];
            }else{
                data[i]['PO' + (n + 1)] = "";
            }
        }
        data[i].linked_po_numbers = "";
    }

    var xlsx = json2xls(data); 

    fs.writeFile(temp + 'order_editor_data.xlsx', xlsx, 'binary', function(err, fd){
        if(err){
            callBack(err);
        }else{

            aux_fns.setData('order_line_editor', function(data, err){
                if(err){
                    callBack(null, err);
                }else{
                    callBack();
                }
            });            
        }
    })
           
}
//-------------------return the requested collection---------------------
exports.collection = function (collName){       
    //the client has to choose a correct collection name
    //if the client was allowed send any collection name it would be albe to dynamically create collections which would lead to errors
    switch (collName){
        case 'orders':
           return orders;
        case 'aux':
           return aux;
        case 'asinData':
           return asinData; 
        case 'receipts':
           return receipts;                         
        case 'pf_skus':
           return pf_skus;                         
        default:  
            return null;
    }
}

function logRequest(request, callBack){
    //ensure the request already has _id
    if (!(request._id)){
        error = {
            code:-1,
            errMsg:'VC request object _id required'
        }
        callBack(error);
        return false
    }

    //stringify the request.mongoQuery to avoid errors when inserting fields that begin wiht $
    request.mongoQuery = JSON.stringify(request.mongoQuery);
    //console.log(request)

    //all db requests are logged, then prepped. Duplicate request will return err
    request_log.insert(request, function(err, doc){
        if(err){        
            callBack(err);
            //console.log(err);
        }else{
            //convert the mongoQuery back into json
            request.mongoQuery = JSON.parse(request.mongoQuery)            
            callBack();
            //console.log(request);
        }
    })

}
//logs the request (ensuring no dub request) and parse _id
exports.processRequest = function(req, mainCallback){
	var request = req.body;

	function parse_id(query, callBack){
	    if(query.find){
	        if(query.find._id){
	            if(query.find._id.$in){
	                for (var n = 0; n < query.find._id.$in.length; n++) {
	                    query.find._id.$in[n] = mongo.ObjectId(query.find._id.$in[n])
	                }
	            }else{
	                query.find._id  = mongo.ObjectId(query.find._id)
	            }
	        }
	    }

	    if (typeof callBack === 'function') {
	        callBack(query)
	    }else{
	        return query
	    }        
	}	

	logRequest(request, function(err){
		if(err){           
            console.log(err);
			mainCallback(err);
		}else{
			//parse_id(request.mongoQuery, function(){
				mainCallback();
			//})			
		}
	})
}
