const mongo = require("mongojs");
const orders = mongo("VC_OPS", ['orders']).orders;
const boxes = mongo("VC_OPS", ['boxes']).boxes;
const json2csv = require('json-2-csv').json2csv;
const moment = require('moment');
const multiTaskHandler = require('./tasks').multiTaskHandler;
const temp_fPath =  process.cwd() + '\\temp\\';
const fs = require('fs');


var sqlHandler = (function(){
	var	sqlHandler = {}

	sqlHandler.ediSender =  new multiTaskHandler(function(session_ids){
		var mth = {}, box_data, order_data, boxTbl = [], ordersTbl = [], order_ids = [];

		function totalBoxWeight(){

		}

		mth.getBoxes = function(nextTask){
			boxes.find({session_id:{$in:session_ids}}, function(err, doc){
				if(err){
					nextTask(err)
				}else{
					box_data = doc;
					console.log('box_data------------------------------')
					console.log(box_data[0])
					console.log(box_data[1])
					console.log(box_data[2])
					console.log(box_data[3])
					nextTask()
				}
			})
		}
		mth.reformatBoxData = function(nextTask){
			//convert collection of boxes into tabular format
			box_data.forEach(function(box){
				box.boxContents.forEach(function(item){
					var order_id = box.amazon_po + item.asin;
					//console.log(order_ids)
					if(order_ids.indexOf(order_id) === -1){
						order_ids.push(order_id);
					}

					boxTbl.push({
						Box_ID:box.box_id,
						BoxNumber:box.boxNumber,
						BoxedDate:moment(box.createdDate).format("M/D/YY"),
						JobNumber:'',
						Amazon_PO:box.amazon_po,
						ASIN:item.asin,
						total_units:item.pickedUnits,
						Session_ID:box.session_id,
						Weight:(item.item_weight * item.pickedUnits).toFixed(2)
					})
				})
			})	

			console.log('boxTbl-------------------------------------------------')
			console.log(boxTbl[0])	
			console.log(boxTbl[1])	
			console.log(boxTbl[2])	
			console.log(boxTbl[3])	
			/*json2csv(boxTbl, function(err, csv){
				if(err){
					nextTask(err)
					return
				}
				
				fs.writeFile(temp_fPath + 'boxTbl.csv', csv, function(err, fd){
			        if(err){
			            nextTask(err);		            
			        }else{
			        	nextTask()
			        }
			    })
			})*/
			
		}

		mth.getOrders = function(nextTask){		

			orders.find({_id:{$in:order_ids}}, function(err, doc){
				if(err){
					nextTask(err)
				}else{
					order_data = doc;
					console.log('order_data----------------------------')
					console.log(order_data[0])
					console.log(order_data[1])
					console.log(order_data[2])
					console.log(order_data[3])
					nextTask()
				}
			})
		}
		
		function per(num){
			return (num > 1)?num+'':'EA'		
		}
		function uom(num){
			return (num > 1)?'B'+num:'EA'
		}
		mth.reformatOrderData = function(nextTask){
			order_data.forEach(function(order){
				ordersTbl.push({
					Amazon_PO:order.amazon_po,
					earliest_ship_date:moment(order.earliest_ship_date).format("M/D/YY"),
					latest_ship_date:moment(order.latest_ship_date).format("M/D/YY"),
					expected_ship_date:moment(order.expected_ship_date).format("M/D/YY"),
					Order_Date:moment(order.order_data).format("M/D/YY"),
					fulfillment_center:order.fulfillment_center,
					vendor_code:order.vendor_code,
					ASIN:order.asin,
					Title:order.title,
					Cost:order.cost,
					units_confirmed:order.units_confirmed,
					unit_of_measure_code:uom(order.multiple),
					per:per(order.multiple),
					PFProductCode:order.pf_sku,				
				})
			})
			console.log('ordersTbl------------------------------')
			console.log(ordersTbl[0])
			console.log(ordersTbl[1])
			console.log(ordersTbl[2])
			console.log(ordersTbl[3])
			/*json2csv(ordersTbl, function(err, csv){
				if(err){
					nextTask(err)
					return
				}

				fs.writeFile(temp_fPath + 'ordersTbl.csv', csv, function(err, fd){
			        if(err){
			            nextTask(err);		            
			        }else{
			        	nextTask()
			        }
			    })
			})*/	
		}

		mth.sendOrderData = function(nextTask){
			
		}

		mth.sendBoxData = function(nextTask){
			
		}

		mth.updateBoxStatus = function(nextTask){

		}

		return mth
	})
})()



var sids = [
	'1E18744-A29',
	'1E18732-A29',
	'1E18805-A29',
	'1E18797-A29',
	'1E18751-A29',
	'1E18824-A29',
	'1E18800-A29',
	'1E18778-A29',
	'1E18798-A29',
	'1E18806-A29',
	'1E18781-A29',
	'1E18808-A29',
	'1E18747-A29'
]

ediSender.runTasks(function(err, results){
	if(err){
		console.log(err)
	}else{
		console.log(results)
	}
}, sids)
































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