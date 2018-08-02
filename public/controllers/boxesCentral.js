angular.module('boxesCentralMod', [])

.controller('boxesCentralCtrl', ['$scope', 'boxesTbl', '$$msgbox', 'navBar', function($scope, boxesTbl, $$msgbox, navBar){
	
    navBar.currentView = "BoxesCentral"

    $scope.$$msgbox = $$msgbox;
	$scope.tbl = boxesTbl;

	boxesTbl.getData({sessionStatus:'open'});
	boxesTbl.sortPropertyName = 'order_date';
	boxesTbl.sortReverse = true;
	$scope.test = function(){
		console.log(boxesTbl)
        //boxesTbl.ediUpload()
	}
}])

.service('boxesTbl', ['$$db', '_client', 'tbl', 'tasks', '$$eachesCalc', '$$msgbox',  function(db, _client, tbl, tasks, $$eachesCalc, msgbox){
	var boxesTbl = tbl(downloadBoxes, sessionOptions);

	boxesTbl.getData = getData;
    
    boxesTbl.headers = [
        {
            pName:'order_id',
            fieldName:'Order ID',                                 
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'amazon_po',
            fieldName:'Amazon PO',                                 
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'asin',
            fieldName:'ASIN',                                 
            setData: function(data, json, html){
                return '<a href="https://www.amazon.com/dp/' + data + '" target="_blank" class="ng-binding">' + html + '</a>';
            }
        },
        {
            pName:'title',
            fieldName:'Title',                                 
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'total_weight',
            fieldName:'Total Weight',                                 
            setData: function(data, json, html){
                return data.toFixed(2);
            }
        },
        {
            pName:'pf_sku',
            fieldName:'SKU',                                 
            setData: function(data, json){
                return data + '-X' + json.multiple;
            }
        },
        {
            pName:'boxNumber',
            fieldName:'Box Number',                        
            setData: function(data, json, html){                
                return json.boxNumber ;
            }
        },
        {
            pName:'box_id',
            fieldName:'Box ID',                        
            setData: function(data, json, html){
                return html;
            }
        },
        /*{
            pName:'createdDate',
            fieldName:'Created Date',                        
            setData: function(data, json, html){
                return html;
            }
        },*/
        {
            pName:'pickedUnits',
            fieldName:'Boxed Units',                                 
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'vendor_code',
            fieldName:'Vendor',                        
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'fulfillment_center',
            fieldName:'Fill Center',                        
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'session',
            fieldName:'Session',                        
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'session_id',
            fieldName:'Session ID',                        
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'sessionStatus',
            fieldName:'Session Status',                        
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'open',
            fieldName:'Box Is Open',                        
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'ship_from',
            fieldName:'SHIP FROM',                        
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'user',
            fieldName:'USER',                        
            setData: function(data, json, html){
                return html;
            }
        }
    ]

    boxesTbl.viewModes = [
        {
            caption:'OPEN SESSIONS',
            query:{sessionStatus:'open'},            
            clickAction:getData
        },
        {
            caption:'CLOSED SESSIONS',
            query:{sessionStatus:'closed'},            
            clickAction:getData
        },
        {
            caption:'ALL BOXES',
            query:{boxContents:{$ne:null}},            
            clickAction:getData
        }
    ];
    boxesTbl.viewMode = boxesTbl.viewModes[0].query;    

    var openSessionOptions = [        
        {
            caption:'Filter Sessions',
            type:'button',
            icon:'filter icon',                
            clickAction:filterSession
        },
        /*{
            caption:'Session Pick Sheet',
            type:'button',
            icon:'file icon',                
            clickAction:getPickSheet
        },*/            
        {
            caption:'Close Session',
            type:'button',
            icon:'lock icon',                                
            clickAction:closeSession
        },
        {
            caption:'Send EDI Data',
            type:'button',
            icon:'file text icon edi',     
            clickAction:ediUpload
        },
        {
            caption:'Routing Download',
            type:'button',
            icon:'table icon',                                
            clickAction:routingDownload
        },        
    ];
    var closedSessionOptions = [
        {
            caption:'Filter Session',
            type:'button',
            icon:'filter icon',                
            clickAction:filterSession
        },
        {
            caption:'Re-open Session',
            type:'button',                
            icon:'unlock icon',
            clickAction:openSession
        } 
    ];
    var sentSessionOptions = [
        {
            caption:'Filter Session',
            type:'button',
            icon:'filter icon',                
            clickAction:filterSession
        },                   
    ];
    var allSesssionsOptions = [
        {
            caption:'Filter Session',
            type:'button',
            icon:'filter icon',                
            clickAction:filterSession
        },
        {
            caption:'Session Pick Sheet',
            type:'button',
            icon:'file icon',                
            clickAction:getPickSheet
        }            
    ]


    boxesTbl.comboMenu = {
    	caption:'Session Menu',
    	type:'template',
        template:'templates/combo-menu-multi.html',                
        showOptions:false, 
        icon:'cube icon',                      
        options:[]
    }   

    boxesTbl.comboFilters =[
    	{
    		caption:'Session ID: ',
    		pName:'session_id',
    		value:'',
            selectAllClick:function(){
                for (var i = 0; i < this.options.length; i++) {
                    this.options[i].selected = this.selectAll
                }
            },
            getSelection:function(){
                var sel = []
                for (var i = 0; i < this.options.length; i++) {
                    if(this.options[i].selected ){
                        sel.push(this.options[i].caption)
                    }                    
                }
                return sel
            },
            clear:function(){
                this.selectAll = false;
                for (var i = 0; i < this.options.length; i++) {
                    this.options[i].selected = this.selectAll
                }
            },
    		options:[]
    	},    	
    ]      

    function sessionOptions(){
        
    	for (var i = 0; i < boxesTbl.comboFilters.length; i++) {
            boxesTbl.comboFilters[i].options = []
            var _sessions = uniqueKeys(boxesTbl.filteredData, boxesTbl.comboFilters[i].pName);
            _sessions.forEach(function(sid){
                boxesTbl.comboFilters[i].options.push({
                    caption:sid,
                    selected:false
                })
            })
    		 
    		console.log( uniqueKeys(boxesTbl.filteredData, boxesTbl.comboFilters[i].pName))
    	}
    }

    boxesTbl.setMenus([boxesTbl.comboMenu])

    var boxes = [];

    var getExtraData = tasks.multiTaskHandler(function(skus, order_ids){
        var mth = {}, sku_data= [], order_data = [];

        mth.getOrderData = function(nextTask){
            var unique_skus = [];
            boxes.forEach(function(box){
                box.boxContents.forEach
            })
            var request = _client.generateRequestObj('boxesTbl.getBoxes > getSkuData > @boxesCentralMod');    
            
            request.mongoQuery.find = {_id:{$in:order_ids}};
            db.collection('orders').find(request, function(data){
                if(data){
                    order_data = data;
                    nextTask();
                }
            })
        }

        mth.getSkuData = function(nextTask){
            var unique_skus = obj(boxes).uniqueKeys('pf_sku');

            var request = _client.generateRequestObj('boxesTbl.getBoxes > getSkuData > @boxesCentralMod');    
            
            request.mongoQuery.find = {_id:{$in:skus}};
            db.collection('pf_skus').find(request, function(data){
                if(data){
                    sku_data = data;
                    nextTask();
                }
            })
        }
        
        mth.merge = function(nextTask){
           order_data.forEach(function(order_line){                
                var matchingBoxes = obj(boxesTbl.data).findByKey('order_id', order_line._id, true);
                matchingBoxes.forEach(function(box_line){
                    box_line.cost = order_line.cost;
                    box_line.order_date = order_line.order_date;
                })
           })
           sku_data.forEach(function(sku_line){
                var matchingBoxes = obj(boxesTbl.data).findByKey('pf_sku', sku_line._id, true);
                matchingBoxes.forEach(function(box_line){
                    box_line.total_weight = (sku_line.weight * box_line.multiple * box_line.pickedUnits);;
                })
           })
        }

        return mth
    }).setTasksAsync(['getOrderData', 'getSkuData'], ['merge']);

	var dataInit = new tasks.multiTaskHandler(function(query){
		var tblData = [], skus = [], order_ids = [];

		function getBoxes(nextTask) {
			boxesTbl.ready = false;
            var request = _client.generateRequestObj('boxesTbl.getBoxes > dataInit > @boxesCentralMod');    
            request.mongoQuery.find = query;

            db.collection('boxes').find(request, function(data){
            	if(data){
                    //boxes from the higher scope
            		boxes = data; 
            	}                              
                nextTask();
            })									
		}

         

		function reformatData (){

			for (var i = 0; i < boxes.length; i++) {				
				for (var n = 0; n < boxes[i].boxContents.length; n++) {
                    
					var box_data = cloneKeys(boxes[i].boxContents[n]);								
					box_data = cloneKeys(boxes[i], null, box_data)                    
                    box_data.total_weight = (box_data.item_weight * box_data.pickedUnits);
                    box_data.order_id = boxes[i].boxContents[n]._id;
                    box_data.amazon_po = boxes[i].boxContents[n].amazon_po;
					tblData.push(box_data);
                    
                    if(order_ids.indexOf(box_data.order_id) === -1){
                        order_ids.push(box_data.order_id);
                    }
                    
                    if(skus.indexOf(box_data.pf_sku) === -1){
                        skus.push(box_data.pf_sku);
                    }
				}
			}

          /*  getExtraData.runTasks(function(err, results){
                if(err){
                    console.log(err)
                }else{
                    console.log(results)
                }
            }, skus, order_ids)*/

			return tblData;
		}

		return {
			getBoxes:getBoxes,
			_return:reformatData
		}			
	})

	function getData(){
		dataInit.runTasks(function(err, results){
			if(err){
    			console.log(err);
    		}else{
    			console.log(results);
    			boxesTbl.setData(results);
    		}
		},  boxesTbl.viewMode)

        if(boxesTbl.viewMode.sessionStatus === 'open'){                    
            boxesTbl.comboMenu.options = openSessionOptions;             
        }else if(boxesTbl.viewMode.sessionStatus === 'closed'){            
            boxesTbl.comboMenu.options = closedSessionOptions;    
        }else if(boxesTbl.viewMode.sessionStatus === 'sent'){            
            boxesTbl.comboMenu.options = sentSessionOptions;    
        }else{
            boxesTbl.comboMenu.options = allSesssionsOptions;
        }
	}
    function hasEmptyBox(session_id){
        var _boxes = findByKey(boxes, 'session_id', session_id, true), emptyBoxes = [];
        //get all empty boxes

        _boxes.forEach(function(box){
            if(box.boxContents.length === 0 ){
                emptyBoxes.push(box)
            }
        })

        if(emptyBoxes.length > 0){        
            //check if box number are among last in session, which is ok            
            for (var i = 0; i < emptyBoxes.length; i++) {
                //example: if there are 5 boxes and 2 are empty only boxNumber 4 and 5 being empty is exceptable
                if(emptyBoxes[i].boxNumber < (_boxes.length + 1) - emptyBoxes.length){
                    return true
                }
            }            
        }

        return false
    }

	function updateSession(status, id_list){

		var session_ids = id_list || boxesTbl.comboFilters[0].getSelection();
   
        var eSessions = [];
        if(status === 'closed'){                        
            for (var i = 0; i < session_ids.length; i++) {
                if(hasEmptyBox(session_ids[i])){
                    eSessions.push(session_ids.splice(i,1))
                    i--
                }    
            }                
        }

        console.log(session_ids)
        var openBoxes = obj(boxesTbl.filteredData).findByKey('open', true, true)
        if(openBoxes.length > 0){
            open_box_sessions = obj(openBoxes).uniqueKeys('session_id')
            msgbox.button1.caption = 'Yes';
            msgbox.button1.clickAction = doUpdate;
            msgbox.button2.caption = 'No';
            msgbox.button2.clickAction = function(){
                for (var i = open_box_sessions.length - 1; i >= 0; i--) {
                    var n = session_ids.indexOf(open_box_sessions[i])
                    if(n >-1){
                        session_ids.splice(n, 1)
                    }                    
                }
                doUpdate();
            };
            msgbox.button2.show = true;
            msgbox.showMsg('The following sessions contain boxes that have not been closed. Do you still want to close these sessions: <br><br>' + open_box_sessions.join(' ') + '<br>')
        }else{            
            doUpdate();
        }
    			
        function doUpdate(){
            if(session_ids[0] != ''){    
                console.log(session_ids)                    
                var request = _client.generateRequestObj('updateSession > boxesTbl > @boxesCentralMod');  

                request.mongoQuery.find = {session_id:{$in:session_ids}};           
                request.mongoQuery.update = {$set:{sessionStatus:status}};
                request.mongoQuery.options ={multi:true};

                db.collection('boxes').update(request, function(data){
                    if(data){
                        console.log(data)
                        
                        if(eSessions.length > 0){
                            msgbox.showMsg('<sapn>The following Sessions could not be closed because of an empty box:</sapn><br>' + eSessions.join('<br>'))                
                        } 
                        boxesTbl.getData({sessionStatus:'open'});
                    }
                })
            }
        }
	}


    function getPickSheet(){
        var session_id = boxesTbl.comboFilters[0].value;
        if(session_id !== ''){
            if(hasEmptyBox(session_id)){
                msgbox.showMsg('<sapn>Cannot get PickSheet for this Session becuase this Session has an empty box!</sapn>')                
                return
            }
            boxesTbl.validateSelection(function(selection){
                var data = findByKey(selection, 'session_id', session_id, true);

                data = findByKey(data, 'selected', true, true);

                var box_ids = uniqueKeys(data, 'box_id');    
                

                if(box_ids.length > 0){
                    
                    var request = _client.generateRequestObj('getPickSheet > boxesTbl > @boxesCentralMod'); 
                    //request.mongoQuery.find  = {session_id:session_id};
                    request.mongoQuery.find  = {$and:[{session_id:session_id}, {box_id:{$in:box_ids}}]};
                    request.setTasks = ['pickHeaderData', 'pickSheetDownload'];
                    request.collName = 'boxes';
                    
                    db.app.xlDownload(request, function(data){
                        console.log(data)
                    })
                }else{
                    msgbox.showMsg("Please select lines that match the session you want to print!")
                    setTimeout(function(){
                        boxesTbl.clearAll();
                    }, 1)
                }
            })
        }else{
            msgbox.showMsg("Please select a session!")
        }
        
           
    }

	function closeSession(){
		updateSession('closed');
	}
	function openSession(){
		updateSession('open');
	}

	function filterSession(){
		for (var i = 0; i < boxesTbl.headers.length; i++) {
			if(boxesTbl.headers[i].pName === 'session_id'){
                console.log(boxesTbl.comboFilters[0])
				boxesTbl.headers[i].filterValue1 = boxesTbl.comboFilters[0].getSelection().join(' ');

				boxesTbl.filter(boxesTbl.headers[i]);
				boxesTbl.toggleMenuOptions(boxesTbl.comboMenu);				
				break
			}
		}
	}

	function downloadTbl(request, callBack){

		request.mongoQuery.insert = {download:boxesTbl.filteredData};

		db.collection('aux').insert(request, function(data){
			window.open('db/export/toexcel/'+ data._id +'/' + 'Boxes Download ' + moment().format("MMM Do YY"));
			callBack();
		})
	}

    function per(num){
        return (num > 1)?num+'':'EA'        
    }
    function uom(num){
        return (num > 1)?'B'+num:'EA'
    }
    //used to map collection property to field Names in sql db
    var boxTblMap = {
        Box_ID:'box_id',
        BoxNumber:'boxNumber',
        BoxedDate:'createdDate',           
        Amazon_PO:'amazon_po',
        ASIN:'asin',
        total_units:'pickedUnits',
        Session_ID:'session_id',
        Weight: 'total_weight',
        Mul:'multiple',
        shipTo:'fulfillment_center',
        shipFrom:'ship_from',
        Title:'title',
        PF_SKU:'pf_sku',
        Cost:'cost',
        Order_Date:'order_date'
    }

    function downloadBoxes(request, callBack){
        var boxDownload = [];
        boxesTbl.filteredData.forEach(function(box){
            var _box = {};
            obj(boxTblMap).forEach(function(value, key){
                _box[key] = box[value];
            })
            _box.per = per(box.multiple)
            _box.unitOfMeasure = uom(box.multiple)
            _box.BoxedDate = moment(_box.BoxedDate).format('MM/DD/YY')
            _box.Order_Date = moment(_box.Order_Date).format('MM/DD/YY')
            boxDownload.push(_box);
        })
        console.log(boxDownload);
        
        request.mongoQuery.insert = {download:boxDownload};

        db.collection('aux').insert(request, function(data){
            window.open('db/export/toexcel/'+ data._id +'/' + 'Boxes Download ' + moment().format("MMM Do YY"));
            callBack();
        })
    }

    function routingDownload(){
        var download = [];
        sessions = obj(boxesTbl.filteredData).uniqueKeys('session_id')

        for (var i = 0; i < sessions.length; i++) {
            var box_data = obj(boxesTbl.data).findByKey('session_id', sessions[i], true),  finised_lines = [];

            box_data.forEach(function(line){

                if(finised_lines.indexOf(line.order_id) === -1){
                    finised_lines.push(line.order_id);
                    var set = obj(box_data).findByKey('order_id', line.order_id, true)
                    download.push({
                        order_id:line.order_id,
                        ASIN:line.asin,
                        Amazon_PO:line.amazon_po,
                        Session:sessions[i],
                        Total_Units:obj(set).sumOfKeys('pickedUnits')
                    })                   
                }
            })
        }        
        var request = _client.generateRequestObj('routingDownload');
        request.mongoQuery.insert = {download:download};
        console.log(download)
        db.collection('aux').insert(request, function(data){
            window.open('db/export/toexcel/'+ data._id +'/' + 'Routing Download ' + moment().format("MMM Do YY"));            
        })
    }

   function ediUpload(){
        var request = {
            method:'put',
            path:'http://192.168.100.165:4001/edi/insertSessions',
            /*'http://dev7:4001/edi-data-transfer'*/
            data:boxesTbl.comboFilters[0].getSelection()
        }
        debugger
        _client.requestHandler(request, function(err, results){
            if(err){
                console.log(err)
            }else{
                console.log(results)
            }
        })
    }
	return boxesTbl
}])