angular.module('boxingMod', [])

.controller('boxingCtrl', ['$scope', 'orderSearchHandler', 'boxPicker', 'pickedBoxes' , 'productEditor', 'labelPrinter', 'stateHandler', '$$msgbox',  function($scope, orderSearchHandler, boxPicker, pickedBoxes, productEditor, labelPrinter, stateHandler, $$msgbox){

	$scope.$$msgbox	= $$msgbox;		
	$scope.osh = orderSearchHandler;
	$scope.pickedBoxes = pickedBoxes;
	$scope.boxPicker = boxPicker;
	$scope.productEditor = productEditor
	$scope.labelPrinter = labelPrinter;
	
	$scope.loginFrm = stateHandler.loginFrm;    
        
	orderSearchHandler.state = new stateHandler.addState(orderSearchHandler, 'osh', ['searchText']);
	boxPicker.state = new stateHandler.addState(boxPicker, 'boxPicker', ['autoFilter', 'currentBox', 'currentOrder']);	
	pickedBoxes.state = new stateHandler.addState(pickedBoxes, 'pb', ['filters'])
	
	stateHandler.init(function(){
		boxPicker.refresh()		
		
	});	

	console.log(stateHandler)
	//$scope.pickedBoxes.getBoxes();
	$scope.test = function(){
		console.log(labelPrinter)
	}
}])
	

.service('orderSearchHandler',['tasks', '_client', '$$db', '$$eachesCalc', '$$msgbox', function(tasks, _client, $$db, $$eachesCalc, msgbox){
	var osh = this;
	osh.searchText = "";
	osh.searchTxbKeydown = searchTxbKeydown;	

	osh.headers = [
		{
            pName:'units_confirmed',
            fieldName:'Ordered Units',               
            processData: function(data){
                return data;
            }
        },
        {
            pName:'in_stock_units',
            fieldName:'In Stock Units',               
            processData: function(data, json){
                return new $$eachesCalc(json.unit_breakdown).eaches(json.in_stock_eaches).toQty_HTML();
            }
        },
        {
            pName:'boxed_units',
            fieldName:'Boxed Units',               
            processData: function(data, json){
                return data
            }
        },
        {
            pName:'multiple',
            fieldName:'Multiple',               
            processData: function(data){
                return data;
            }
        },
        {
            pName:'asin',
            fieldName:'ASIN',               
            processData: function(data){
                return '<a href="https://www.amazon.com/dp/' + data + '" target="_blank" class="ng-binding">' + data + '</a>';
            }
        },
        {
            pName:'pf_sku',
            fieldName:'PF SKU',               
            processData: function(data){
                return data;
            }
        },
        {
            pName:'fulfillment_center',
            fieldName:'Fulfillment Center',               
            processData: function(data){
                return data;
            }
        },
        {
            pName:'vendor_code',
            fieldName:'Vendor Code',               
            processData: function(data){
                return data;
            }
        },
        {
            pName:'order_date',
            fieldName:'Order Date',               
            processData: function(data){
                return moment(data).format("M/D/YY");
            }
        },
        {
            pName:'expected_ship_date',
            fieldName:'Expected Ship Date',               
            processData: function(data){
                return moment(data).format("M/D/YY");
            }
        }
	]

	

	var orderLookup = new tasks.multiTaskHandler(function(searchText){
		var orders =[], asins= [], skus =[];


		function skuDataSearch(nextTask, query){			
			var request = _client.generateRequestObj('skuDataSearch @boxingMod');    
			var mq = {};

			if(query){
				mq = query;
			}else{
				mq.$or = [];
				mq.$or.push({sku:searchText});
				mq.$or.push({alternative_sku:searchText});
				mq.$or.push({upcs:searchText});
				mq.$or.push({"set_breakdown.sku":searchText});
			}
								
            request.mongoQuery.find = mq;

            $$db.collection('pf_skus').find(request, function(data){
            	skus = data; 
            	nextTask();	
            })
		}

		function asinsDataSearch(nextTask, query){
			var request = _client.generateRequestObj('asinsDataSearch @boxingMod');    
			var mq = {};

			if(query){
				mq = query;
			}else{
				mq.$or = [];
				mq.$or.push({pf_sku:searchText});				
				mq.$or.push({asin:searchText});	
			}
			
            request.mongoQuery.find = mq;

            $$db.collection('asinData').find(request, function(data){
            	asins = data; 
            	nextTask();	
            })
		}

		function getMissingData(nextTask){
			var	query;

			if(asins.length > 0){
				if(skus.length > 0){
					nextTask();
				}else{
					query = {pf_sku:{$in:uniqueKeys(asins, 'pf_sku')}}
					skuDataSearch(nextTask, query)
				}
			}else if (skus.length > 0){
				searchTxbKeydown({which:13}, null, skus[0].sku)

				/*query = {pf_sku:{$in:uniqueKeys(skus, 'sku')}}
				asinsDataSearch(nextTask, query);*/
			}else{
				console.log('msg: no products found!!!')
				msgbox.showMsg('No products found while searching ' + osh.searchText + '!')
			}
		}

        function getOrders(nextTask){   
        	if(asins){             
	            var request = _client.generateRequestObj('getOrders @boxingMod');    
				//var mq = {asin:{$in:uniqueKeys(asins, 'asin')}};						
				var mq = {$and:[{asin:{$in:uniqueKeys(asins, 'asin')}}, {in_stock_units:{$gt:0}}]};						
	            request.mongoQuery.find = mq;

	            $$db.collection('orders').find(request, function(data){
	                orders = data;
	                if(data.length	=== 0){
	            		msgbox.showMsg('No Orders found for this item!')    	
	                }else{
	                	nextTask();		
	                }                		                	                
	            })
            }else{
            	console.log('msg: no asin found!!! 2')	            	
            }
        }		        

        function combineProdData(nextTask){
        	for (var i = 0; i < asins.length; i++) {	        		
        		for (var n = 0; n < skus.length; n++) {
        			if(asins[i].pf_sku = skus[n].sku){
        				if(skus[n].is_set){
        					asins[i].unit_breakdown = skus[n].set_breakdown
        				}else{
        					asins[i].unit_breakdown = [{
        						sku:asins[i].sku,
        						multiple:asins[i].multiple
        					}]
        				}
        			}
        		}
        	}
        	nextTask();
        }
        function combineData(){

        	for (var i = 0; i < orders.length; i++) {
        		for (var n = 0; n < asins.length; n++) {
        			if(asins[n]._id === orders[i].asin + orders[i].vendor_code){
        				orders[i].unit_breakdown = asins[n].unit_breakdown;
        				orders[i].pf_sku = asins[n].pf_sku;
        				orders[i].multiple = asins[n].multiple;
        				orders[i].labels_required = asins[n].labels_required;
        				orders[i].prep_instructions = asins[n].prep_instructions;        				

        				var calc = $$eachesCalc(orders[i].unit_breakdown);                                                        
                        orders[i].in_stock_units = (orders[i].unit_breakdown) ? calc.eaches(orders[i].in_stock_eaches).toUnits():-1;                                   
                       
                       orders[i].labeled_units = orders[i].labeled_units||0; 
                       orders[i].labels_needed = orders[i].in_stock_units - orders[i].labeled_units;
        			}	        			
        		}
        	}

        	return orders
        }

		return {
			skuDataSearch:skuDataSearch,
			asinsDataSearch:asinsDataSearch,
			getMissingData:getMissingData,
			getOrders:getOrders,
			combineProdData:combineProdData,				
			_return:combineData
		}
	}).setTasksAsync(['skuDataSearch', 'asinsDataSearch'], ['getMissingData', 'getOrders'])

	function searchTxbKeydown(keyEvent, callBack, searchText){
		osh.searchText = osh.searchText.toUpperCase();
		searchText = searchText || osh.searchText
		if(keyEvent.which === 13){
			osh.orders = [];

			if(osh.searchText != ''){
				orderLookup.runTasks(function(err, results){
					if(err){
						console.log(err);
					}else{
						osh.orders = results;						
						if(typeof callBack === 'function'){callBack()}
						console.log(results)							
					}
				}, searchText)
			}
			osh.state.save();
		}			
	}	
}])

.service('boxPicker',['orderSearchHandler', 'pickedBoxes', 'labelPrinter', 'tasks', '_client', '$$db', '$$msgbox', function(osh, pickedBoxes, labelPrinter, tasks, _client, $$db, msgbox){
	
	var boxPicker = this;

	boxPicker.boxes = 1;
	boxPicker.pickedUnits = 0;
	boxPicker.multiBox = false;
	boxPicker.setCurrentOrder =setCurrentOrder;
	boxPicker.submitItem = submitItem;
	boxPicker.multiBoxChange = multiBoxChange;
	boxPicker.boxSearchKeydown = boxSearchKeydown;		
	boxPicker.autoFilter = true;	
	boxPicker.currentBox = null;		
	boxPicker.refresh = refresh;
	boxPicker.undoItem = undoItem;

	boxPicker.boxHeaders = [
		{
            pName:'asin',
            fieldName:'ASIN',               
            processData: function(data){
                return '<a href="https://www.amazon.com/dp/' + data + '" target="_blank" class="ng-binding">' + data + '</a>';
            }
        },
        {
            pName:'pf_sku',
            fieldName:'PF SKU',               
            processData: function(data){
                return data;
            }
        },
        {
            pName:'pickedUnits',
            fieldName:'UNITS',               
            processData: function(data){
                return data;
            }
        },
        {
            pName:'multiple',
            fieldName:'MUL',               
            processData: function(data){
                return data;
            }
        }
	];

	function boxSearchKeydown(keyEvent, searchText){
		if(keyEvent.which === 13){
			var request = _client.generateRequestObj('boxSearchKeydown @boxingMod'); 

			request.mongoQuery.find = {box_id:searchText};

			$$db.collection('boxes').find(request, function(data){
				if(data){
					boxPicker.currentBox = data[0];
					boxPicker.state.save();
					console.log(boxPicker.currentBox);
				}
			})
		}	
	}

	function setCurrentOrder(order){				

		if(boxPicker.currentBox){			
			if(order.vendor_code + order.fulfillment_center != boxPicker.currentBox.vendor_code + boxPicker.currentBox.fulfillment_center){

				console.log('msgbox: this order cannot be shipped with the current box')
				msgbox.showMsg(
					'The order you selected does not match the current box. Either select a matching box or unselect the current box to ship this order!',
					 null, null, {style:'warning'}
				)
				return false
			}	
		}
		
		var selected = !order.selected; 
		unselectOrders();				
		order.selected = selected;		
		if(order.selected){								
			if(order.prep_instructions != ''){
				msgbox.showMsg(order.prep_instructions);
			}

	    	//provide boxPicker with copy of current order
	    	boxPicker.currentOrder = order;  	    	
	    	labelPrinter.setLable(order);
	    	if(boxPicker.autoFilter){
	    		pickedBoxes.filters.vendor_code = order.vendor_code
	    		pickedBoxes.filters.fulfillment_center = order.fulfillment_center
	    		pickedBoxes.filter();
	    	}

	    	boxPicker.pickedUnits = 0;
	    	boxPicker.boxes = 1;
	    	//select units textbox
	    	$('#unitsTxb').select(); 
	    	boxPicker.state.save();      
		}else{				
			boxPicker.currentOrder = {};   
			boxPicker.state.save();
		}
		
	}	

	function submitItem(){
		if(boxPicker.currentOrder){
			//validate pickedUnits
			if(boxPicker.pickedUnits  === undefined || boxPicker.boxes === undefined){
				console.log('msgbox '  + boxPicker.currentOrder.in_stock_units + ' is the max number of units that can be shipped on this order');
				msgbox.showMsg('The number of units you are trying to ship cannot be shipped on this order!');
				return false
			}
			//don't allow user to ship if labels are required and user did not scan asin
			if(osh.searchText != boxPicker.currentOrder.asin && boxPicker.currentOrder.labels_required){
				console.log('msgbox: Please scan ASIN to ship!');
				msgbox.showMsg('Please Scan ASIN to ship!');
				return false
			}

			
			if(boxPicker.pickedUnits * boxPicker.boxes > 0){					
				submitItem.runTasks(function(err, results){
					if(err){
						console.log(err);
					}else{
						console.log(results);
					}
				}, boxPicker.pickedUnits, boxPicker.boxes);
				boxPicker.pickedUnits = 0;
				boxPicker.boxes = 1;		
			}				
		}
	}

	function unselectOrders(){
		for (var i = 0; i < osh.orders.length; i++) {
			osh.orders[i].selected = false;
		}
		boxPicker.multiBox = false;
	}

	function multiBoxChange(){
		boxPicker.boxes = 1;
		if(boxPicker.multiBox){
			boxPicker.currentBox = null;
		}
	}

	var submitItem = new tasks.multiTaskHandler(function(_pickedUnits, _boxCount){
		var order_line, new_boxes, pickedItem;

		function refreshOrder(nextTask){
			var request = _client.generateRequestObj('submitItem > refreshOrder @boxingMod'); 

			request.mongoQuery.find = {_id:boxPicker.currentOrder._id};

			$$db.collection('orders').find(request, function(data){
            	order_line = data[0]; 
            	console.log(order_line);
            	nextTask();	
            })
		}

		function revalidateQuantites(nextTask){
			//can the pickedUnits be shipped on this order line
			if(order_line.in_stock_units >= _pickedUnits * _boxCount){
				nextTask();
			}else{
				console('msgbox: the quantity cannot be shipped on this order')
				//then refresh order line
				osh.searchTxbKeydown({which:13})
			}
		}

		function boxOrder(nextTask){
			pickedItem = cloneKeys(boxPicker.currentOrder, ['_id', 'pf_sku', 'asin', 'multiple', 'title'])

			pickedItem.pickedUnits = _pickedUnits;

			if(boxPicker.currentBox){
				addToBox(nextTask);
			}else{				
				createBoxes(nextTask);
			}				
		}			

		function createBoxes(nextTask){			
			var new_box = cloneKeys(boxPicker.currentOrder, ['amazon_po', 'vendor_code', 'fulfillment_center'])
			new_box.created_date = Date();

			var request = _client.generateRequestObj('submitItem > createBoxes @boxingMod');
			request.boxes =[];

			new_box.boxContents =[];
			new_box.boxContents.push(pickedItem);

			if(boxPicker.multiBox){
				for (var i = 0; i < _boxCount; i++) {
					request.boxes.push(cloneKeys(new_box))
				}
			}else{
				request.boxes.push(new_box)
			}							

			$$db.boxing.insertBoxes(request, function(err, data){
				if(err){
					console.log(err);
				}else{
					console.log(data);
					new_boxes = data;					
					nextTask();
				}
			})
		}

		function addToBox(nextTask){
			var request = _client.generateRequestObj('submitItem > addToBox @boxingMod');

			request.pickedItem = pickedItem;
			request.box_id = boxPicker.currentBox._id;
			$$db.boxing.addToBox(request, function(err, data){
				if(err){
					console.log(err);
				}else{
					console.log(data);
					nextTask();
				}
			})
		}


		function updateOrder(nextTask){
			var request = _client.generateRequestObj('submitItem > updateOrder @boxingMod');

			request.pickedUnits = _pickedUnits * _boxCount;
			request.pickedOrder = boxPicker.currentOrder;

			$$db.boxing.updateOrder(request, function(err, data){
				if(err){
					console.log(err);
				}else{
					if(data.status === 'rejected'){
						//
						undoBoxing();
					}else{
						console.log(data);

						if(new_boxes){
							labelPrinter.printBoxLabels(new_boxes)
						}
						nextTask();
					}
					
				}
			})
		}

		function _refresh(nextTask){
			refresh();
			if(!(boxPicker.currentBox)){
				boxSearchKeydown({which:13}, new_boxes[0].box_id);
			}															
			nextTask();
		}

		function undoBoxing(){
			//order wasn't updated undo box			

			if(boxPicker.currentBox){

				$$msgbox.msgBack.style = 'warning';
				$$msgbox.showMsg('Error While Adding Item To Box!!!');
			}else{	
				var request = _client.generateRequestObj('submitItem > updateOrder @boxingMod');

				var _ids = uniqueKeys(new_boxes, '_id')
				request.mongoQuery.delete = {_id:{$in:_ids}};
				$$db.collection('boxes').delete(request, function(data){
					console.log('delete boxes success')
					console.log(data);
				})
			}
		}

		return {
			refreshOrder:refreshOrder,
			revalidateQuantites:revalidateQuantites,
			boxOrder:boxOrder,
			updateOrder:updateOrder,
			_refresh:_refresh
		}
	})	

	function undoItem(box, item, callBack){
		var request = _client.generateRequestObj('undoItem > boxPicker @boxingMod');
		request.pickedItem = item;		
		request.box_id = box._id;

		$$db.boxing.undoBoxing(request, function(err, data){
			if(err){
				if(typeof callBack === 'function'){callBack(err);}
			}else{
				
				if(typeof callBack === 'function'){callBack(null, data)}
				refresh()
			}
		})
	}

	function refresh(callBack){
		if(boxPicker.currentBox){					
			boxSearchKeydown({which:13}, boxPicker.currentBox.box_id);
		}
		
		osh.searchTxbKeydown({which:13}, function(){
			for (var i = 0; i < osh.orders.length; i++) {
				if(osh.orders[i]._id === boxPicker.currentOrder._id){
					boxPicker.setCurrentOrder(osh.orders[i]);
				}
			}
		});

		pickedBoxes.getBoxes();	
	}
		
}])

.service('pickedBoxes',['orderSearchHandler', 'tasks', '_client', '$$db', '$$msgbox', function(osh, tasks, _client, $$db, msgbox){
	
	var pickedBoxes = this;
	pickedBoxes.getBoxes = getBoxes;
	pickedBoxes.showAll = false; 
	pickedBoxes.showAllContents = showAllContents;
	pickedBoxes.selectAll = false;
	pickedBoxes.selectAllBoxes = selectAllBoxes;
	pickedBoxes.undoBoxes = removeItems;
	pickedBoxes.deleteCurrentBox = deleteCurrentBox;
	pickedBoxes.filter = filter;		

	pickedBoxes.filters = {};
	pickedBoxes.filters.box_id = '';
	pickedBoxes.filters.vendor_code = '';
	pickedBoxes.filters.fulfillment_center = '';
	pickedBoxes.filters.asin = '';
	pickedBoxes.filters.pf_sku = '';
	pickedBoxes.clearFilter = clearFilter;
	pickedBoxes.filterSelection = filterSelection;		

	pickedBoxes.increaseScrollLimit = function(){
        //used on ng-repeat param 'limitTo'
        pickedBoxes.scrollLimit+=10;
    }
    pickedBoxes.resetScrollLimit = function(){
        pickedBoxes.scrollLimit = 200;            
    }
    pickedBoxes.resetScrollLimit();

	function getBoxes(){
		var request = _client.generateRequestObj('pickedBoxes > getBoxes @boxingMod'); 

		request.mongoQuery.find = {sessionStatus:'open'};

		$$db.collection('boxes').find(request, function(data){				
	    	pickedBoxes.boxes = data;
	    	pickedBoxes.filteredBoxes = pickedBoxes.boxes;
	    	pickedBoxes.selectAll = false;
	    	console.log(data);
	    	filter()
	    })
	}

	function isSubText(subText, fullText){ //create a procedure to handle multi comma seperated string filters
        var regx;
        //create a RegExp from the tblHead subText1
        regx = '/*' + subText.trim().toUpperCase() + '/*';

        var pattern = new RegExp(regx);
        //check the RegExp for each filter value against its curresponding property value
        return pattern.test((fullText + "" ).trim().toUpperCase()) || subText === '';
    }

	function filter(){				
		var filteredBoxes = [];			
		pickedBoxes.selectionFilter = false;

		for (var i = 0; i < pickedBoxes.boxes.length; i++) {
			var isMatch = true;

			isMatch = isSubText(pickedBoxes.filters.box_id, pickedBoxes.boxes[i].box_id) 
				&& isSubText(pickedBoxes.filters.vendor_code, pickedBoxes.boxes[i].vendor_code) 
				&& isSubText(pickedBoxes.filters.fulfillment_center, pickedBoxes.boxes[i].fulfillment_center);

			if(isMatch){
				for (var n = 0; n < pickedBoxes.boxes[i].boxContents.length; n++) {
					isMatch = isSubText(pickedBoxes.filters.asin, pickedBoxes.boxes[i].boxContents[n].asin)
						&& isSubText(pickedBoxes.filters.pf_sku ,pickedBoxes.boxes[i].boxContents[n].pf_sku);

					if(isMatch){break}
				}
			}				
			
			if(isMatch){filteredBoxes.push(pickedBoxes.boxes[i])}
		}

		pickedBoxes.state.save();
		pickedBoxes.filteredBoxes = filteredBoxes;
	}

	function clearFilter(){
		pickedBoxes.filteredBoxes = pickedBoxes.boxes;
		var pNames = Object.getOwnPropertyNames(pickedBoxes.filters)
		for (var i = 0; i < pNames.length; i++) {
			pickedBoxes.filters[pNames[i]] = ''
		}
		pickedBoxes.selectionFilter = false;
		pickedBoxes.state.save();
	}

	function filterSelection(){				
		clearFilter();

		var filteredBoxes = [];
		for (var i = 0; i < pickedBoxes.filteredBoxes.length; i++) {
			if(pickedBoxes.filteredBoxes[i].selected){
				filteredBoxes.push(pickedBoxes.boxes[i])
			}
		}
		pickedBoxes.filteredBoxes = filteredBoxes;		
		pickedBoxes.selectionFilter = true;				
	}

	function showAllContents(_show){
		pickedBoxes.showAll = _show	|| !pickedBoxes.showAll;

		for (var i = 0; i < pickedBoxes.filteredBoxes.length; i++) {
			pickedBoxes.filteredBoxes[i].show = pickedBoxes.showAll;
		}
	}

	function selectAllBoxes(){			
		for (var i = 0; i < pickedBoxes.filteredBoxes.length; i++) {
			pickedBoxes.filteredBoxes[i].selected = pickedBoxes.selectAll
		}
	}

	var multiBoxDelete = new tasks.multiTaskHandler(function(_boxes){
		var pickedItems = [], indexHolder = [];

		function compileOrderLines(nextTask){
			//gather orderlines from multiple boxes
			for (var i = 0; i < _boxes.length; i++) {
				for (var n = 0; n < _boxes[i].boxContents.length; n++) {

					var index = indexHolder.indexOf(_boxes[i].boxContents[n]._id)
					if(index > -1){
						pickedItems[index].pickedUnits = pickedItems[index].pickedUnits + _boxes[i].boxContents[n].pickedUnits;
					}else{
						pickedItems.push(cloneKeys(_boxes[i].boxContents[n]));
						indexHolder.push(_boxes[i].boxContents[n]._id);
					}						
				}					
			}
			console.log(pickedItems)

			if(pickedItems.length > 0){
				nextTask();
			}				
		}

		function undoOrderLines(nextTask){

			var request = _client.generateRequestObj('undoOrderLines @boxingMod');

			request.pickedItems = pickedItems;
			$$db.boxing.undoOrders(request, function(err, data){
				if(err){
					console.log(err);
				}else{
					console.log(data);
					nextTask();
				}
			})				
		}

		function undoBoxes(nextTask){
			console.log(_boxes);
			var box_ids = uniqueKeys(_boxes, 'box_id');
			console.log(box_ids);
			var request = _client.generateRequestObj('undoBoxes @boxingMod');

			request.mongoQuery.find = {box_id:{$in:box_ids}};
			request.mongoQuery.update = {$set:{boxContents:[]}};
			request.mongoQuery.options = {multi:true};

			$$db.collection('boxes').update(request, function(data){
				nextTask();
			})								
		}

		function refresh(nextTask){
			osh.searchTxbKeydown({which:13});
			pickedBoxes.getBoxes();	
			nextTask();

		}

		return {
			compileOrderLines:compileOrderLines,
			undoOrderLines:undoOrderLines,
			undoBoxes:undoBoxes,
			refresh:refresh
		}
	})

	function removeItems(){		
		if(pickedBoxes.filteredBoxes.length > 0){
			pickedBoxes.filterSelection();
			pickedBoxes.showAllContents(true);
			msgbox.button1.caption = 'Yes';
			msgbox.button1.clickAction = doItemRemoval;
			msgbox.button2.caption = 'No';
			msgbox.button2.show = true;
			msgbox.showMsg('Are you sure you want to remove all items from the selected boxes? (' + pickedBoxes.filteredBoxes.length + ' selected)')						
		}else{
			clearFilter()
		}
			
	}

	function doItemRemoval(){
		var boxes = [];
		for (var i = 0; i < pickedBoxes.filteredBoxes.length; i++) {
			if(pickedBoxes.filteredBoxes[i].selected === true){
				boxes.push(pickedBoxes.filteredBoxes[i])
			}
		}
		if(boxes.length > 0){
			multiBoxDelete.runTasks(function(err, results){
				if(err){
					console.log(err);
				}else{
					console.log(results);
					clearFilter();
				}
			}, boxes);	
		}
	}
	function deleteCurrentBox(box){	
		if(box.boxContents.length > 0){		
			msgbox.button1.caption = 'Yes';
			msgbox.button1.clickAction = function(){doCurrentBoxDelete(box)}
			msgbox.button2.caption = 'No';
			msgbox.button2.show = true;
			msgbox.showMsg('Are you sure you want to remove all items from the Current Box?')													
		}
	}

	function doCurrentBoxDelete(box){
		multiBoxDelete.runTasks(function(err, results){
			if(err){
				console.log(err);
			}else{
				console.log(results);
				box.boxContents = [];
				getBoxes();
			}
		}, [box]);
	}

}])

.service('productEditor', ['tasks', '_client', '$$db', '$$msgbox', '$$eachesCalc', function(tasks, _client, $$db, msgbox, eachesCalc){
	
	var productEditor = this;
	productEditor.searchType = 'pf_skus';
	productEditor.searchText = '';
	productEditor.show = false;
	productEditor.addUPC_msg = addUPC_msg;

	productEditor.searchTxbKeydown = searchTxbKeydown;	

	productEditor.headers = [
		{
            pName:'sku',
            fieldName:'SKU',               
            processData: function(data, json){
                if(json.deprecated){
                	return data + ''
                }
                return data;
            }
        },
        {
            pName:'description',
            fieldName:'Title',               
            processData: function(data){
                return data;
            }
        },
        {
            pName:'is_set',
            fieldName:'IS SET',               
            processData: function(data){
                return data;
            }
        },
        {
            pName:'set_breakdown',
            fieldName:'SET BREAKDOWN',               
            processData: function(data, json){
            	if(json.is_set){
            		return eachesCalc(json.set_breakdown).toSKU_HTML();
            	}
                
                return 'N/A'
            }
        },
        {
            pName:'upcs',
            fieldName:'UPCs',               
            processData: function(data){
                return data.join(', ');
            }
        }                                          
	] 


	var productSearch = new tasks.multiTaskHandler(function(){
		var products = [];
		function getASINs(nextTask){
			var request = _client.generateRequestObj('productSearch in productEditor in boxing.js')

			request.mongoQuery.find = {asin:productEditor.searchText}

			$$db.collection('asinData').find(request, function(data){
            	if(data.length > 0 ){
            		var query = {sku:{$in:uniqueKeys(data, 'pf_sku')}}
            		getProducts(nextTask, query);	
            	}	            	
            })
		}

		function getProducts(nextTask, mq){
			var request = _client.generateRequestObj('getProducts in productEditor in boxing.js')

			if(!(mq)){
				mq = {};
				mq.$or = [];
				mq.$or.push({sku:productEditor.searchText});
				mq.$or.push({alternative_sku:productEditor.searchText});
				mq.$or.push({upcs:productEditor.searchText});
				mq.$or.push({"set_breakdown.sku":productEditor.searchText});
			}

			request.mongoQuery.find = mq

			$$db.collection('pf_skus').find(request, function(data){
				productEditor.products = data;
				nextTask(null, data);
			})				
		}

		return{
			getASINs:getASINs,
			getProducts:getProducts,				
		}
	})

	function addUPC_msg(prod){
		if(prod.new_upc != ''){
			msgbox.button1.caption = 'Yes';
			msgbox.button1.clickAction = function(){addUPC(prod)}
			msgbox.button2.caption = 'No';
			msgbox.button2.show = true;	
			msgbox.msgBack.style = 'warning';
			msgbox.showMsg('Are you sure you want to add ' + prod.new_upc + ' to SKU ' + prod.sku + '?')
		}
			
	}

	function addUPC(prod){
		var request = _client.generateRequestObj('addUPC in productEditor boxing.js');

		var update = {};
		request.mongoQuery.find = {_id:prod._id};
		request.mongoQuery.update = {$push:{upcs:prod.new_upc}};
		
		request.parse_id = true;

		$$db.collection('pf_skus').update(request, function(data){
			console.log(data);
			productEditor.searchTxbKeydown({which:13})
		})
	}

	function searchTxbKeydown(keyEvent, callBack){
		productEditor.searchText = productEditor.searchText.toUpperCase();
		if(keyEvent.which === 13){									
			productEditor.products = [];
			if(productEditor.searchType === 'asinData'){
				productSearch.getASINs(function(err, results){
					if(err){
						console.log(err);
					}else{
						console.log(results)
					}
				})
			}else{
				productSearch.getProducts(function(err, results){
					if(err){
						console.log(err);
					}else{
						console.log(results)
					}
				})
			}
		}
	}

}])

.service('labelPrinter', ['_client', '$$db', 'orderSearchHandler', function(_client, db, orderSearchHandler){

	var lp = this;

	lp.setLable = setLable;
	lp.printKitLabel = printKitLabel;
	lp.quickPrint = quickPrint;
	lp.printBoxLabels = printBoxLabels;

	lp.label = {};
	lp.label.fields = {};
	lp.labels_needed = 0;
	lp.order_line = {};

	function setLable(order_line){
		lp.label.fields.SKU = order_line.pf_sku + '-X' + order_line.multiple;
		lp.label.fields.SKUBARCODE = '*' + order_line.asin	+ '*';
		lp.label.fields.DESCRIPTION = order_line.title;
		lp.label.copies = (order_line.labels_needed  === null)? order_line.in_stock_units:order_line.labels_needed ;
		lp.labels_needed = lp.label.copies;

		lp.order_line = order_line;
	}

	function recordLabesl(){
		var request = _client.generateRequestObj('recordLabesl	 > labelPrinter > boxingMod');	

		request.order_id = lp.order_line._id;
		request.copies = lp.label.copies;
			
		db.boxing.recordLabesl(request, function(err, results){
			if(results){
				orderSearchHandler.searchTxbKeydown({which:13})
			}
		})					
	}

	function printKitLabel(label){
		if(isValidLabel(label)){
			printLabels([label], 'kit-labels', recordLabesl)
		}
	}

	function printLabels(labels, type, callBack){
		var request = _client
	
		var printJob = {				
			type:type,
			date:Date(),
			labels:labels
		}


		var request = _client.generateRequestObj('printLabels > labelPrinter > boxingMod');	
		
		request.printJobs = [printJob];

		db.labelPrinter.printLabels(request, function(data){
			console.log(data);
			if(typeof callBack === 'function'){callBack()}
		})
		
	}

	function isValidLabel(label){
	
		if(label.copies <=0){return false}

		var valid = true;
		var fNames = Object.getOwnPropertyNames(label.fields);
		
		for (var i = 0; i < fNames.length; i++) {
			valid = label.fields[fNames[i]] != '';
			if(!valid){break}
		}	

		return valid	
	}

	function quickPrint(order_line){
		setLable(order_line);
		printKitLabel(lp.label);
	}

	function printBoxLabels(boxes){
		var labels = [];
		for (var i = 0; i < boxes.length; i++) {
			var boxLabel = {fields:{}};
			boxLabel.copies	= 1;
			
			boxLabel.fields.BOXCOUNT = boxes[i].boxNumber + '';
			boxLabel.fields.SKUBARCODE = '*' + boxes[i].box_id + '*';
			boxLabel.fields.ORDERNUMBER = boxes[i].vendor_code	+ '-' + boxes[i].fulfillment_center;
			boxLabel.fields.BOXDATE = boxes[i].session;
			boxLabel.fields.SESSION = moment().format("M/D/YY");
			boxLabel.fields.LABEL = 'Session: ';

			labels.push(boxLabel)
		}
		printLabels(labels, 'box-labels')		
	}
}])
/*
var testPrintJob = {	
	type:'kit-labels',
	date:Date(),
	labels:[
		{
			copies:10,
			fields:{
				SKU:'ABETEST123',
				SKUBARCODE:'*TESTPROD*',
				DESCRIPTION:'TEST PRODUCT'
			}
		}
	]	
}
var testPrintJob2 = {	
	type:'box-labels',
	date:Date(),
	labels:[
		{
			copies:10,
			fields:{
				BOXCOUNT:'1',
				SKUBARCODE:'*A10456000001*',
				ORDERNUMBER:'E10456',
				BOXDATE:'A',
				SESSION:'03/30/2017',
				LABEL:'Session:'
			}
		}
	]	
}
*/
.filter('$$unsafe', function($sce) { 

    return function(data){

        if(!isNaN(data) && data !== null){
            data = data.toString();
        }
        return $sce.trustAsHtml(data); 
    }
})