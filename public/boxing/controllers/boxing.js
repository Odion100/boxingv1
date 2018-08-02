angular.module('boxingMod', [])

.controller('boxingCtrl', ['$scope', 'orderSearchHandler', 'boxPicker', 'pickedBoxes' , 'productEditor', 'labelPrinter', 'stateHandler', '$$msgbox', '_client', '$stateParams',  function($scope, orderSearchHandler, boxPicker, pickedBoxes, productEditor, labelPrinter, stateHandler, $$msgbox, _client, stateParams){

	$scope.$$msgbox	= $$msgbox;		
	$scope.osh = orderSearchHandler;
	$scope.pickedBoxes = pickedBoxes;
	$scope.boxPicker = boxPicker;
	$scope.productEditor = productEditor
	$scope.labelPrinter = labelPrinter;
	
	$scope.stateParams = stateParams;
	$scope.loginFrm = stateHandler.loginFrm;    
        
	orderSearchHandler.state = new stateHandler.addState(orderSearchHandler, 'osh', ['searchText']);
	boxPicker.state = new stateHandler.addState(boxPicker, 'boxPicker', ['autoFilter', 'currentBox', 'currentOrder']);	
	pickedBoxes.state = new stateHandler.addState(pickedBoxes, 'pb', ['filters'])

	function clearBoxPicker(){
		boxPicker.currentOrder = {};
	}	
	function refreshAll(){	
			
		var currentOrder = {};
		if(boxPicker.currentOrder){
			currentOrder._id = boxPicker.currentOrder._id;
			
		}
		boxPicker.currentBox = boxPicker.currentBox||{};
		if(boxPicker.currentBox._id){					
			boxPicker.boxSearchKeydown({which:13}, boxPicker.currentBox.box_id);
		}
		
		pickedBoxes.getBoxes();
		//if(orderSearchHandler.orders === undefined){
		if(orderSearchHandler.searchText != ''){			
			$$msgbox.enable = false;
			orderSearchHandler
			.orderLookup.runTasks(function(err, results){
				$$msgbox.enable = true;
				if(results){
					orderSearchHandler.orders = results;				
				}
			}, orderSearchHandler.searchText)			
		}		
		//}
	}
	stateHandler.init(refreshAll);
	orderSearchHandler.clearBoxPicker = clearBoxPicker;
	orderSearchHandler.refreshAll = refreshAll;
	boxPicker.refreshAll = refreshAll;
	pickedBoxes.refreshAll = refreshAll;
	labelPrinter.refreshAll = refreshAll;

	console.log(stateHandler)
	
	$scope.test = function(text){

		if(stateHandler.user.access_level >= 10){
			$$msgbox.button1.caption = 'Yes';
			$$msgbox.button1.clickAction = function(){
				if(pickedBoxes.sessionStatus !== 'closed'){
					pickedBoxes.sessionStatus = "closed";
					boxPicker.sessionStatus = "closed";
					pickedBoxes.getBoxes()
				}
			};
			$$msgbox.button2.caption = 'No';
			$$msgbox.button2.show = true;
			$$msgbox.button2.clickAction = function(){
				if(pickedBoxes.sessionStatus !== 'open'){
					pickedBoxes.sessionStatus = "open";
					boxPicker.sessionStatus = "open";
					pickedBoxes.getBoxes()
				}
			};
			$$msgbox.showMsg('View closed Sessions?')		
		}
		console.log($scope)
		//labelPrinter.printAmznLabel(pickedBoxes.filteredBoxes)
		
	}
}])	

.service('orderSearchHandler',['tasks', '_client', '$$db', '$$eachesCalc', '$$msgbox', function(tasks, _client, $$db, $$eachesCalc, msgbox){
	var osh = this;
	osh.searchText = "";
	osh.searchTxbKeydown = searchTxbKeydown;		
	osh.orders = [];

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
            pName:'amazon_po',
            fieldName:'Amazon PO',               
            processData: function(data){
                return data;
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
            fieldName:'Expected Ship',               
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
				//mq.$or.push({alternative_sku:searchText});
				mq.$or.push({upcs:searchText});
				mq.$or.push({vendor_skus:searchText});
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

			if(asins.length > 0 || skus.length > 0){

				//because we can't know what the user searched
				//a sku, upc or keyword search may return skus that are part of a set
				//So now lets search both collections by sku, set_skus and alt_skus 
				//and then grab all asins matching the skus returned by searching the asins' pf_sku field
				if(asins[0]){
					if(asins[0].asin === searchText){
						query = {sku:asins[0].pf_sku}
						skuDataSearch(function(){
							nextTask()
						}, query)
						return
					}
				}

				var unique_skus = uniqueKeys(skus, 'sku')
				for (var i = 0; i < asins.length; i++) {
					if(unique_skus.indexOf(asins[i].pf_sku) === -1){
						unique_skus.push(asins[i].pf_sku)
					}					
				}

				query = {$or:[{sku:{$in:unique_skus}}, {"set_breakdown.sku":{$in:unique_skus}}, {alternative_sku:{$in:unique_skus}}]}
				
				skuDataSearch(function(){
					query = {pf_sku:{$in:uniqueKeys(skus, 'sku')}}
					asinsDataSearch(nextTask, query);
				}, query)
			}else{
				console.log('msg: no products found!!!')
				msgbox.showMsg('No products found while searching ' + osh.searchText + '!')
				nextTask({errMsg:'No products found while searching'})
			}
		}

        function getOrders(nextTask){   
        	if(asins){             
	            var request = _client.generateRequestObj('getOrders @boxingMod');    
				//var mq = {asin:{$in:uniqueKeys(asins, 'asin')}};
				var mq = {$and:[{asin:{$in:uniqueKeys(asins, 'asin')}}, {in_stock_units:{$gte:1}}, {pause:{$ne:true}}]};											

	            request.mongoQuery.find = mq;

	            $$db.collection('orders').find(request, function(data){
	                orders = data;
	                if(data.length	=== 0){
	            		msgbox.showMsg('No Orders found for this item!')   
	            		osh.orders = []; 	
	                }else{
	                	nextTask();		
	                }                		                	                
	            })
            }else{
            	console.log('msg: no asin found!!! 2')
            	nextTask({errMsg:'msg: no asin found'})	            	
            }
        }		        

        function combineProdData(nextTask){
        	
        	for (var i = 0; i < asins.length; i++) {	        		
        		for (var n = 0; n < skus.length; n++) {
        			if(asins[i].pf_sku === skus[n].sku){        				
        				asins[i].is_set = skus[n].is_set;
        				if(skus[n].is_set){
        					asins[i].unit_breakdown = skus[n].set_breakdown        	
        					asins[i].item_weight = 0;				
        					for (var a = 0; a < skus[n].set_breakdown.length; a++) {
        						asins[i].item_weight = asins[i].item_weight + (skus[n].set_breakdown[a].weight * skus[n].set_breakdown[a].multiple);
        					}
        				}else{
        					asins[i].item_weight = skus[n].weight * asins[i].multiple ||0;
        					asins[i].unit_breakdown = [
	        					{
	        						sku:asins[i].pf_sku,
	        						multiple:asins[i].multiple
	        					}
        					]
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
        				orders[i].item_weight = asins[n].item_weight;
        				orders[i].is_set = asins[n].is_set;        				

        				var calc = $$eachesCalc(orders[i].unit_breakdown);                                                        
                        orders[i].in_stock_units = (orders[i].unit_breakdown) ? calc.eaches(orders[i].in_stock_eaches).toUnits():-1;                                   
                       
                       	orders[i].labeled_units = orders[i].labeled_units||0; 
                       	orders[i].labels_needed = Math.max(orders[i].in_stock_units - orders[i].labeled_units, 0);
                       	orders[i].sku_x = $$eachesCalc(orders[i].unit_breakdown).toSKU();
                       	//if the expected ship plus 8 days is before today
						orders[i].outdated = moment(orders[i].expected_ship_date).add(15, 'days').isBefore(moment())
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
	}).setTasksAsync(['skuDataSearch', 'asinsDataSearch'], ['getMissingData', 'getOrders', 'combineProdData'])
	osh.orderLookup = orderLookup;

	function searchTxbKeydown(keyEvent, callBack, searchText){
		osh.searchText = osh.searchText.toUpperCase();
		searchText = searchText || osh.searchText
		
		if(keyEvent.which === 13){
			osh.orders = [];
			osh.clearBoxPicker();
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

.service('boxPicker',['orderSearchHandler', 'pickedBoxes', 'labelPrinter', 'tasks', '_client', '$$db', '$$msgbox', 'stateHandler', '$stateParams', function(osh, pickedBoxes, labelPrinter, tasks, _client, $$db, msgbox, stateHandler, stateParams){
	
	var boxPicker = this;

	boxPicker.boxes = 1;
	boxPicker.pickedUnits = 0;
	boxPicker.multiBox = false;
	boxPicker.boxes = 1;
	boxPicker.setCurrentOrder =setCurrentOrder;
	boxPicker.submitItem = submitItem;
	boxPicker.multiBoxChange = multiBoxChange;
	boxPicker.boxSearchKeydown = boxSearchKeydown;		
	boxPicker.autoFilter = true;	
	boxPicker.currentBox = {};			
	boxPicker.undoItem = undoItemPrompt;
	boxPicker.submitItemKeydown = submitItemKeydown;
	boxPicker.currentOrder = {};

	boxPicker.sessionStatus = 'open';	

	boxPicker.boxHeaders = [
		{
            pName:'asin',
            fieldName:'ASIN',               
            processData: function(data){
                return '<a href="https://www.amazon.com/dp/' + data + '" target="_blank" class="ng-binding">' + data + '</a>';
            }
        },
        /*{
            pName:'amazon_po',
            fieldName:'Amazon PO',               
            processData: function(data){
                return data;
            }
        },*/
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
		searchText = searchText || '';
		if(keyEvent.which === 13){
			boxPicker.currentBox = {};
			var request = _client.generateRequestObj('boxSearchKeydown @boxingMod'); 
			var location = (stateParams.location.toUpperCase() == 'NY')? 'NY':'NJ';
			request.mongoQuery.find = {$and:[{box_id:searchText}, {sessionStatus:boxPicker.sessionStatus}, {ship_from:location}]} ;

			$$db.collection('boxes').find(request, function(data){
				if(data.length > 0){

					if(boxPicker.currentOrder.fulfillment_center != data[0].fulfillment_center || boxPicker.currentOrder.vendor_code != data[0].vendor_code){
						unselectOrders()
					}

					boxPicker.multiBox = false;
					boxPicker.boxes = 1;

					boxPicker.currentBox = data[0];					
					console.log(boxPicker.currentBox);
				}
				boxPicker.state.save();
			})
		}	
	}

	function setCurrentOrder(order){				

		if(stateHandler.user.access_level < 10 && order.outdated){
			msgbox.showMsg('SEE MANAGER TO SHIP!!!', null, null, {style:'warning'})
			return false
		}

		if(boxPicker.currentBox._id){			
			if(order.vendor_code + order.fulfillment_center != boxPicker.currentBox.vendor_code + boxPicker.currentBox.fulfillment_center){

				console.log('msgbox: this order cannot be shipped with the current box')
				var msg = 'The order you selected does not match the current box!' 
				msg += '<br><br> Do you want to clear the current box?'
				msgbox.button1.caption = 'Yes';
				msgbox.button1.clickAction = function(){
					boxPicker.currentBox = {}
					doit();
				}
				msgbox.button2.caption = 'No';
				msgbox.button2.show = true;
				msgbox.showMsg(
					msg,
					 null, null, {style:'warning'}
				)
				return false
			}else{
				doit();
			}	
		}else{
			doit()
		}

		function doit(){
			var selected = !order.selected; 
			unselectOrders();				
			order.selected = selected;		
			if(order.selected){								
				if(order.prep_instructions != '' && order.asin != osh.searchText){
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
	}	

	function submitItemKeydown(keyEvent, open){
		if(keyEvent.which === 13){
			submitItem(open);
		}
	}
	function submitItem(open){
		if(boxPicker.currentOrder._id){
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

			var isOpen = (boxPicker.currentBox._id) || (!boxPicker.multiBox && open)

			if(boxPicker.pickedUnits * boxPicker.boxes > 0 && boxPicker.currentOrder._id){					
				itemSubmit.runTasks(function(err, results){
					if(err){
						console.log(err);
					}else{
						console.log(results);
					}
				}, boxPicker.pickedUnits, boxPicker.boxes, isOpen);
				boxPicker.pickedUnits = 0;
				boxPicker.boxes = 1;		
			}				
		}else{
			msgbox.showMsg('Select the order you want to ship!!!')	
		}
	}

	function unselectOrders(){
		for (var i = 0; i < osh.orders.length; i++) {
			osh.orders[i].selected = false;
		}
		boxPicker.multiBox = false;
		boxPicker.boxes = 1;
		;
		boxPicker.currentOrder = {};
	}

	function multiBoxChange(){
		boxPicker.boxes = 1;
		if(boxPicker.multiBox){
			boxPicker.currentBox = {};
			setTimeout(function(){
				$('#box-count').select();
			})
		}
	}

	var itemSubmit = new tasks.multiTaskHandler(function(_pickedUnits, _boxCount, open){
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
				msgbox.showMsg('msgbox: the quantity cannot be shipped on this order')
				//then refresh order line
				osh.searchTxbKeydown({which:13})
			}
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
						rejectedMsg();
					}else{
						console.log(data);						
						nextTask();
					}
					
				}
			})
		}

		function boxOrder(nextTask){
			pickedItem = cloneKeys(boxPicker.currentOrder, ['_id', 'pf_sku', 'asin', 'multiple', 'item_weight', 'title', 'amazon_po'])

			pickedItem.pickedUnits = _pickedUnits;

			if(boxPicker.currentBox._id){
				addToBox(nextTask);
			}else{				
				createBoxes(nextTask);
			}				
		}			

		function createBoxes(nextTask){			
			var new_box = cloneKeys(boxPicker.currentOrder, ['amazon_po', 'vendor_code', 'fulfillment_center'])
			
			var request = _client.generateRequestObj('submitItem > createBoxes @boxingMod');
			request.boxes =[];
			
			new_box.boxContents =[];
			new_box.boxContents.push(pickedItem);
			new_box.open = open;
			new_box.user = stateHandler.loginFrm.username;
			new_box.ship_from = (stateParams.location.toUpperCase() == 'NY')? 'NY':'NJ';

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
					if(new_boxes){
						if(new_boxes[0].open){							
							labelPrinter.printBoxLabels(new_boxes)
						}else{
							labelPrinter.printAmznLabel(new_boxes)
						}
					}

					ding();					
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
					ding();	
					nextTask();
				}
			})
		}		

		function _refresh(nextTask){
			boxPicker.refreshAll();
			if(!(boxPicker.currentBox._id) && new_boxes){
				boxSearchKeydown({which:13}, new_boxes[0].box_id);
			}															
			nextTask();
		}

		function rejectedMsg(){
			//order wasn't updated undo box			

			if(boxPicker.currentBox._id){

				msgbox.msgBack.style = 'warning';
				msgbox.showMsg('Error While Adding Item To Box!!!');
				boxPicker.refreshAll();
			}else{	

				msgbox.msgBack.style = 'warning';
				msgbox.showMsg('Error While Creating New Box!!!');	
				boxPicker.refreshAll();			
			}
		}

		return {
			refreshOrder:refreshOrder,
			revalidateQuantites:revalidateQuantites,
			updateOrder:updateOrder,
			boxOrder:boxOrder,			
			_refresh:_refresh
		}
	})	

	function undoItemPrompt(box, item, callBack){
		msgbox.button1.caption = 'Yes';
		msgbox.button1.clickAction = function(){undoItem(box, item)}
		msgbox.button2.caption = 'No';
		msgbox.button2.show = true;
		msgbox.showMsg('Are you sure you want to remove this item from the Current Box?')
	}

	function undoItem(box, item, callBack){
		var request = _client.generateRequestObj('undoItem > boxPicker @boxingMod');
		request.pickedItem = item;		
		request.box_id = box._id;

		$$db.boxing.undoBoxing(request, function(err, data){
			if(err){
				if(typeof callBack === 'function'){callBack(err);}
			}else{
				
				if(typeof callBack === 'function'){callBack(null, data)}
				boxPicker.refreshAll();
			}
		})
	}
	
	function ding(){
        var audio = $("#positive_ding")[0];
        audio.play();

    }		
}])

.service('pickedBoxes',['orderSearchHandler', 'tasks', '_client', '$$db', '$$msgbox', 'labelPrinter', '$stateParams', function(osh, tasks, _client, $$db, msgbox, labelPrinter, stateParams){
	
	var pickedBoxes = this;
	pickedBoxes.getBoxes = getBoxes;
	pickedBoxes.showAll = false; 
	pickedBoxes.showAllContents = showAllContents;
	pickedBoxes.selectAll = false;
	pickedBoxes.selectAllBoxes = selectAllBoxes;
	pickedBoxes.undoBoxes = removeItems;
	pickedBoxes.deleteCurrentBox = deleteCurrentBox;
	pickedBoxes.filter = filter;		
	pickedBoxes.filterOpen = filterOpen;
	pickedBoxes.filterEmpty = filterEmpty;
	pickedBoxes.reprintLabels = reprintLabels;

	pickedBoxes.filters = {};
	pickedBoxes.filters.box_id = '';
	pickedBoxes.filters.vendor_code = '';
	pickedBoxes.filters.fulfillment_center = '';
	pickedBoxes.filters.asin = '';
	pickedBoxes.filters.pf_sku = '';
	pickedBoxes.filters.amazon_po = '';
	pickedBoxes.filters.session = '';
	pickedBoxes.filters.session_id = '';
	pickedBoxes.filters.user = '';
	pickedBoxes.sessionStatus = 'open';
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
		var location = (stateParams.location.toUpperCase() == 'NY')? 'NY':'NJ';
		request.mongoQuery.find = {$and:[{sessionStatus:pickedBoxes.sessionStatus}, {ship_from:location}]}

		$$db.collection('boxes').find(request, function(data){			
	    	pickedBoxes.boxes = data;
	    	pickedBoxes.filteredBoxes = pickedBoxes.boxes;
	    	pickedBoxes.selectAll = false;
	    	console.log(data);
	    	filter()
	    })
	}

	function isInRange(min, max, num){
		max = max || Infinity;
		min = min || -Infinity;
		return num >= min && num <= max;
	}
	function isSubText(subText, fullText){ //create a procedure to handle multi comma seperated string filters
        var regx;
        subText = subText || '';
        //create a RegExp from the tblHead subText1
        regx = '/*' + subText.trim().toUpperCase() + '/*';

        var pattern = new RegExp(regx);
        //check the RegExp for each filter value against its curresponding property value
        return pattern.test((fullText + "" ).trim().toUpperCase()) || subText === '';
    }

	function filter(){				
		var filteredBoxes = [], _filters = pickedBoxes.filters;			
		pickedBoxes.selectionFilter = false;

		for (var i = 0; i < pickedBoxes.boxes.length; i++) {
			var isMatch = true;

			isMatch = isSubText(_filters.box_id, pickedBoxes.boxes[i].box_id) 
				&& isSubText(_filters.vendor_code, pickedBoxes.boxes[i].vendor_code) 
				&& isSubText(_filters.fulfillment_center, pickedBoxes.boxes[i].fulfillment_center)
				
				if(pickedBoxes.showAdvanceFilters){
					isMatch = isMatch && isSubText(_filters.session, pickedBoxes.boxes[i].session)
					&& isSubText(_filters.session_id, pickedBoxes.boxes[i].session_id)
					&& isSubText(_filters.user, pickedBoxes.boxes[i].user);
				}
				

			if(isMatch){				
				for (var n = 0; n < pickedBoxes.boxes[i].boxContents.length; n++) {
					isMatch = isSubText(_filters.asin, pickedBoxes.boxes[i].boxContents[n].asin)
						&& isSubText(_filters.pf_sku ,pickedBoxes.boxes[i].boxContents[n].pf_sku);

					if(pickedBoxes.showAdvanceFilters){
						isMatch = isMatch & isSubText(_filters.amazon_po, pickedBoxes.boxes[i].boxContents[n].amazon_po);
					}
					if(isMatch){break}
				}				
			}				
			
			if(pickedBoxes.showAdvanceFilters){
				isMatch = isMatch && isInRange(_filters.box1, _filters.box2, pickedBoxes.boxes[i].boxNumber)
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
		//clearFilter();

		var filteredBoxes = [];
		for (var i = 0; i < pickedBoxes.boxes.length; i++) {
			if(pickedBoxes.boxes[i].selected){
				filteredBoxes.push(pickedBoxes.boxes[i])
			}
		}
		pickedBoxes.filteredBoxes = filteredBoxes;		
		pickedBoxes.selectionFilter = true;				
	}

	function filterOpen(value){
		var filteredBoxes = [];
		filter();
		for (var i = 0; i < pickedBoxes.filteredBoxes.length; i++) {
			if(pickedBoxes.filteredBoxes[i].open === value){
				filteredBoxes.push(pickedBoxes.filteredBoxes[i])
			}
		}	
		pickedBoxes.filteredBoxes = filteredBoxes;	
	}
	function filterEmpty(){
		var filteredBoxes = [];
		filter();
		for (var i = 0; i < pickedBoxes.filteredBoxes.length; i++) {
			if(pickedBoxes.filteredBoxes[i].boxContents.length === 0){
				filteredBoxes.push(pickedBoxes.filteredBoxes[i])
			}
		}		
		pickedBoxes.filteredBoxes = filteredBoxes;
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
			
			var box_ids = uniqueKeys(_boxes, 'box_id');			
			var request = _client.generateRequestObj('undoBoxes @boxingMod');

			request.mongoQuery.find = {box_id:{$in:box_ids}};
			request.mongoQuery.update = {$set:{boxContents:[]}};
			request.mongoQuery.options = {multi:true};

			$$db.collection('boxes').update(request, function(data){
				nextTask();
			})								
		}

		function refresh(nextTask){			
			pickedBoxes.refreshAll();
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
		var _filters = cloneKeys(pickedBoxes.filters);
		pickedBoxes.filterSelection();		
		if(pickedBoxes.filteredBoxes.length > 0){			
			pickedBoxes.showAllContents(true);
			msgbox.button1.caption = 'Yes';
			msgbox.button1.clickAction = doItemRemoval;
			msgbox.button2.caption = 'No';
			msgbox.button2.show = true;
			msgbox.button2.clickAction = function(){
				pickedBoxes.filter()
			};
			msgbox.showMsg('Are you sure you want to remove all items from the selected boxes? (' + pickedBoxes.filteredBoxes.length + ' selected)')						
		}else{
			pickedBoxes.filters = _filters;
			pickedBoxes.filter()
			msgbox.showMsg('Please select the boxes you would like to undo!!!')			
		}			
	}
	function reprintLabels(labelType){		
		var _filters = cloneKeys(pickedBoxes.filters);
		pickedBoxes.filterSelection();		
		if(pickedBoxes.filteredBoxes.length > 0){			
			pickedBoxes.showAllContents(true);
			msgbox.button1.caption = 'Yes';
			if(labelType === 'Amazon'){
				msgbox.button1.clickAction = function(){
					labelPrinter.printAmznLabel(pickedBoxes.filteredBoxes)					
				};
			}else if(labelType === 'Box ID'){
				msgbox.button1.clickAction = function(){
					labelPrinter.printBoxLabels(pickedBoxes.filteredBoxes)
				};
			}
			
			msgbox.button2.caption = 'No';
			msgbox.button2.show = true;
			msgbox.button2.clickAction = function(){
				pickedBoxes.filter()
			};
			msgbox.showMsg('Are you sure you want to print <strong>'+labelType+'</strong> Labels for the selected boxes? (' + pickedBoxes.filteredBoxes.length + ' selected)')						
		}else{
			pickedBoxes.filters = _filters;
			pickedBoxes.filter()
			msgbox.showMsg('Please select the boxes for which you want to print labels!!!')			
		}	
		pickedBoxes.showReprintOptions = false;		
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
				pickedBoxes.refreshAll();
			}
		}, [box]);
	}
	
}])

.service('productEditor', ['tasks', '_client', '$$db', '$$msgbox', '$$eachesCalc', 'labelPrinter', function(tasks, _client, $$db, msgbox, eachesCalc, labelPrinter){
	
	var productEditor = this;
	productEditor.searchType = 'pf_skus';
	productEditor.searchText = '';
	productEditor.show = false;
	productEditor.addUPC_msg = addUPC_msg;
	productEditor.toggleHeaders = toggleHeaders;
	productEditor.toggleLabelsRequired = toggleLabelsRequired;

	productEditor.searchTxbKeydown = searchTxbKeydown;	

	var sku_headers = [
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

	var asin_headers = [
		{
            pName:'asin',
            fieldName:'ASIN',               
            processData: function(data, json){                
                return data;
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
            pName:'title',
            fieldName:'Title',               
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
            pName:'pf_sku',
            fieldName:'PF SKU',               
            processData: function(data){
                return data;
            }
        },        
        {
            pName:'prep_instructions',
            fieldName:'Prep Instructions',               
            processData: function(data, json){            
                return data
            }
        },
        /*{
            pName:'labels_required',
            fieldName:'Label Required',               
            processData: function(data){
                return data;
            }
        }*/                                          
	] 

	productEditor.headers = sku_headers

	function toggleHeaders(){
		productEditor.products = []
		productEditor.headers = (productEditor.searchType === 'asinData')?asin_headers:sku_headers;		
		productEditor.searchTxbKeydown({which:13})
	}

	function toggleLabelsRequired(asin){
		var msg = (asin.labels_required)? 'Allow this ASIN to ship without labels?'
		:'Require labels to ship this ASIN?';
		msgbox.button1.caption = 'Yes';
		msgbox.button1.clickAction = function(){
			updateLablesRequired()
		}
		msgbox.button2.caption = 'No';
		msgbox.button2.show = true;			
		msgbox.showMsg(msg)

		function updateLablesRequired(){
			var request = _client.generateRequestObj('toggleLabelsRequired')

			request.mongoQuery.find = {_id:asin._id};
			request.mongoQuery.update = {$set:{labels_required:!asin.labels_required}};

			$$db.collection('asinData').update(request, function(data){
	        	if(data){
	        		productEditor.searchTxbKeydown({which:13})
	        	}	            	
	        })
		}
	}
	var productSearch = new tasks.multiTaskHandler(function(){
		var products = [];
		function getASINs(nextTask){
			var request = _client.generateRequestObj('productSearch in productEditor in boxing.js')

			request.mongoQuery.find = {asin:productEditor.searchText}

			$$db.collection('asinData').find(request, function(data){
            	if(data.length > 0 ){
            		productEditor.products = data;
            		nextTask(null, data);
            	}	            	
            })
		}

		function getProducts(nextTask){
			var request = _client.generateRequestObj('getProducts in productEditor in boxing.js')
			
			var query = {};
			query.$or = [];
			query.$or.push({sku:productEditor.searchText});
			//query.$or.push({alternative_sku:productEditor.searchText});
			query.$or.push({upcs:productEditor.searchText});
			query.$or.push({vendor_skus:productEditor.searchText});
			query.$or.push({"set_breakdown.sku":productEditor.searchText});
			
			request.mongoQuery.find = query;

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

		$$db.collection('pf_skus').update(request, function(data){
			console.log(data);
			productEditor.searchTxbKeydown({which:13})
		})
	}

	function searchTxbKeydown(keyEvent, callBack){
		productEditor.searchText = productEditor.searchText.toUpperCase();
		if(productEditor.searchText){
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
			
	}

}])

.service('labelPrinter', ['tasks', '_client', '$$db', 'orderSearchHandler', '$$msgbox', '$stateParams', function(tasks, _client, db, orderSearchHandler, msgbox, stateParams){

	var lp = this;

	lp.setLable = setLable;
	lp.printKitLabel = printKitLabel;
	lp.reprint = reprint;
	lp.quickPrint = quickPrint;
	lp.printBoxLabels = printBoxLabels;
	lp.printAmznLabel = printAmznLabel;

	lp.reprint_qty = 0;
	lp.label = {};
	lp.label.fields = {};
	lp.labels_needed = 0;
	lp.order_line = {};

	function setLable(order_line){
		if(order_line.labels_required){
			lp.label.fields.SKU = order_line.pf_sku + '-X' + order_line.multiple;
			lp.label.fields.SKUBARCODE = '*' + order_line.asin	+ '*';
			lp.label.fields.DESCRIPTION = order_line.title;
			lp.label.copies = order_line.labels_needed;
			lp.labels_needed = lp.label.copies;

			lp.order_line = order_line;			
		}else{
			lp.label.fields.SKU = '';
			lp.label.fields.SKUBARCODE = '';
			lp.label.fields.DESCRIPTION = '';
			lp.label.copies = 0;
			lp.labels_needed = 0;

			lp.order_line = {};
		}
		lp.reprint_qty = 0;
	}

	function recordLabels(){
		var request = _client.generateRequestObj('recordLabels	 > labelPrinter > boxingMod');	

		request.order_id = lp.order_line._id;
		request.copies = lp.label.copies;
			
		db.boxing.recordLabels(request, function(err, results){
			if(results){
				lp.labels_needed = lp.labels_needed - lp.label.copies;
				lp.label.copies = lp.labels_needed;
				lp.refreshAll();
			}
		})					
	}

	function printKitLabel(label){
		if(isValidLabel(label)){
			printLabels([{				
				type:'kit-labels',
				date:Date(),
				labels:[label]
			}], recordLabels)			
		}
	}
	function reprint(label){
		var _label = cloneKeys(label);
		_label.copies = lp.reprint_qty;
		
		if(isValidLabel(_label)){
			printLabels([{				
				type:'kit-labels',
				date:Date(),
				labels:[_label]
			}])
		}
	}

	function printLabels(printJobs, callBack){
		var request = _client

		var request = _client.generateRequestObj('printLabels > labelPrinter > boxingMod');	
		
		request.printJobs = printJobs;

		db.labelPrinter.printLabels(request, function(data){
			console.log(data);
			data = data || {};
			if(data.status === 'success'){
				if(typeof callBack === 'function'){callBack()}	
			}else{
				//msgbox.showMsg("PRINTING ERROR!!!", null, null, {style:'warning'})
				console.log('PRINTING ERROR!!!')
			}			
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
			
			boxLabel.fields.box_count = boxes[i].boxNumber + '';
			boxLabel.fields.box_id = boxes[i].box_id;
			boxLabel.fields.box_id_barcode = '*' + boxes[i].box_id + '*';
			boxLabel.fields.fill_center =  boxes[i].fulfillment_center;
			boxLabel.fields.session = boxes[i].session;	
			boxLabel.fields.boxed_date = moment(boxes[i].created_date).format("M/D/YY");	
			boxLabel.fields.user = boxes[i].user || '';	

			labels.push(boxLabel)
		}		
		printLabels([{				
			type:'box-labels',
			date:Date(),
			labels:labels
		}])		
	}

	var amznLabelHandler = new tasks.multiTaskHandler(function(boxes){
		var mth = {}, fcs;

		mth.getShipToAddr = function(nextTask){
			var shipToArr = obj(boxes).uniqueKeys('fulfillment_center')

			var request = {
				method:'GET',
				/*path:'http://dev7:4003/fulfillment/locations/PHX3,PHX5'*/
				path:'http://dev7:4003/fulfillment/locations/' + shipToArr.join(',')
			}
			_client.requestHandler(request, function(err, results){
				if(err){
					nextTask(err)
				}else{
					fcs = results;
					nextTask()
				}
			})
		}
		function shipFromAddr(fields){
			fields.shipFrom1 = "Everready First Aid";
			fields.shipFrom2 = "EVER READY FIRST AID";

			if(stateParams.location.toUpperCase() == 'NY'){
				fields.shipFrom3 = "143 ALABAMA AVENUE";
				fields.shipFrom4 = "Brooklyn, NY";
				fields.shipFrom5 = "United States, 11207";
			}else{
				fields.shipFrom3 = "8 Elkins Road";
				fields.shipFrom4 = "East Brunswick, NJ";
				fields.shipFrom5 = "United States, 08816";					
			}			
		}

		function shipToAddr(fields, fc){
			if(fc){
				fields.shipTo1 = "Amazon.com, " + fc.ship_to_code;
				fields.shipTo2 = fc.address1 + (fc.address2 ? ', ' + fc.address2:'');
				fields.shipTo3 = fc.city + ', ' + fc.state;
				fields.shipTo4 = fc.country + ', ' + fc.zip;
			}else{
				fields.shipTo1 = 'INVALID FULFILLMENT CENTER!!!';
				fields.shipTo2 = 'INVALID FULFILLMENT CENTER!!!';
				fields.shipTo3 = 'INVALID FULFILLMENT CENTER!!!';
				fields.shipTo4 = 'INVALID FULFILLMENT CENTER!!!';
			}
		}
		function po_barcodes(fields, poArr){
			fields.po_list = poArr.join(', ');			
			
			for (var i = 0; i < 8; i++) {
				var name = 'po_barcode'+(i+1);
				fields[name] = (poArr[i])?"*"+poArr[i]+"*":"";
				///fields.po_list += poArr[i] + ", "
			}
		}

		mth._return = function(nextTask){
			var labels = [], printJobs = [];
			for (var i = 0; i < boxes.length; i++) {
				var amznLabel = {fields:{}};
				//BOX LABEL SECTION
				amznLabel.copies = 1;						
				amznLabel.fields.box_count = boxes[i].boxNumber + '';
				amznLabel.fields.box_id = boxes[i].box_id;
				amznLabel.fields.box_id_barcode = '*' + boxes[i].box_id + '*';
				amznLabel.fields.fill_center = ((boxes[i].vCode === 1)?'':boxes[i].vCode)+boxes[i].fulfillment_center;
				amznLabel.fields.session = boxes[i].session;	
				amznLabel.fields.boxed_date = moment(boxes[i].created_date).format("M/D/YY");	
				amznLabel.fields.user = boxes[i].user || '';	 		
				//ZONE A
				shipToAddr(amznLabel.fields, obj(fcs).findByKey('ship_to_code', boxes[i].fulfillment_center)[0]);
				//ZONE B
				shipFromAddr(amznLabel.fields);			
				//ZONE E					
				var _obj = obj(boxes[i].boxContents)
				po_barcodes(amznLabel.fields, _obj.uniqueKeys('amazon_po'));
				amznLabel.fields.asin_list = _obj.uniqueKeys('asin');
				amznLabel.fields.asin_list = (amznLabel.fields.asin_list.length === 1)? amznLabel.fields.asin_list[0]:"Mixed ASINs"
				amznLabel.fields.total_qty = _obj.sumOfKeys('pickedUnits');
				//ZONE F
				amznLabel.fields.BPS = packing_slip(boxes[i]);
				amznLabel.fields.base64BarcodeImage = pdf417Barcode(amznLabel.fields.BPS)	
				
				labels.push(amznLabel)				
				//print amazon labels in multiple printJobs to:
				//1. improve perfomance - adding barcode pics to 100 labels takes time. this happens before printing starts,
				//so printing will start more quickly if i print labels in smaller sets
				//2. printing hundreds of lables requires sending lengthy string to command line which throws and error

				//first set prints 20 labels and then sets of 50 thereafter
				var a_set = (printJobs.length>=1)?50:20;
				if(labels.length === a_set){
					printJobs.push({				
						type:'amazon-labels',
						date:Date(),
						labels:labels
					})
					labels = []
				}
			}
			if(labels.length > 0){
				printJobs.push({				
					type:'amazon-labels',
					date:Date(),
					labels:labels
				})
			}
			return printJobs
		}

		return mth
	})

	function closeBoxes(boxes){		
		var request = _client.generateRequestObj('closeBoxes');
		var box_ids = obj(boxes).uniqueKeys('box_id');

		request.mongoQuery.find = {box_id:{$in:box_ids}};
		request.mongoQuery.update = {$set:{open:false}};
		request.mongoQuery.options = {multi:true};		

		db.collection('boxes').update(request, function(data){
			console.log(data)
			lp.refreshAll();
		})
	}
	function printAmznLabel (boxes){		
		
		amznLabelHandler
		.runTasks(function(err, results){			
			if(err){
				console.log(err)
				msgbox.showMsg("ERROR PRINTING AMAZON LABELS!!!")
			}else{
				printLabels(results, function(){
					closeBoxes(boxes)
				})	
				console.log(results)			
			}
		}, boxes)
		
	}

	function packing_slip(box){
		var ps = 'AMZN';

		box.boxContents.sort(function(item_a, item_b){
			return (item_a.amazon_po > item_b.amazon_po) ? 1:-1
		})

		for (var i = 0; i < box.boxContents.length; i++) {
			var item = box.boxContents[i], previous = box.boxContents[i-1]
			previous = previous || {};
			ps += (item.amazon_po === previous.amazon_po)?
			",ASIN:"+item.asin+",QTY:"+item.pickedUnits+",EXP:"+moment().add(1, 'year').format("YYMMDD"):
			",PO:"+item.amazon_po+",ASIN:"+item.asin+",QTY:"+item.pickedUnits+",EXP:"+moment().add(1, 'year').format("YYMMDD")
		}
		return ps
	}
	function pdf417Barcode(textToEncode) {
        var textToEncode = textToEncode || "Odion The Strong"

        PDF417.init(textToEncode, 6);             

        var barcode = PDF417.getBarcodeArray();

        // block sizes (width and height) in pixels
        var bw = 2;
        var bh = 2;

        // create canvas element based on number of columns and rows in barcode
        var container = document.getElementById('barcode');
        //container.removeChild(container.firstChild);

        var canvas = document.createElement('canvas');
        canvas.width = bw * barcode['num_cols'];
        canvas.height = bh * barcode['num_rows'];
        container.appendChild(canvas);

        var ctx = canvas.getContext('2d');                    

        // graph barcode elements
        var y = 0;
        // for each row
        for (var r = 0; r < barcode['num_rows']; ++r) {
            var x = 0;
            // for each column
            for (var c = 0; c < barcode['num_cols']; ++c) {
                if (barcode['bcode'][r][c] == 1) {                        
                    ctx.fillRect(x, y, bw, bh);
                }
                x += bw;
            }
            y += bh;
        }

        var img    = canvas.toDataURL("image/png");
        $("#barcode").children().remove()
        return img
        //document.write('<img src="'+img+'"/>');
    }
}])
.filter('$$unsafe', function($sce) { 

    return function(data){

        if(!isNaN(data) && data !== null){
            data = data.toString();
        }
        return $sce.trustAsHtml(data); 
    }
})

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
	],
	Base64Labels:[
		{box_id:'123456789', base64BarcodeImage:'base64 - string'}
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
	],
	Base64Labels:[
		{box_id:'123456789', base64BarcodeImage:'base64 - string'}
	]	
}

var amznLabels = {	
	type:'PBS-labels',
	date:Date(),
	labels:[
		{
			copies:10,
			fields:{

				box_count:'1',
				box_id:'*A10456000001*',
				fill_center:'AVP1',
				session:'A',
				boxed_date:'03/30/2017',
				ship_from:"",
				ship_to:"",
				carrier:"",
				carrier_barcode:"",
				packing_slip:"",
				LABEL:'Session:'
				BPS:"AMZN,PO:3T435V4A,ASIN:B00H1BPQ1Y,QTY:10,EXP:180301,LOT:AMC7D18-12B,UPC:847603044555,QTY:15,EXP:180401,LOT:AMC7E19-13C,UPC:847603044888,QTY:20"
			}
		}
	],
	Base64Labels:[
		{box_id:'A10456000001', base64BarcodeImage:'base64 - string'}
	]	
}
*/
