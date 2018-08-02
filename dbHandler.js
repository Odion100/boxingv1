//this file is a wrapper for my database adding logging, excel file processing, error handling, and more functionalities

//db tables
const mongo = require("mongojs");
const request_log = mongo("VC_OPS", ['request_log']).request_log;
const aux = mongo("VC_OPS", ['aux']).aux;

const orders = mongo("VC_OPS", ['orders']).orders;
const asinData = mongo("VC_OPS", ['asinData']).asinData;
const receipts = mongo("VC_OPS", ['receipts']).receipts;
const pf_skus = mongo("VC_OPS", ['pf_skus']).pf_skus;
const boxes = mongo("VC_OPS", ['boxes']).boxes;
const users = mongo("VC_OPS", ['users']).users;
const reports = mongo("VC_OPS", ['reports']).reports;
const vendor_codes = mongo("VC_OPS", ['vendor_codes']).vendor_codes;


//project libraries
const aux_fns = require('./vbs_operations').aux_fns;
const pf = require('./vbs_operations').pointForceQueries
const xlToJson = require('./xlToJson');
const eachesCalc = require('./$$OPS').eachesCalc;
const multiTaskHandler = require('./tasks').multiTaskHandler;
const obj = require('./tasks').obj;
const accounting = require('accounting');
const fs = require('fs');
const json2xls = require('json2xls');
const moment = require('moment');

const cwd = process.cwd()
const temp =  cwd + '\\temp\\';

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
function sumOfKeys(arr, key){
    var sum = 0; 

    for (var i = 0; i < arr.length; i++) {
        var num = arr[i][key]; 
        num = (isNaN(num))? 0:num; 
        sum = sum + num 
    } 
    return sum 
}

function combineAndSumByKey(arr, key, keysToSum){
    var results = [], indexHolder = [], index; 
    keysToSum = keysToSum || Object.getOwnPropertyNames(arr[0])

    for (var i = 0; i < arr.length; i++) {
        index = indexHolder.indexOf(arr[i][key])
        
        if(index === -1){
            
            indexHolder.push(arr[i][key])
            results.push(cloneKeys(arr[i]));            
        }else{            
            
            for (var n = 0; n < keysToSum.length; n++) {
                results[index][keysToSum[n]] += arr[i][keysToSum[n]]; 
            }            
        }

    } 
    return results 
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

function leadingZeros (num, zeros){
    num = (typeof num === 'number') ? num.toString() : num;

    for (var i = num.length; i < zeros; i++) {
        num =  "0" + num 
    };

    return num
}

//combined orders data with asinData unit_breakdonw for a given query to orders collection
var orderQuery = new multiTaskHandler(function(orders_query, _orders){
    var order_data, asin_data, sku_data;

    function getOrders(nextTask){
        //follow allow you to optionaly pass orders or query
        if(orders_query){            
            orders.find(orders_query, function(err, doc){            
                if(err){
                    nextTask(err)
                }else{                                                                               
                    order_data = doc;                                        
                    nextTask(err, doc);                
                }
            })
        }else{
            order_data = _orders;
            nextTask();
        }
        
    }

    function getAsins(nextTask){         
        //unique list of asins        
        var unique_asins = uniqueKeys(order_data, 'asin')        
        //get the asin for each order
        asinData.find({$and:[{asin:{$in:unique_asins}}, /*{unit_breakdown:{$ne:null}}*/]}, function(err, doc){
            if(err){
                nextTask(err)
            }else{        
                asin_data = doc;                
                nextTask()                
            }
        })
    }

    function getUnitBreakdowns(nextTask){
        //unique list of skus        
        var unique_skus = uniqueKeys(asin_data, 'pf_sku')        
        //get the set_breakdown for each asin pf_skus
        pf_skus.find({sku:{$in:unique_skus}}, function(err, doc){
            if(err){
                nextTask(err)
            }else{        
                sku_data = doc;
                nextTask()            
            }
        })   
    }

    function combined_data(){
        var skip = false;
        //attach unit_breakdown to the corresponding order line
        for (var i = 0; i < order_data.length; i++) {
            for (var n = 0; n < asin_data.length; n++) {
                if(asin_data[n]._id === order_data[i].asin + order_data[i].vendor_code){
                    for (var a = 0; a < sku_data.length; a++) {
                        if(sku_data[a].sku === asin_data[n].pf_sku){                           
                            skip = true
                            order_data[i].pf_sku = sku_data[a].sku;
                            order_data[i].item_weight = sku_data[a].weight;

                            if(sku_data[a].is_set){
                                order_data[i].unit_breakdown = sku_data[a].set_breakdown;
                            }else{
                                order_data[i].unit_breakdown = [{
                                    sku:asin_data[n].pf_sku,
                                    multiple:asin_data[n].multiple
                                }]
                            }

                            order_data[i]._skus = eachesCalc(order_data[i].unit_breakdown).toSKU();
                            break
                        }
                    }
                    if (skip) {skip = false;break}
                }                
            }     
            //order_data[i].unit_breakdown = order_data[i].unit_breakdown || [];       
        }

        return order_data
    }

    return{
        getOrders:getOrders,
        getAsins:getAsins,
        getUnitBreakdowns:getUnitBreakdowns,
        _return:combined_data
    }

})

/*orderQuery.runTasks(function(err, results){
    console.log('results---------------------------')
    console.log(results)
}, {asin:'B011GVZW4A'})*/
//data fields to parse and vaildations configs when converting excel files
orders.vaildations = {
    dates:['earliest_ship_date', 'latest_ship_date', 'expected_ship_date', 'order_date'],
    numbers:['cost', 'units_confirmed'],
    booleans:[],
    json:[], 
    object_id:[],
    tests:[
        {
            propertyName:'units_confirmed',
            isValid:function(value, json){
                json._id = json.amazon_po + json.asin;
                json.edi_transfer_status = 0;
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
                throw 'Error @ orders.vaildations.after';
            }else{     
                console.log(results[0])                                    
                callBack(results);
            }
       }, json)
    }
}

pf_skus.vaildations = {
    dates:[],
    numbers:['weight'],
    booleans:[],
    json:['upcs'], 
    object_id:[],
    tests:[],

    before:function(json){
        //hack for allowing null on update
        json.forEach(function(data){
            data.deprecated = data.deprecated || false; 
        })
        //first two object are field names from the upload template
        json.splice(0, 2);  
    },

    after:undefined
}

asinData.vaildations = {
    dates:[],
    numbers:['case_quantity', 'multiple'],
    booleans:['labels_required'],
    json:[], 
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

aux.vaildations = {
    dates:[],
    numbers:[],
    booleans:[],
    json:[], 
    object_id:[],
    tests:[],

    before:function(json){
  
    },

    /*after:function(json, callBack){

    }*/        
}
    
function setXlHandler(coll, updateFields, insert_cb, update_cb){    

    coll.xlFileHandler = new multiTaskHandler(function(file){
        var new_json;

        function convertToJson(nextTask){                            
           xlToJson.convert(file, coll.vaildations, function(err, json){
                if(err){
                   nextTask(err);
                   
                }else{
                    
                    new_json = json;                        
                    nextTask();                
                }                
           })               
        }

        function insert(nextTask){              
            if(new_json.length === 0){
                nextTask(null, new_json)
                return false
            }

            coll.insert(new_json, function(err, doc){
                if(err){
                    console.log(err)
                    var error = err.toJSON()

                    if (err.code === 11000){                    
                        error.errMsg = 'Duplicate line at the following _id: \n\n' + error.op._id + '.\n\n All following lines were not inserted.'
                    }
                    nextTask(err);                                
                }else{
                    nextTask(null, {status:'successful',data:doc});
                    if(typeof insert_cb === 'function'){insert_cb(doc)}  
                }
            })
        }

        function update(nextTask){            
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
                
                if(err){
                    nextTask(err)
                }

                if(doc){
                    var _id = (doc._id.toString) ? doc._id.toString():doc._id    
                   // var replaceData = new_json[indexHolder.indexOf(_id)];
                    var replaceData = findByKey(new_json, '_id', _id)[0]

                    for (var i = 0; i < updateFields.length; i++) {
                        doc[updateFields[i]] = replaceData[updateFields[i]]
                    }
                    
                    coll.save(doc);   
                }else{
                    nextTask(null, {status:'update successful'});
                    if(typeof update_cb === 'function'){update_cb(new_json)} 
                }  
                             
            })
        }

        return{
            convertToJson:convertToJson,
            insert:insert,
            update:update 
        }
    })
}

new setXlHandler(aux);

new setXlHandler(orders, [
  /*  'title', 
    'cost', 
    'earliest_ship_date', 
    'latest_ship_date', 
    'expected_ship_date', 
    'availablity_status', 
    'vendor_code',     
    'order_date', */
    'fulfillment_center', 
    'note'
]);
new setXlHandler(pf_skus, [    
    'deprecated',
    'alternative_sku',
    'upcs',
    'weight',
], skuUPdate_cb, skuUPdate_cb);

new setXlHandler(asinData, [
    'asin',
    'vendor_code',
    'case_quantity',
    'title',
    'category',
    'labels_required',
    'prep_instructions',
    'image_url',
    'pf_sku',
    'multiple'
], asinUpdate_cb, asinUpdate_cb);
new setXlHandler(receipts, []);


function asinUpdate_cb(doc){
    console.log(updateNullEaches)
    updateNullEaches.runTasks(function(){

    })    
}

/*var correctEaches = new multiTaskHandler(function(asin_data){
    var order_data = [], _skus = [];
    function getAsins(nextTask){
        var unique_asins = uniqueKeys(asin_data, 'asin');

        orderQuery.runTasks(function(err, results){
            if(err){
                console.log(err);
                nextTask(err);                
            }else{
                order_data = results;                
                nextTask();                
            }
        }, {asin:{$in:unique_asins}})
    }

    function getSkus(nextTask){
        var unique_ids = uniqueKeys(order_data, 'pf_sku');

        pf_skus.find({_id:{$in:unique_ids}}, function(err, doc){
            if(err){
                nextTask(err);
            }else{
                _skus = doc;
                nextTask();
            }
        })
    }

    function convertAndSave(nextTask){
        order_data.forEach(function(asin){
            sku = findByKey(_skus, '_id', asin.pf_sku)[0];


        })
    }

    return {
        getAsins:getAsins,
        getSkus:getSkus,
        convertAndSave:convertAndSave
    }
})*/
function skuUPdate_cb(skus){
    update_Sets.runTasks(function(){

    }, skus)
}

var update_Sets = new multiTaskHandler(function(skus){
    var setSkus, unique_skus

    function getSets(nextTask){
        console.log('getSets---------------------')
        unique_skus = obj(skus).uniqueKeys('_id')
        pf_skus.find({"set_breakdown.sku":{$in:unique_skus}}, function(err, doc){
            if(err){
                console.log(err);
                nextTask(err);
            }else{
                setSkus = doc;
                nextTask();
            }
        })
    }

    function saveWeights(nextTask){
        console.log('saveWeights---------------------')
        for (var i = 0; i < setSkus.length; i++) {
            for (var n = 0; n < setSkus[i].set_breakdown.length; n++) {                
                var index = unique_skus.indexOf(setSkus[i].sku)        

                if(index > -1){
                    setSkus[i].set_breakdown[n].weight = skus[index].weight || 0;    
                }                                
            }
            pf_skus.save(setSkus[i]);
        }

        nextTask();
    }

    return {
        getSets:getSets,
        saveWeights:saveWeights
    }
})

var updateNullEaches = new multiTaskHandler(function(){
    var order_data

    function getNulls(nextTask){
        
        orderQuery.runTasks(function(err, results){
            if(err){
                console.log(err);
                nextTask(err);                
            }else{
                order_data = results;
                
                nextTask()                
            }
        }, {unit_breakdown:null})
    }

    function updateNulls(nextTask){        
        ordersProcessor.updateOrderTracking(function(err, new_orders){                
            if(err){

            }else{
                for (var i = 0; i < new_orders.length; i++) {
                    orders.save(new_orders[i]);
                }    
            }            
        }, order_data)
    }

    return {
        getNulls:getNulls,
        updateNulls:updateNulls
    }

})
updateNullEaches.runTasks(function(){})

var ordersProcessor = new multiTaskHandler(function(new_orders){
    var asins = [], new_asinsData = [];

    function getUnitBreakdowns(nextTask){            
        //create a unique list of asins
        var unique_asins = uniqueKeys(new_orders, 'asin')
        
        orderQuery.runTasks(function(err, results){
            if(err){
                nextTask(err);
            }else{
                nextTask()
            }
        }, null, new_orders);
    }

    function updateOrderTracking(nextTask, _orders){        
        new_orders = new_orders || _orders
            
        //for each order line use the unit_breakdown and eachesCalc to fill in order tracking data
        for (var i = 0; i < new_orders.length; i++) {            
            
            //calculate and save order week range as string
            if(moment(new_orders[i].order_date).day() === 6){
                startDate = moment(new_orders[i].order_date);
            }else{    
                startDate = moment(new_orders[i].order_date).startOf('week').subtract(1, "days")
            }
            
            new_orders[i].order_week = startDate.format("M/D/YY") + ' to ' + startDate.add(6, 'days').format("M/D/YY");


            //set the default value for order tracking data            
            new_orders[i].pending_units = new_orders[i].units_confirmed;            
            new_orders[i].in_stock_units = 0;            
            new_orders[i].in_job_units = 0;            
            new_orders[i].boxed_units = 0;            
            new_orders[i].canceled_units = 0;
                                            
            if (new_orders[i].unit_breakdown){
                //fill out the order tracking data;  
                var calc = eachesCalc(new_orders[i].unit_breakdown);

                new_orders[i].pending_eaches = calc.units(new_orders[i].units_confirmed).toEaches();                                                            
                new_orders[i].in_stock_eaches = calc.units(0).toEaches();                                  
                //new_orders[i].canceled_eaches = calc.units(0).toEaches();                                                  
            }                                    
        }            

        nextTask(null, new_orders);
    }
    
    return{
        getUnitBreakdowns:getUnitBreakdowns,
        updateOrderTracking:updateOrderTracking,        
        _return:function(){
            return new_orders
        }  
    }
})

var receiptsProcessor = new multiTaskHandler(function(pf_recs){
    var po_numbers = [], rec_groups = [], po_link_reports, _orders;

    function getPOsReport(nextTask){
        var po_numbers = uniqueKeys(pf_recs, 'po_number');

        reports.find({$and:[{linked_po_numbers:{$in:po_numbers}}, {report_name:'Linked POs Report'}]}, {linked_po_numbers:1, order_week:1}, function(err, doc){
            if(err){
                console.log(err);
                nextTask(err);
            }else{
                po_link_reports = doc;
                nextTask()
            }
        })
    }

    function getMatchingOrders(nextTask){
        //get a unique list of order weeks from reports
        var order_weeks = uniqueKeys(po_link_reports, 'order_week');

        orderQuery.runTasks(function(err, results){
            if(err){
                nextTask(err)
            }else{
                _orders = results;
                nextTask();
            }
        }, {order_week:{$in:order_weeks}})
    }

    //split receipts by po_numbers so each group can be processed seperately
    function divvy_rec(){
        var orders_updates = [];
        for (var i = 0; i < pf_recs.length; i++) {            
            var rec_line = pf_recs[i];
            var matching_orders = findMatchingOrders(rec_line);
            //because this code also deals with receipts that are being looked at for a second time these fields may already exist on the rec obj
            rec_line.receipt_date = rec_line.receipt_date || moment()._d;
            rec_line.linked_orders = rec_line.linked_orders || [];
            rec_line.unused_qty = rec_line.unused_qty || pf_recs[i].rec_qty;
            //for each rec_line find maching order lines and divvy the rec_line.unused_qty among them
            for (var n = 0; n < matching_orders.length; n++) {                
                var linked_order = {}, pending_eaches = matching_orders[n].pending_eaches[rec_line.pf_sku]

                if(pending_eaches > 0){                    
                    //use linked_order to record the receipt allocation
                    linked_order._id = matching_orders[n]._id;
                    linked_order.asin = matching_orders[n].asin;
                    linked_order.amazon_po = matching_orders[n].amazon_po;                
                    //divvy the rec qty
                    linked_order.assigned_eaches = (rec_line.unused_qty < pending_eaches) ? rec_line.unused_qty:pending_eaches; 
                    //collect linked order line data on the rec line
                    rec_line.linked_orders.push(linked_order);                   

                    //update order tracking and push it into orders_updates array
                    var eCalc = new eachesCalc(matching_orders[n].unit_breakdown);
                    var assigned_eaches = {};
                    assigned_eaches[rec_line.pf_sku] = linked_order.assigned_eaches;

                    matching_orders[n].in_stock_eaches = eCalc.eaches(matching_orders[n].in_stock_eaches).add(assigned_eaches);
                    matching_orders[n].in_stock_units = eCalc.eaches().realUnits();                    
                    matching_orders[n].pending_eaches = eCalc.eaches(matching_orders[n].pending_eaches).subtract(assigned_eaches);
                    matching_orders[n].pending_units = eCalc.eaches().realUnits();
                    //save the order line with pending and instock quantities updated
                    /*console.log('matching_orders[n]----------------------------')
                    console.log(matching_orders[n])

                    console.log('pf_recs[i]----------------------------')
                    console.log(pf_recs[i])*/
                                        
                    //orders_updates.push(matching_orders[n]);
                    orders.save(matching_orders[n])
                    rec_line.unused_qty = rec_line.unused_qty - linked_order.assigned_eaches;
                    if(rec_line.unused_qty === 0){break}     
                }
            }
            receipts.save(rec_line);
        }
        //updateOrders(orders_updates)
        //return the updated recs with the added linked_orders
        return pf_recs
    }    

    function updateOrders(orders_updates){
        //update order tracking        
        var _ids = uniqueKeys(orders_updates, '_id');

        orders.find({_id:{"$in":_ids}}).forEach(function(err, doc){
            if(err){
                console.log(err);
            }

            if(doc){
                //user _ids as and index to the correct doc
                doc = orders_updates[_ids.indexOf(doc._id)];    
                orders.save(doc);   
            }else{
                console.log('update successful')
            } 
        });
    }
    function findMatchingOrders(rec_line){
        //return a sub set of orders that match the receipt line by the following two criteria
        //rec_line's po_number must correspond to the order week of the order lines based on the linked POs report
        //rec_line's sku must match with the unit breakdown on the order line
        var matching_orders = [];
    
        //first get the recs linked orders by po_number (a subset of orders that match that week)
        var order_week = orderWeekByPO(rec_line.po_number);        
        var order_data = findByKey(_orders, 'order_week', order_week, true);

        //then collect and return subset of orders that match the sku on the receipts
        for (var i = 0; i < order_data.length; i++) {
            if(eachesCalc(order_data[i].unit_breakdown).isMatchingSku(rec_line.pf_sku)){
                matching_orders.push(order_data[i]);
            }
        }
         
        //sort orders by earliest expected shipdate
        matching_orders.sort(function(order_a, order_b){
            if(moment(order_a.expected_ship_date).isBefore(order_b.expected_ship_date)){
                return -1
            }else{
                return 1
            }
        })

        //matching_orders should now be the correct orders to activate for this rec line
        return matching_orders
    }

    function orderWeekByPO(po_number){
        var order_week = '';

        //search through the linked pos report for a matching order week by po number
        for (var i = 0; i < po_link_reports.length; i++) {
            if(po_link_reports[i].linked_po_numbers.indexOf(po_number) > -1){
                order_week = po_link_reports[i].order_week;
                break
            }
        }

        return order_week
    }

    return{
        getPOsReport:getPOsReport,
        getMatchingOrders:getMatchingOrders,
        _return:divvy_rec
    }
})

 var receiptHandler = new multiTaskHandler(function(){

    var POs = [], new_recs, processed_recs, pf_recs = [];
    //get already processed receipt number for the day so they can be filtered out in query
    function getProcessedRec(nextTask){
        // exclude any rec# already processed today
        var _date = moment(new Date().setHours(0, 0, 0, 0))._d        

        receipts.distinct('receipt_number', {receipt_date:{$gte:_date}}, function(err, doc){
            if(err){
                nextTask(err);
            }else{
                processed_recs = doc
                console.log('processed_recs---------------------------')
                console.log(processed_recs)                
                nextTask();
            }
        })

    }

    function getReciepts(nextTask){
        pf.getReceipts(processed_recs, function(results, err){
            if(err){
                nextTask(err);
            }else if(results){                                            
                pf_recs = results;
                console.log('results-- length------------------------')
                console.log(results.length)
                console.log('results--------------------------')
                console.log(results[0])

                nextTask()                                                                               
            }else{
                console.log('no receipts found--------------------------')
            }
        }); 
    }
    
    function process_recs(nextTask){
        if(pf_recs.length > 0){
            receiptsProcessor.runTasks(function(err, results){
                if(err){
                    nextTask(err);
                }else{       
                    new_recs = results;         
                    nextTask();
                }
            }, pf_recs)  
        }else{
            nextTask()
        }            
    }

    function getUnusedReceipts(nextTask){
        var week_ago = moment().subtract(1, 'week')._d;
        receipts.find({$and:[{unused_qty:{$gt:0}}, {receipt_date:{$gt:week_ago}}]}, function(err, doc){
             if(err){
                nextTask(err);
            }else{       
                pf_recs = doc;
                console.log('---------------------------------------------------------------getUnusedReceipts')
                console.log(doc.length)
                nextTask();
            }
        })
    }

    return{        
        getProcessedRec:getProcessedRec,
        getReciepts:getReciepts,
        process_recs:process_recs,
        getUnusedReceipts:getUnusedReceipts,
        _return:function(){
            return new_recs
        }
    }     

});
 //search for and process new receipts from point force
/*receiptHandler
.setTasks(['getProcessedRec', 'getReciepts', 'process_recs',])
.createSubscription(60000)
.run(function(err, results){
    if(err){
        console.log(err)
    }else{ 
        console.log(results);   
    }
});*/
//search for and reprocess any unused receipts in system
var recReprocessor = receiptHandler.setTasks(['getUnusedReceipts', 'process_recs'])

var newSKUProcessor = new multiTaskHandler(function(){
    var new_skus, sets, skus, last_check, vendorData = [];

    function getLastCheckDate(nextTask){
        console.log('------------------------getLastCheckDate--------------------------')
        aux.find({_id:"new_skus_check"}, function(err, doc){
            if(err){
                console.log(err);
            }else{  
                console.log(doc[0])              
                last_check = (doc[0])?moment(doc[0].last_check).subtract(8, 'days').format("YYYY-MM-DD"): moment().format("YYYY-MM-DD");                
                nextTask();
            }
        })
    }

    function getNewSkus(nextTask){
        console.log('------------------------getNewSkus--------------------------')
        pf.getNewSkus(last_check, function(data, err){
            if(err){
                console.log(err);
            }else if(data){
                new_skus = data;
                                
                nextTask()
            }
        }) 
    }   

    function removeExistingSkus(nextTask){
        console.log('------------------------removeExistingSkus--------------------------')
        console.log(new_skus.length)
        //since this check may be happening multiple time a day
        //remove any skus already in db for new_skus array
        var o = new obj(new_skus)
        var _skus = o.uniqueKeys('sku');
        
        if(_skus.length != new_skus.length){
            new_skus = o.uniqueDocs
            console.log(new_skus.length)
        }
        //console.log('_skus-----------------------------')
        //console.log(_skus)
        pf_skus.find({sku:{$in:_skus}}, function(err, doc){
            if(err){
                console.log(err);
            }else{
                //console.log('-------------------------------------new_skus')
                //console.log(new_skus)
                //console.log('doc----------------------------------------')
                //console.log(doc)
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
                
                //console.log('-------------------------------------new_skus')
                //console.log(new_skus)
                console.log(new_skus.length)                
                nextTask();
            }
        })
    }
    function parseNewSkus(nextTask){
        console.log('------------------------parseNewSkus--------------------------')
        console.log(new_skus.length)
        if(new_skus.length > 0){
            for (var i = 0; i < new_skus.length; i++) {
                new_skus[i].created_date = moment(new_skus[i].created_date, 'MM-DD-YYYY')._d;                  
                new_skus[i].upcs = []; 
                new_skus[i].keywords = "";
                new_skus[i].deprecated = false;
                new_skus[i].weight = 0;
                new_skus[i].alternative_sku = '';                
                new_skus[i]._id = new_skus[i].sku + ''; 
            }
            nextTask()
        }else{
            setLastCheckDate()
        }
    }
    
    function getSetBreakdown(nextTask){
        console.log('------------------------getSetBreakdown--------------------------')
        var _skus = uniqueKeys(new_skus, 'sku');

        pf.getSetExplosion(_skus, function(data, err){
            if(err){
                nextTask(err);
            }else{
                
                sets = data;
                nextTask();
            }
        })
    }

    function getSupplierData(nextTask){
        console.log('------------------------getSupplierData--------------------------')
        var _skus = uniqueKeys(new_skus, 'sku');

        pf.getSupplerSkus(_skus, function(results, err){
            if(err){
                nextTask(err);
            }else{
                new_skus.forEach(function(sku){
                    var vendorData = findByKey(results, 'pf_sku', sku.sku, true)
                    sku.vendor_codes = uniqueKeys(vendorData, 'vendor_code')
                    sku.vendor_skus = uniqueKeys(vendorData, 'vendor_sku')
                })
                nextTask();
            }
        })   
    }
    function combinedData(nextTask){
        console.log('------------------------combinedData--------------------------')
        if (sets) {
            for (var i = 0; i < new_skus.length; i++) {  
                new_skus[i].set_breakdown = [];                
                for (var n = 0; n < sets.length; n++) {
                    if(new_skus[i].sku === sets[n].main_sku){
                        var _each = {};
                        _each.sku = sets[n].sub_sku + '';
                        _each.multiple = sets[n].multiple;
                        _each.weight = 0;
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
        nextTask()
    }

    function insertNewSKUs(nextTask){
        console.log('------------------------insertNewSKUs--------------------------')
        //console.log('-------------------------------------new_skus')
        //console.log(new_skus)

        pf_skus.insert(new_skus, function(err, doc){
            if(err){
                console.log(err);
            }else{
                //console.log(doc[0]);
                nextTask()
            }
        })
    }

    function setLastCheckDate(nextTask){
        console.log('------------------------setLastCheckDate--------------------------')
        aux.save({_id:"new_skus_check", last_check:moment()._d}, 
        function(err, doc){
            if(err){
                console.log(err)
            }else{
                //console.log(doc)
                if(typeof nextTask === 'function'){nextTask()}
            }
        })
    }

    return {
       getLastCheckDate:getLastCheckDate,
       getNewSkus:getNewSkus,
       removeExistingSkus:removeExistingSkus,
       parseNewSkus:parseNewSkus,
       getSetBreakdown:getSetBreakdown,
       getSupplierData:getSupplierData,
       combinedData:combinedData,
       insertNewSKUs:insertNewSKUs,
       setLastCheckDate:setLastCheckDate

    }
})
newSKUProcessor.runTasks(function(err, results){
    if(err){
        console.log(err)
        console.log('err-----------newSKUProcessor')
    }else{
        console.log('kjlsdkjlsjf')
    }
})
newSKUProcessor
/*.createSubscription(43200)
.run(function(err, results){
    if(err){
        console.log(err)
    }else{
        console.log('successful new sku check')
    }
})*/
    

var sysCheckService = new multiTaskHandler(function(){
    var sysUpdate = [];  
    function asinDataCheck(nextTask){
        asinData.find({unit_breakdown:null}).count(function(err, count){
            if(err){
                nextTask(err);
                 
            }else{
                var results;  
                if(count > 0){                    
                   sysUpdate.push(count + ' new ASIN(s) missing critical data needed to process Orders!');
                }
                
                nextTask();
            }
        })            
    }
    function newReceiptsCheck(nextTask){            
        pf.getPOs(['128664'], function(data, err){
            if(err){
                nextTask(err);
            }else{
                sysUpdate.push(data.length + ' untouched receipt(s)!!!');
                nextTask();
            }
        })
    }

    function insertData(nextTask){
        aux.update({_id:'sys_check_service'}, {notifications:sysUpdate}, {upsert:true}, function(err, doc){
            if(err){
                nextTask(err);
            }else{
                nextTask();
            }
        })
    }
    
    function getUpdate(nextTask){
        aux.findOne({_id:'sys_check_service'}, function(err, doc){
            if(err){
                nextTask(err);
            }else{
                nextTask(null, doc.notifications);
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

function setSkuEditor(data, callBack){


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
        data[i].upcs = null;
        data[i].vendor_codes = null;
        data[i].vendor_skus = null;

    }


    var xlsx = json2xls(data); 

    fs.writeFile(temp + 'sku_editor_data.xlsx', xlsx, 'binary', function(err, fd){
        if(err){
            callBack(err);
            console.log(err);
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
function setAsinDataEditor(data, callBack){
     
    data.forEach(function(asin){
        asin.id = asin._id;
    })
    
    var xlsx = json2xls(data);

    fs.writeFile(temp + 'asin_editor_data.xlsx', xlsx, 'binary', function(err, fd){
        if(err){
            callBack(err);
            console.log(err);
        }else{

            aux_fns.setData('asin_editor_data', function(data, err){
                if(err){
                    callBack(null, err);
                }else{
                    callBack();
                }
            });            
        }
    })
}
exports.setSkuEditor = setSkuEditor; 

exports.setOrderLineEditor = function(data, callBack){

    for (var i = 0; i < data.length; i++) {
        //remove all unneeded fields
        delete data[i].pending_eaches;
        delete data[i].in_stock_eaches;        
        delete data[i].canceled_eaches;        
        delete data[i].selected;
        //overwrite all date with strings
        data[i].earliest_ship_date =  moment(data[i].earliest_ship_date).format("M/D/YY");
        data[i].latest_ship_date =  moment(data[i].latest_ship_date).format("M/D/YY");
        data[i].expected_ship_date =  moment(data[i].expected_ship_date).format("M/D/YY");
        data[i].order_date =  moment(data[i].order_date).format("M/D/YY");
        data[i].id = data[i]._id
        
        /*//write each PO number to its own property
        for (var n = 0; n <= 9; n++) {
            if(data[i].linked_po_numbers[n]){
                data[i]['PO' + (n + 1)] = data[i].linked_po_numbers[n];
            }else{
                data[i]['PO' + (n + 1)] = "";
            }
        }
        data[i].linked_po_numbers = "";*/
    }

    var xlsx = json2xls(data); 

    fs.writeFile(temp + 'order_editor_data.xlsx', xlsx, 'binary', function(err, fd){
        if(err){
            callBack(err);
        }else{

            aux_fns.setData('order_line_editor', function(data, err){
                if(err){
                    callBack(err);
                }else{
                    callBack();
                }
            });            
        }
    })
           
}
//-------------------return the requested collection---------------------
function collection(collName){       
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
        case 'boxes':
           return boxes; 
        case 'users':
           return users;                         
        case 'reports':
           return reports;  
        default:  
            return null;
    }
}

exports.collection = collection 

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
        }else if(query.find.$or){
            for (var n = 0; n < query.find.$or.length; n++) {
                if (query.find.$or[n]._id) {
                    query.find.$or[n]._id = mongo.ObjectId(query.find.$or[n]._id)
                }                        
            }
        }
    }

    if (typeof callBack === 'function') {
        callBack(query)
    }else{
        return query
    }        
}
//logs the request (ensuring no dub request) and parse _id
exports.validateRequest = function(req, mainCallback){
	var request = req.body;
	
	logRequest(request, function(err){
		if(err){           
            console.log(err);
			mainCallback(err);
		}else{
            if(request.parse_id){
                parse_id(request.mongoQuery, function(){
                    mainCallback();
                    console.log('request.mongoQuery---------------------------------')
                    //console.log(request.mongoQuery)
                })            
            }else{
                mainCallback();
            }			
		}
	})
}


var boxingInit = function(){
    var boxing = {};
    var alpha_codes = [null, 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    function labelNumber(count){
        var count_suffix = ['', '-A', '-B', '-C', '-D', '-E', '-F', '-G', '-H', '-I', '-J', '-K', '-L', '-M', '-N', '-O', '-P', '-Q', '-R', '-S', '-T', '-U', '-V', '-W', '-X', '-Y', '-Z']
        
        var i = parseInt(count/250);

        if((count -(250 * i)) === 0){
            i--;
        }

        return (count -(250 * i))+ count_suffix[i];
    }

    var newBoxProcessor = new multiTaskHandler(function(new_boxes){
        var session, vCode, nextBoxNum, sessionCount, weekNum, processedBoxes = [], emptyBoxes = [], reusedBoxes = [];

        function checkForOpenSession(nextTask){
            console.log('checkForOpenSession')
            //check for open session current group of boxes
            var _query = {};
            //now we can have multiple sessions open 
            //consider ship_from when generating new sessions. If no session is open with all these matching properties then generate a new session
            _query.$and = [{sessionStatus:'open'}, {vendor_code:new_boxes[0].vendor_code}, {fulfillment_center:new_boxes[0].fulfillment_center}, {ship_from:new_boxes[0].ship_from}]

            boxes.find(_query).limit(1).sort({sessionCount:-1, boxNumber:-1}, function(err, doc){
                if(err){
                    console.log(err);
                    nextTask(err);
                }else if(doc.length > 0){                                                    
                    session = doc[0].session;
                    nextBoxNum = doc[0].boxNumber + 1;
                    sessionCount = doc[0].sessionCount;
                    weekNum = doc[0].weekNum;
                    vCode = doc[0].vCode;
                    getEmptyBoxes(nextTask);
                }else{
                    generateNewSession(nextTask);
                }
                
            })
        }

        function generateNewSession(nextTask){
            console.log('generateNewSession')
            var _query = {}; 

            weekNum = moment().week();
            nextBoxNum = 1;
            //don't consider ship_from when getting a count of sessions for the vendor_code + fulfillment
            _query.$and = [{weekNum:weekNum}, {vendor_code:new_boxes[0].vendor_code}, {fulfillment_center:new_boxes[0].fulfillment_center}]
            //get the count of all sessions for the currents ship group
            boxes.find(_query).limit(1).sort({sessionCount:-1}, function(err, doc){
                if(err){
                    console.log(err);
                    nextTask(err);
                }else if(doc.length > 0){
                    sessionCount = doc[0].sessionCount + 1;
                    session =  weekNum + '' + alpha_codes[sessionCount];
                    vCode = doc[0].vCode;                                        
                    nextTask();
                }else{
                   sessionCount = 1;
                   session =  weekNum + '' + alpha_codes[sessionCount];
                   get_vCodes(nextTask)
                }
            })
        }

        function get_vCodes(nextTask){
            console.log('get_vCodes')

            vendor_codes.findOne({}, function(err, doc){
                if(err){
                    console.log(err);
                    nextTask(err);
                }else if(doc){

                    vCode = doc.codes.indexOf(new_boxes[0].vendor_code); 

                    if(vCode === -1){                                                                                     
                        doc.codes.push(new_boxes[0].vendor_code);  
                        vCode = doc.codes.indexOf(new_boxes[0].vendor_code) 
                        vendor_codes.save(doc);                      
                   }

                   vCode++
                   nextTask()
                }else{                    
                    throw "Error: missing vendor_codes!!!"
                }
            })
        }    

        function getEmptyBoxes(nextTask){
            var _query = {};
            //find all empty boxes for the current session being boxed
            _query.$and = [{sessionStatus:'open'}, {vendor_code:new_boxes[0].vendor_code}, {fulfillment_center:new_boxes[0].fulfillment_center}, {session:session}, {boxContents:[]}]

            boxes.find(_query, function(err, doc){
                if(err){
                    console.log(err);
                    nextTask(err);
                }else{
                    emptyBoxes = doc;
                    nextTask();
                }
            })
        }

        function addBoxDetails(nextTask){            
            console.log('addBoxDetails')
            //box Number
            //scannable box id
            //session id (alpha count + week)
            //weekNum
            //sessionCount

            var session_id = vCode + new_boxes[0].fulfillment_center + '-' + session;
            //use any empty boxes
            for (var i = 0; i < emptyBoxes.length; i++) {
                if(new_boxes[0]){

                    emptyBoxes[i].boxContents = new_boxes[0].boxContents

                    boxes.save(emptyBoxes[i])
                    reusedBoxes.push(emptyBoxes[i])
                    new_boxes.splice(0, 1)

                } else {break}
            }    
            
            for (var i = 0; i < new_boxes.length; i++) {
                new_boxes[i].boxNumber = nextBoxNum; 
                new_boxes[i].labelNumber = labelNumber(nextBoxNum);               
                new_boxes[i].session = session;
                new_boxes[i].sessionCount = sessionCount;
                new_boxes[i].vCode = vCode;
                new_boxes[i].weekNum = weekNum;
                new_boxes[i].session_id = session_id;
                new_boxes[i].created_date = moment()._d;                
                new_boxes[i].box_id = vCode + new_boxes[i].fulfillment_center + session + leadingZeros(nextBoxNum, 4);
                new_boxes[i].edi_transfer_status = 0;
                //temp logic for box id. To be changed when auto routing is implemented
                //new_boxes[i].box_id = new_boxes[i].fulfillment_center.substr(1) + session + leadingZeros(nextBoxNum, 3);
                /*---------------------------------*/

                new_boxes[i].sessionStatus = 'open';
                nextBoxNum++;
            }
            nextTask();
        }

        function insertBoxes(nextTask){
            if(new_boxes.length > 0){
                boxes.insert(new_boxes, function(err, doc){
                    if(err){
                        nextTask(err);
                    }else{
                        processedBoxes = doc;
                        console.log(processedBoxes)
                        nextTask();
                    }
                })
            } else {
                nextTask();                    
            }            
        }

        return {
            checkForOpenSession:checkForOpenSession,
            addBoxDetails:addBoxDetails,
            insertBoxes:insertBoxes,
            _return:function(){
                for (var i = reusedBoxes.length - 1; i >= 0; i--) {
                    //ensure boxes are in order by using unshift as opposed to push
                    processedBoxes.unshift(reusedBoxes[i])
                }                
                return processedBoxes
            }
        }
    })
    
    function insertBoxes(request, callBack){
        newBoxProcessor.runTasks(function(err, results){
            if(err){
                console.log(err);
                callBack(err);
            }else{                
                callBack(null, results)
            }
        }, request.boxes)
    }

    function addToBox(request, callBack){        
        request.box_id = mongo.ObjectId(request.box_id);

        boxes.findOne({_id:request.box_id}, function(err, doc){
            if(err){
                console.log(err);
                callBack(err);
            }else if(doc){
                var isNewItem = true;
                //box automatically open when item is added
                doc.open = true;
                for (var i = 0; i < doc.boxContents.length; i++) {
                    if(doc.boxContents[i]._id === request.pickedItem._id){                       
                        doc.boxContents[i].pickedUnits = doc.boxContents[i].pickedUnits + request.pickedItem.pickedUnits;
                    
                        boxes.save(doc);
                        isNewItem = false;
                    }
                }    
                console.log('isNewItem-----------------------')
                console.log(isNewItem)
                if(isNewItem){
                    doc.boxContents.push(request.pickedItem)
                    boxes.save(doc);
                }
                callBack(null, doc)                
            }else{
                console.log(request);
                callBack({errMsg:'An error occurred while adding an item to the boxing!'})
            }
        })
    }

    function updateOrder(request, callBack){
        console.log('updateOrder')
        var pickedUnits = request.pickedUnits;
        var pickedOrder = request.pickedOrder;       

        orders.findOne({_id:pickedOrder._id}, function(err, doc){
            if(err){
                console.log(err);
                callBack(err);
            }else if(doc){
                //validate doc against pickedOrder
                //update doc
                if(doc.in_stock_units >= pickedOrder.in_stock_units){                    
                    var calc = eachesCalc(pickedOrder.unit_breakdown)

                    var pickedEaches = calc.units(pickedUnits).toEaches();                    
                    doc.in_stock_eaches = calc.eaches(doc.in_stock_eaches).subtract(pickedEaches);
                    doc.in_stock_units = calc.eaches(doc.in_stock_eaches).realUnits();
                    doc.boxed_units = doc.boxed_units + pickedUnits;
                                        
                    if(doc.labels_required){
                        if(doc.labeled_units){
                            doc.labeled_units = (doc.labeled_units >= pickedUnits) ? doc.labeled_units - pickedUnits:0;  
                        }
                    }
                    orders.save(doc);
                    callBack(null, doc);
                }else{
                    callBack(null, {status:'rejected'});
                }
            }   
        })
    }

    function undoOrders(request, callBack){
        var pickedItems = request.pickedItems;

        order_ids = uniqueKeys(pickedItems, '_id');

        orderQuery.runTasks(function(err, _orders){
            if(err){
                console.log(err);
                callBack(err);
            }else{
                for (var i = 0; i < _orders.length; i++) {
                    var index = order_ids.indexOf(_orders[i]._id);

                    var calc = eachesCalc(_orders[i].unit_breakdown);
                    var pickedEaches = calc.units(pickedItems[index].pickedUnits).toEaches();                    

                    _orders[i].in_stock_units = _orders[i].in_stock_units + pickedItems[index].pickedUnits; 
                    _orders[i].in_stock_eaches = calc.eaches(_orders[i].in_stock_eaches).add(pickedEaches);
                    _orders[i].boxed_units = _orders[i].boxed_units - pickedItems[index].pickedUnits;

                    console.log(_orders)
                    orders.save(_orders[i]);
                }

                callBack(null, {status:'successful'})
            }
        }, {_id:{$in:order_ids}})
    }

    function undoBoxing(request, callBack){
        boxes.findAndModify({
            query:{_id:mongo.ObjectId(request.box_id)},
            update: {$pull:{boxContents:{_id:request.pickedItem._id}}}
        }, function(err, doc){
            if(err){
                console.log(err);
                callBack(err);
            }else{
                request.pickedItems = [request.pickedItem];
                undoOrders(request, callBack);
            }
        })

    }

    function recordLabels(request, callBack){
        orders.findOne({_id:request.order_id}, function(err, doc){
            if(err || !(doc)){
                console.log(err);
                callBack(err);
            }else{
                doc.labeled_units = doc.labeled_units || 0;
                doc.labeled_units  = doc.labeled_units + request.copies;
                orders.save(doc);
                callBack(null, doc);
            }
        })
    }

    boxing.recordLabels = recordLabels;
    boxing.undoBoxing = undoBoxing;
    boxing.undoOrders = undoOrders;
    boxing.updateOrder = updateOrder;
    boxing.addToBox = addToBox;
    boxing.insertBoxes = insertBoxes;
    return boxing
}


exports.boxing  = boxingInit();

var _app = new multiTaskHandler(function(){
    var app = {};
    app.xlDownload = xlDownload;
    app.getOrders = getOrders;
    app.ordersDownload = setOrdersDownload;
    app.setXlDownload = setXlDownload;
    app.replace = replace;
    app.linkPOs = linkPOs;
    app.distinct = distinct;
    app.addNote = addNote;
    app.getPO = getPO;
    app.manualReceipts = manualReceipts;
    app.cancelOrders = cancelOrders;

    function getOrders(request, callBack){
        orderQuery.runTasks(function(err, results){
            if(err){
                console.log(err);
                callBack(err);
            }else{
                callBack(null, results)
            }
        },request.mongoQuery.find)
    }
    /*getOrders({mongoQuery:{find:{_id:"4WOD6HTOB0011FWT34"}}}, function(err, results){
        console.log(results)
        console.log(err)
    })*/
    function setOrdersDownload(request, callBack){
        orderQuery.runTasks(function(err, results){
            if(err){
                console.log(err);
                callBack(err);
            }else{
                for (var i = 0; i < results.length; i++) {
                    results[i].earliest_ship_date = moment(results[i].earliest_ship_date).format("M/D/YY")
                    results[i].latest_ship_date = moment(results[i].latest_ship_date).format("M/D/YY")
                    results[i].expected_ship_date = moment(results[i].expected_ship_date).format("M/D/YY")
                    results[i].order_date = moment(results[i].order_date).format("M/D/YY")
                }
                aux.insert({download:results}, function(err, doc){
                    if(err){
                        console.log(err);
                        callBack(err);
                    }else{
                        callBack(null, doc)
                    }
                })                
            }
        },request.mongoQuery.find)
    }


    var xlDownloadHandler = new multiTaskHandler(function(req, res){
        var coll, query, _data;

        var xlDown = {};
        xlDown.getDownloadRequest = getDownloadRequest;
        xlDown.getDownloadData = getDownloadData;
        xlDown.reformateJson = reformateJson;
        xlDown.skuEditorDownload = skuEditorDownload;
        xlDown.pickSheetDownload = pickSheetDownload;
        xlDown.pickHeaderData = pickHeaderData;
        xlDown.asinEditorDownload = asinEditorDownload;

        function getDownloadRequest(nextTask){            
            aux.findOne({_id:req.params._id}, function(err, doc){
                if(err){
                    console.log(err);
                    nextTask(err);
                }else if(doc){
                    doc.mongoQuery = JSON.parse(doc.mongoQuery);
                                                               
                    coll = doc.collName;
                    query = (doc.parse_id) ? parse_id(doc.mongoQuery).find: doc.mongoQuery.find;
                    nextTask();
                }
            })
        }

        function getDownloadData(nextTask){
                
            if(query){
                
                collection(coll).find(query, function(err, doc){
                    if(err){
                        console.log(err)
                        nextTask(err);
                    }else{
                        _data = doc;                    
                        nextTask()                    
                    }
                })
            }else{
                nextTask({errMsg:"Download Failed!!! 1"})
            }
                
        }

        function reformateJson(nextTask){
            if(_data){                
                var pNames = Object.getOwnPropertyNames(_data[0])
                for (var i = 0; i < _data.length; i++) {
                    for (var n = 0; n < pNames.length; n++) {                                                                   
                        if(typeof _data[i][pNames[n]] === 'object'){                    
                            _data[i][pNames[n]] = JSON.stringify(_data[i][pNames[n]])
                        }
                    }
                }
                nextTask();
            }else{
                nextTask({errMsg:"Download Failed!!! 2"})
            }
        }

        function skuEditorDownload(){
            if(_data.length > 0){                
                
                setSkuEditor(_data, function(err){
                    if(err){
                        res.status(500).json(err);
                    }else{
                        console.log(cwd + '\\public\\excel templates\\PF SKU Editor.xlsm')
                        res.download( cwd + '\\public\\excel templates\\PF SKU Editor.xlsm')
                    }
                })
            }else{
                nextTask({errMsg:"Download Failed!!! 3"});  
            }
                 
        }

        function pickHeaderData(nextTask){
            var xlsx = json2xls([_data[0]]); 
            
            fs.writeFile(temp + 'picksheet_header.xlsx', xlsx, 'binary', function(err, fd){
                if(err){
                    nextTask(err);
                    console.log(err);
                }else{
                    nextTask();  
                }
            })
        }

        function pickSheetDownload(nextTask){
            var pickData = [];

            for (var i = 0; i < _data.length; i++) {
                var previous_box = _data[i-1] || {};
                for (var n = 0; n < _data[i].boxContents.length; n++) {                    
                    var item  = _data[i].boxContents[n]; 
                    var previous_item = pickData[pickData.length - 1] || {};
                    var pickLine = {};
                    
                    //if the current item's asin mathces the previous_item we automatically know that we are dealing with
                    //another box (on asin per box). And we can also deduce that that item was the only item in the previous box
                    //because the user can select any box to print, check if the previous and currentBoxes are consecutive

                    if(item.asin === previous_item.asin && item.pickedUnits === previous_item.per_box && _data[i].boxNumber === (previous_box.boxNumber + 1)){
                        var a = pickData.length - 1;

                        previous_item.pickedUnits = previous_item.pickedUnits + item.pickedUnits
                        previous_item.boxNumber = previous_item._boxNumber + ' to ' + _data[i].boxNumber
                    }else{
                        pickLine = cloneKeys(item, ['boxNumber', 'pf_sku', 'asin', 'title', 'per_box', 'multiple', 'pickedUnits']);                        
                        pickLine.per_box = pickLine.pickedUnits;
                        pickLine._boxNumber = _data[i].boxNumber;
                        pickLine.boxNumber =  _data[i].boxNumber;

                        pickData.push(pickLine);    
                    }
                    
                }
            }

            var xlsx = json2xls(pickData); 

            fs.writeFile(temp + 'picksheet_data.xlsx', xlsx, 'binary', function(err, fd){
                if(err){
                    nextTask(err);
                    console.log(err);
                }else{                

                    aux_fns.setData('session_picksheet', function(data, err){
                        if(err){                            
                            nextTask(err);
                        }else{                            
                            res.download( cwd + '\\public\\excel templates\\Session Picksheet.xlsm')                            
                        }
                    });            
                }
            })
        }

        function asinEditorDownload(nextTask){
            setAsinDataEditor(_data, function(data, err){
                if(err){
                    nextTask(err);
                }else{  
                    res.download( cwd + '\\public\\excel templates\\ASIN Data Editor Template.xlsm')                             
                }
            })
        }

        return xlDown
    })
        
    var linkOrdersReport = new multiTaskHandler(function(po_numbers, order_week){        
        var POs, _orders, skus_on_order = [], on_order_items, on_po_items, reportHolder;
        
        function reprocessRecs(nextTask){
            recReprocessor.runTasks(function(err, results){
                if(err){
                   console.log(err);
                }else{
                    //console.log(results);
                    console.log('reprocess---------------------------------receipts')                    
                }
            });
            nextTask();
        }            
        function getPOs(nextTask){
            console.log('getPOs---------------------------')
            pf.getPOs(po_numbers, function(data, err){
                if(err){
                    console.log(err)
                    nextTask(err)
                }else{
                    console.log(data[0])
                    console.log(data.length)
                    POs = data;
                    combinePOs(nextTask);
                }
            })
        }

        function getOrders(nextTask){
            console.log('getOrders---------------------------')
            orderQuery.runTasks(function(err, doc){
                if(err){
                    console.log(err)
                    nextTask(err)
                }else{
                    console.log('--------------------doc----------------------------')
                    //console.log(doc)
                    console.log(doc.length) 
                    _orders = doc;                   
                    splitUnitBreakdown(nextTask);
                }
            }, {order_week:order_week})            
        }

        function splitUnitBreakdown(nextTask){
            //split unit_breakdowns into seperate order lines
            console.log('splitUnitBreakdown------------------------------------------') 
            //console.log(_orders[0])           
            //get total pending eaches for each item on order
            for (var i = 0; i < _orders.length; i++) {
                _orders[i].unit_breakdown = _orders[i].unit_breakdown || [];

                for (var n = 0; n < _orders[i].unit_breakdown.length; n++) {
                    //var item = cloneKeys(_orders[i].unit_breakdown[n])
                    item = {};
                    item.sku = _orders[i].unit_breakdown[n].sku
                    item.total_pending_eaches = _orders[i].pending_units * _orders[i].unit_breakdown[n].multiple;
                    item.total_confirmed_eaches = _orders[i].units_confirmed * _orders[i].unit_breakdown[n].multiple;                                        
                    skus_on_order.push(item);                    
                }
            }
            console.log("findByKey(on_order_items, 'B000GUP7KW', true).length")
            console.log(findByKey(_orders, 'asin', 'B000GUP7KW', true).length)
            console.log(findByKey(_orders, 'asin', 'B000GUP7KW', true))

            combineOrders(nextTask);
        }
        function combineOrders(nextTask){
            console.log('combineOrders------------------------------------------')

            console.log(skus_on_order[1])
            console.log("findByKey(skus_on_order, '0100003', true).length")
            console.log(findByKey(skus_on_order, 'sku', '0100003', true).length)
            console.log(findByKey(skus_on_order, 'sku', '0100003', true))
            on_order_items = combineAndSumByKey(skus_on_order, 'sku', ['total_pending_eaches', 'total_confirmed_eaches'])
            
            console.log('-------------------on_order_items[1]---------------------------')
            console.log(on_order_items[1])
            
            console.log("findByKey(on_order_items, '0100003', true).length")
            console.log(findByKey(on_order_items, 'sku', '0100003', true).length)
            console.log(findByKey(on_order_items, 'sku', '0100003', true))
            
            nextTask();
        }
        function combinePOs(nextTask){
            console.log('combinePOs------------------------------------------')

            console.log(POs[0])
           
            on_po_items = combineAndSumByKey(POs, 'pf_sku', ['order_qty', 'rec_qty'])
            console.log(on_po_items[0])
            nextTask();
        }

        function combineData(nextTask){
            console.log('combineData------------------------------------------')
            for (var i = 0; i < on_order_items.length; i++) {                
                var po_item_match = findByKey(on_po_items, 'pf_sku', on_order_items[i].sku)[0];
                if(po_item_match){
                    on_order_items[i].total_po_qty = po_item_match.order_qty;
                    on_order_items[i].total_pf_rec_qty = po_item_match.rec_qty;                    
                }else{
                    on_order_items[i].total_po_qty = 0;
                    on_order_items[i].total_pf_rec_qty = 0;                                    
                }
                on_order_items[i].last_update = moment()._d;
                on_order_items[i].total_off_po_qty = /*(on_order_items[i].total_po_qty + on_order_items[i].total_pf_rec_qty) -*/ on_order_items[i].total_pending_eaches - on_order_items[i].total_po_qty; 
                on_order_items[i].total_system_rec_qty = on_order_items[i].total_confirmed_eaches - on_order_items[i].total_pending_eaches;
                on_order_items[i].total_off_rec_qty = on_order_items[i].total_system_rec_qty - on_order_items[i].total_pf_rec_qty;
                on_order_items[i].notes = [];
            }
            

            console.log('----------------------on_order_items------------------------------------------')
            console.log("findByKey(on_order_items, '0100003', true).length")
            console.log(findByKey(on_order_items, 'sku', '0100003', true).length)
            console.log(findByKey(on_order_items, 'sku', '0100003', true))
            nextTask();
        }

       
        function newReport(){
            return {
                order_week:order_week,
                linked_po_numbers:po_numbers,
                report_name:'Linked POs Report',                
                reportTbl:on_order_items,
                reportHeaders:[
                    {
                        pName:'sku',
                        fieldName:'SKU',                                                
                    },
                    {
                        pName:'total_confirmed_eaches',
                        fieldName:'Total Confirmed Eaches',                                                
                    },
                    {
                        pName:'total_pending_eaches',
                        fieldName:'Total Pending Eaches',                                                
                    },
                    /*{
                        pName:'total_system_rec_qty',
                        fieldName:'Total Received (system)',                                                
                    },*/
                    {
                        pName:'total_po_qty',
                        fieldName:'Total Eaches On Linked POs',                                                
                    },
                    /*{
                        pName:'total_pf_rec_qty',
                        fieldName:'Total Received (PointForce)',                                                
                    }, */                                   
                    {
                        pName:'total_off_po_qty',
                        fieldName:'Unaccounted Quantity',                                                
                    },
                   /* {
                        pName:'total_off_rec_qty',
                        fieldName:'Total Off Receipts Qty',                                                
                    },*/                                
                    {
                        pName:'_notes',
                        fieldName:'Notes',                                                
                    },
                    /*{
                        pName:'last_update',
                        fieldName:'Last Update',                                                
                    } */                   
                ]

            } 
            
        }
         function copyNotes(newReport, oldReport){

            for (var i = 0; i < newReport.length; i++) {
                var oldReportMatch = findByKey(oldReport, 'sku', newReport[i].sku)[0]
                if(oldReportMatch){
                    
                    newReport[i].notes = oldReportMatch.notes;
                    
                }
            }
            return newReport
        }
        function checkPreviousReport(nextTask){
            reportHolder = newReport();
            console.log('reportHolder--------------------------')
            console.log(reportHolder.reportHeaders)
            //check for previous reports and copy notes from it
            reports.find({$and:[{order_week:order_week}, {report_name:'Linked POs Report'}]}, function(err, doc){
                if(err){

                }else if(doc[0]){
                    console.log('doc[0]._id======================')
                    console.log(doc[0]._id)
                    if(doc[0]._id){
                        reportHolder._id = doc[0]._id;                     
                        reportHolder.reportTbl = copyNotes(reportHolder.reportTbl, doc[0].reportTbl);

                        nextTask()
                    }else{
                        console.log('here1----------------2')
                        nextTask()
                    }
                }else{
                    console.log('here1----------------3')
                    nextTask()
                }
            })
        }

        function saveReport(nextTask){
            console.log('reportHolder--------------------------')
            console.log(reportHolder.reportHeaders)
            reports.save(reportHolder, function(err, doc){
                if(err){
                    console.log(err);
                }else{
                    nextTask();
                }
            })
        }
           

        return {
            getPOs:getPOs,
            getOrders:getOrders,
            combineData:combineData,
            checkPreviousReport:checkPreviousReport,
            saveReport:saveReport,
            reprocessRecs:reprocessRecs,
            _return:function(){
                return reportHolder
            }
        }
    });//.setTasksAsync(['getPOs', 'getOrders'], ['combineData', 'checkPreviousReport', 'saveReport'])

    function linkPOs(request, callBack){
        var asyncTasks = ['getPOs', 'getOrders'];
        var syncTasks = ['combineData', 'checkPreviousReport', 'saveReport'];

        if(request.newReport === true){syncTasks.push('reprocessRecs')}

        linkOrdersReport
        .setTasksAsync(asyncTasks, syncTasks)
        .runTasks(function(err, results){
            if(err){
                    console.log(err)  
                    callBack(err)                  
                }else{
                    callBack(null, results)                    
                }
        }, request.po_numbers, request.order_week)
    }

    function setXlDownload(request, callBack){
        request.mongoQuery = JSON.stringify(request.mongoQuery);
                   
        aux.insert(request, function(err, doc){
            if(err){
                console.log(err);
                callBack(err);
            }else{                
                callBack(null, doc)
                
            }  
        })

                
    }

    function xlDownload(req, res, callBack){
        var defaultTasks =['getDownloadRequest', 'getDownloadData'];        
        var setTasks = req.params.setTasks.split(',')        
        
        for (var i = 0; i < setTasks.length; i++) {
            defaultTasks.push(setTasks[i])
        }
                
        xlDownloadHandler.setTasks(defaultTasks).runTasks(function(err, results){
            if(err){
                console.log(err);
                callBack(err);
            }else{
                callBack(null, results);
            }
        }, req, res)
    }

    function replace(request, callBack){
        var new_data = request.mongoQuery.replace;
        var coll = collection(request.collName);

        for (var i = 0; i < new_data.length; i++) {
            coll.save(new_data[i])
        }

        callBack(null, {status:'no errors'})
    }

    function distinct(request, callBack){
        collection(request.collName).distinct(request.pName, null, function(err, doc){
            if(err){
                console.log(err);
                callBack(err);
            }else{
                callBack(null, doc);
            }
        })
    }

    function addNote(request, callBack){
        reports.findOne(request.mongoQuery.find, function(err, doc){
            if(err){
                 console.log(err);
                callBack(err);
            }else{
                if(doc.reportTbl){
                    
                    for (var i = 0; i < request.data.length; i++) {
                        reportLine = findByKey(doc.reportTbl,  'sku', request.data[i].sku)[0];
                        reportLine.notes = request.data[i].notes;
                    }

                    reports.save(doc, function(err, doc){
                        if(err){
                            console.log(err);
                            callBack(err);
                        }else{
                            callBack(null, doc);
                        }
                    })                    
                }else{
                    callBack({errMsg:'The report was not  found!'})
                }
            }
        })
    }

    function getPO(request, callBack){

        pf.getPOs([request.po_number], function(data, err){
            if(err){
                console.log(err)
                callBack(err)
            }else{        
                callBack(null, data);
            }
        })
    }

    function manualReceipts(request, callBack){
        console.log(request.receipts);
        receiptsProcessor.runTasks(function(err, results){
            if(err){
                console.log(err)
                callBack(err)
            }else{ 
                console.log(results);   
                callBack(null, {status:'successful'});                            
                /*receipts.insert(results, function(){
                    if(err){
                        callBack(err)
                    }else{
                        callBack(null, {status:'successful'});        
                    }    
                })*/
            }
        }, request.receipts)
    }   


    var orderCancelHandler = new multiTaskHandler(function(canceled_orders){
        var order_data, recs_to_undo = [];
        
        function getOrders(nextTask){
            var unique_ids = uniqueKeys(canceled_orders, '_id');

            orderQuery.runTasks(function(err, results){
                if(err){
                    nextTask(err);
                }else{                    
                    order_data = results;    
                    nextTask();
                }
                
            }, {_id:{$in:unique_ids}})
        }
        
        function addUndoOrder(order_id, eaches){
            var pNames = Object.getOwnPropertyNames(eaches);

            for (var i = 0; i < pNames.length; i++) {
           
                if(eaches[pNames[i]] > 0){                 
                    recs_to_undo.push({
                        order_id:order_id,
                        sku:pNames[i],
                        undo_qty:eaches[pNames[i]]
                    })
                }
            }
        }

        function updateTracking(nextTask){
            //console.log(order_data)
            order_data.forEach(function(order_line, index){
                var canceled_line = findByKey(canceled_orders, '_id', order_line._id)[0];
                var eCalc = eachesCalc(order_line.unit_breakdown);
                var canceled_eaches = eCalc.units(canceled_line.canceling_units).toEaches();
                //eaches to move from instock to pending and back to receipts
                var transfer_eaches = (canceled_line.canceling_units < eCalc.eaches(order_line.in_stock_eaches).realUnits())
                ? canceled_eaches:order_line.in_stock_eaches; 
                //record in_stock_eaches to undo receipts for
                addUndoOrder(order_line._id, transfer_eaches);
                //Because pending and instock eaches can be canceled the total canceled qty can be greater than either field
                //move  transfer_eaches from instock to pending. 
                order_line.pending_eaches =  eCalc.eaches(order_line.pending_eaches).add(transfer_eaches);                
                
                order_line.in_stock_eaches =  eCalc.eaches(order_line.in_stock_eaches).subtract(transfer_eaches);
                order_line.in_stock_units = eCalc.eaches(order_line.in_stock_eaches).realUnits();

                //move canceling_eaches from pending_eaches to canceled_eaches
                order_line.pending_eaches = eCalc.eaches(order_line.pending_eaches).subtract(canceled_eaches);
                order_line.pending_units = eCalc.eaches(order_line.pending_eaches).realUnits();
                order_line.canceled_units += eCalc.eaches(canceled_eaches).toUnits();                
               
            })
     
            nextTask();
        }

        function saveChanges(nextTask){
            //create mongoQuery to find all docs to update
            var _ids = uniqueKeys(order_data, '_id');        
            
            orders.find({_id:{"$in":_ids}}).forEach(function(err, doc){
                
                if(err){
                    nextTask(err)
                    return
                }

                if(doc){
                    var order_line = findByKey(order_data, '_id', doc._id)[0];                    
                    
                    doc.pending_eaches = order_line.pending_eaches
                    doc.pending_units = order_line.pending_units

                    doc.in_stock_eaches = order_line.in_stock_eaches
                    doc.in_stock_units = order_line.in_stock_units

                    doc.canceled_units = order_line.canceled_units                
                        
                    orders.save(doc);   
                }else{
                    if(recs_to_undo.length >0){
                        undoRecs(nextTask)
                    }else{
                        nextTask();                       
                    }                    
                }                  
            })
        }


        function undoRecs(nextTask){            
            var undo_data = recs_to_undo.shift()            
            undo(undo_data, nextTask)            
        }

        function undo(undo_data, nextTask){
            
            if(!(undo_data)){
                redoReceipts(nextTask)
                return
            }

            receipts.find({$and:[{pf_sku:undo_data.sku},{"linked_orders._id":undo_data.order_id}]})
            .forEach(function(err, doc){
             
                if(err){
                    nextTask(err);
                    return
                }else if(!(doc)){
                    //undo next order line                    
                    undoRecs(nextTask); 
                    return
                }

                if(undo_data.undo_qty > 0){
                    //undo do receipt
                    for (var i = 0; i < doc.linked_orders.length; i++) {
                        if(doc.linked_orders[i]._id === undo_data.order_id){
                            
                            var undo_qty = Math.min(doc.linked_orders[i].assigned_eaches, undo_data.undo_qty);

                            doc.linked_orders[i].assigned_eaches -= undo_qty;
                            doc.unused_qty += undo_qty;

                            undo_data.undo_qty -= undo_qty;

                            if(doc.linked_orders[i].assigned_eaches === 0){
                                doc.linked_orders.splice(i , 1);                            
                            }

                            break                            
                        }
                    }
                }
                //save changes
                receipts.save(doc)
                                            
            })
        }
        

        function redoReceipts(nextTask){
            recReprocessor.runTasks(function(err, results){
                if(err){                   
                   nextTask(err);
                }else{          
                    console.log('orderCancelHandler-------------------')                                              
                    nextTask(null, results);
                }
            });
        }

        return {
            getOrders:getOrders,
            updateTracking:updateTracking,
            saveChanges:saveChanges
            /*undoRecs:undoRecs*/
            /*redoReceipts:redoReceipts*/
        }
    })

    function cancelOrders(request, callBack){        
        orderCancelHandler.runTasks(function(err, results){
            if(err){
                callBack(err);
            }else{
                callBack(null, results);
            }
        }, request.canceled_orders)                
    }

        

    return app;
})
console.log('orders.distinct')

    
exports.app = _app;