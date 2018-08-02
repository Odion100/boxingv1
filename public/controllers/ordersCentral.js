angular.module('ordersCentralMod', [])

.controller('ordersCentralCtrl', ['$scope', 'ordersTbl', '$$msgbox', 'navBar', function($scope, ordersTbl, $$msgbox, navBar){
	
    navBar.currentView = "OrdersCentral"
    $scope.$$msgbox = $$msgbox;
	$scope.tbl = ordersTbl;

	ordersTbl.getData();
	ordersTbl.sortPropertyName = 'order_date';
	ordersTbl.sortReverse = true;
	$scope.test = function(){
        //ordersTbl.viewModes[0].caption ="THESE NUTZ!"
		//console.log(ordersTbl)
        console.log(ordersTbl);
        
	}
}])

.service('ordersTbl', ['$$db', '_client', 'tbl', 'tasks', '$$eachesCalc', '$$msgbox', '$state',  function(db, _client, tbl, tasks, eachesCalc, msgbox, state){
	
	var ordersTbl = tbl(db.app.ordersDownload, refreshWeekOpts);
	ordersTbl.getData = getData;
    ordersTbl.uploadFile = uploadFile;

	ordersTbl.headers = [
        {
            pName:'_id',
            fieldName:'ID',                        
            setData: function(data, json, html){            
                return data;
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
            pName:'amazon_po',
            fieldName:'Amazon PO',                        
            setData: function(data, json, html){
                return html;
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
            pName:'cost',
            fieldName:'Cost',                        
            setData: function(data, json, html){
                return accounting.formatMoney(data);
            }
        },
        {
            pName:'total',
            fieldName:'Total',                        
            setData: function(data, json, html){
                return accounting.formatMoney(data);
            }
        },
        {
            pName:'units_confirmed',
            fieldName:'Units Confirmed',                        
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'order_date',
            fieldName:'Order Date',                        
            setData: function(data, json, html){
                return html
            }
        },        
        {
            pName:'earliest_ship_date',
            fieldName:'Earliest Ship',                        
            setData: function(data, json, html){
                return html
            }
        },
        {
            pName:'latest_ship_date',
            fieldName:'Latest Ship',                        
            setData: function(data, json, html){               
                return html
            }
        },
        {
            pName:'expected_ship_date',
            fieldName:'Expected Ship',                        
            setData: function(data, json, html){
                return html
            }
        },
        {
            pName:'availablity_status',
            fieldName:'Availablity Status',                        
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
        //-------------------order tracking data
        {
            pName:'note',
            fieldName:'Note',                        
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'sku',
            fieldName:'SKU',                       
            setData: function(data, json){
                //if its a set include pf sku
                if(json.unit_breakdown){
                    return (json.unit_breakdown.length > 1) 
                    ? '<span style="font-weight:bold;">' + json.pf_sku + '</span><br>' + eachesCalc(json.unit_breakdown).toSKU_HTML()
                    :eachesCalc(json.unit_breakdown).toSKU_HTML() ;
                }else{
                    return eachesCalc(json.unit_breakdown).toSKU_HTML()
                }
            }
        },
        {
            pName:'pending_units',
            fieldName:'Pending Units',                        
            setData: function(data, json){                         
                return new eachesCalc(json.unit_breakdown).eaches(json.pending_eaches).toQty_HTML()
            }
        },
        {
            pName:'in_stock_units',
            fieldName:'In Stock Units',                        
            setData: function(data, json){
                return new eachesCalc(json.unit_breakdown).eaches(json.in_stock_eaches).toQty_HTML()
            }
        },
        /*{
            pName:'in_job_units',
            fieldName:'In Job Units',                        
            setData: function(data, json){
                return data
            }
        },*/
        {
            pName:'canceled_units',
            fieldName:'Canceled Units',                        
            setData: function(data, json){
                return data 
            }
        },
        {
            pName:'boxed_units',
            fieldName:'Boxed Units',                        
            setData: function(data, json){
                return data
            }
        }
        /*,
        {
            pName:'order_week',
            fieldName:'Order Week',                        
            phantom:true,
            setData: function(data, json, html){
                return html
            }
        }*/                                            
    ]

    ordersTbl.viewModes = [
        {
            caption:'OPEN ORDERS',
            query:{$or:[{pending_units:{$gt:0}}, {in_stock_units:{$gt:0}}]},            
            clickAction:getData
        },
        {
            caption:'COMPLETE ORDERS',
            query:{$and:[{pending_units:0}, {in_stock_units:0}]},            
            clickAction:getData
        },
        {
            caption:'ALL ORDERS',
            query:{},            
            clickAction:getData
        }        
    ];
    
    ordersTbl.viewMode = ordersTbl.viewModes[0].query;

    ordersTbl.comboMenu = {
        caption:'Link Orders Menu',
        type:'template',
        template:'templates/combo-menu.html',                
        showOptions:false, 
        icon:'linkify icon',                      
        options:[
            {
                caption:'Link Orders to PF POs',
                type:'button',
                icon:'linkify icon',                                
                clickAction:linkPOInit
            },            
            {
                caption:'View Linked POs Report',
                type:'button',
                icon:'file text icon',                                
                clickAction:function(){
                    
                    var  url = state.href('reportsCentral.reportName.orderWeek', {reportName:'Linked POs Report', orderWeek:ordersTbl.comboFilters[0].value}, {absolute:true})
                    window.open(url, '_blank');
                }
            },
            {
                caption:'Filter Orders By Week',
                type:'button',
                icon:'filter icon',                                
                clickAction:filterByWeek
            },           
        ]
    }   

    ordersTbl.comboFilters =[
        {
            caption:'Link Orders By Week Range: ',
            pName:'order_week',
            value:'',
            options:[]
        },      
    ]      

    function linkPOInit(callBack){
        var order_week = ordersTbl.comboFilters[0].value;
        var request = _client.generateRequestObj('ordersTbl linkPOInit  @reportsCentralMod');
        
        request.mongoQuery.find = {$and:[{order_week:order_week}, {report_name:'Linked POs Report'}]}
        
        db.collection('reports').find(request, function(data){               
            var po_numbers = (data.length > 0) ? data[0].linked_po_numbers.join("\r\n") :'';            
            showLinkPO_frm(po_numbers)             
        })
    }
    function showLinkPO_frm(existing_pos){
        var order_week = ordersTbl.comboFilters[0].value;
        if(order_week != ''){
            var frm = new ordersTbl.editor(function(data){

                frm.showLoading('linking orders')
                var po_numbers = data[0].po_numbers.split(/\n/);

                for (var i = 0; i < po_numbers.length; i++) {
                    po_numbers[i] = po_numbers[i].trim();
                }

                var request = _client.generateRequestObj('linkPOs @ordersCentralMod');    
                request.po_numbers = po_numbers;
                request.order_week = order_week;
                request.newReport = true;

                db.app.linkPOs(request, function(data){
                    frm.hideLoading();                    
                    console.log(data)
                    msgbox.showMsg('Orders to POs link successful!')                          
                })
            }).init([
                {                                                                                        
                    po_numbers:{value:existing_pos, caption:'POs', useInput:true, type:'textarea', style:'max-height: 150px;max-width: 223px; vertical-align: text-top;', placeholder:'Enter POs Here'}
                },
            ]).caption("Orders (" + order_week + ")")
            ordersTbl.showMenuBack = false;
            ordersTbl.toggleMenuOptions();
        }else{
            msgbox.showMsg('Select a Week Range!!!')
        }            
    }
    function filterByWeek(){        
        var weekStr = ordersTbl.comboFilters[0].value;

        if(weekStr === ''){ 
            msgbox.showMsg('Select a Week Range!!!')
            return
        }

        for (var i = 0; i < ordersTbl.headers.length; i++) {
            if(ordersTbl.headers[i].pName === 'order_date'){
                var n =  weekStr.indexOf('to')
                ordersTbl.headers[i].filterValue1 = moment(weekStr.substr(null, n-1),'MM-DD-YYYY')._d
                ordersTbl.headers[i].filterValue2 = moment(weekStr.substr(n+3),'MM-DD-YYYY')._d;
                
                ordersTbl.filter(ordersTbl.headers[i]);
                ordersTbl.toggleMenuOptions(ordersTbl.comboMenu);             
                break
            }
        }
    }

    function refreshWeekOpts(){  
        var _data = ordersTbl.filteredData.slice(0)
        _data.sort(function(a, b){
            return (a.order_date < b.order_date)? -1:1;
        })
        ordersTbl.comboFilters[0].options = uniqueKeys(_data, 'order_week').reverse()
    }

    ordersTbl.setMenus([
        {
            caption:'Add Orders',
            type:'dropdown',
            icon:'plus icon',
            showOptions:false,                       
            options:[
                {
                    caption:'New Orders Template',
                    type:'button',
                    icon:'file excel outline icon',
                    clickAction:function(){
                        window.open('/db/templates/Orders Upload Template.xlsm')
                    }
                },
                {
                    caption:'Upload New Orders',
                    type:'file',
                    icon:'upload icon',
                    name:'new_orders',
                    clickAction:function(){

                    }
                }
            ]
        },
        {
            caption:'Edits And Corrections',
            type:'dropdown',
            icon:'edit icon',
            showOptions:false,                       
            options:[
                {
                    caption:'Order Line Editor',
                    type:'button',
                    icon:'file excel outline icon',
                    clickAction:exportForEditing
                },
                {
                    caption:'Import Edits',
                    type:'file',
                    icon:'upload icon',
                    name:'edit_orders',
                    clickAction:function(){

                    }
                },
                {
                    caption:'Cancel SKU',
                    type:'button',
                    iconCombo:{
                        class:'tbl-shipping',
                        icon1:'shipping icon',
                        icon2:'corner remove icon'
                    },
                    clickAction:cancelSkuFrm
                },
                {
                    caption:'Recieve Order Line',
                    type:'button',
                    iconCombo:{
                        class:'tbl-shipping',
                        icon1:'shipping icon',
                        icon2:'corner add icon'
                    },
                    clickAction:receiptFrmInit
                }/*,
                {
                    caption:'Delete Lines',
                    type:'button',
                    icon:'remove icon',
                    clickAction:function(){

                    }
                }*/
            ]
        },
        ordersTbl.comboMenu            
    ])

    var dataInit = new tasks.multiTaskHandler(function(query){
        var orders, asinData;
        function getOrders(nextTask){
            ordersTbl.ready = false;
            var request = _client.generateRequestObj('ordersTbl.getData @ordersCentralMod');    
            request.mongoQuery.find = query;

            db.app.getOrders(request, function(data){
                orders = data;                
                nextTask();
            })
        }
  
        function reformatData(){ 
            for (var i = 0; i < orders.length; i++) {                
                var calc = eachesCalc(orders[i].unit_breakdown);                            
                orders[i].pending_units = (orders[i].unit_breakdown) ? calc.eaches(orders[i].pending_eaches).toUnits():-1;
                orders[i].in_stock_units = (orders[i].unit_breakdown) ? calc.eaches(orders[i].in_stock_eaches).toUnits():-1;                
                //orders[i].canceled_units = (orders[i].unit_breakdown) ? calc.eaches(orders[i].canceled_eaches).toUnits():-1;
                //orders[i].POs = orders[i].linked_po_numbers.join(", ");
                orders[i].total = orders[i].cost * orders[i].units_confirmed;  
                if(orders[i].unit_breakdown){
                    orders[i].sku =  (orders[i].unit_breakdown.length > 1) ? calc.toSKU() + ' / ' + orders[i].pf_sku: calc.toSKU();
                }else{
                    orders[i].sku =  calc.toSKU();
                }
                
            }            
            return orders
        }

        return{
            getOrders:getOrders,                        
            _return:reformatData
        }
    })
    
    function getData(callBack){
    	ordersTbl.ready = false;
    	dataInit.runTasks(function(err, results){
    		if(err){
    			console.log(err);
    		}else{
    			console.log(results);
    			ordersTbl.setData(results);
                if(typeof callBack === 'function'){callBack()}
    		}
    	}, ordersTbl.viewMode)
    }

    function uploadFile (input){        
        console.log(input.files[0]);                
        var request = _client.generateRequestObj('ordersTbl.uploadFile @ordersCentralMod');
        request.file = input.files[0];        

        if(input.name === 'new_orders'){            
            ordersTbl.ready = false;
            db.collection('orders').xlInsert(request, function(data, err){ 
                //debugger
                ordersTbl.ready = true;        
                data = data || {};
                if (data.status === 'successful'){                                            
                    ordersTbl.getData();                    
                }
            })
        } else 
        if(input.name === 'edit_orders'){
            ordersTbl.ready = false;
            db.collection('orders').xlUpdate(request, function(orders, err){ 
                ordersTbl.ready = true;        
                if (orders){                                            
                    ordersTbl.getData();
                    console.log(orders);
                }
            })
        }
    
        $(input).val('');
    }

    function exportForEditing(){       
        ordersTbl.validateSelection(function(){
            ordersTbl.ready = false;
            ordersTbl.filterSelection();
            var request = _client.generateRequestObj('ordersTbl.downloadSelection @ordersCentralMod');

            request.mongoQuery.insert = {};
            request.mongoQuery.insert.download = ordersTbl.filteredData;  
            //the proceduer is to insert the data into the aux collection and
            //then make a request to the route below using the _id of the inserted collection
            //and the name to apply to the download
            db.collection('aux').insert(request, function(data){
                console.log(data);
                window.open('db/export/toexcel/'+ data._id +'/' + 'Order Line Editor')
                ordersTbl.ready = true;
            })
        })        
    }

    function receiptFrmInit(){
        ordersTbl.validateSelection(function(data){
            var _data = [];
            for (var i = 0; i < data.length; i++) {
                if(data[i].pending_units > 0){
                    data[i].sku_html = eachesCalc(data[i].unit_breakdown).toSKU_HTML();
                    _data.push(data[i])
                }
            }                      
            if (_data.length > 0) {

               var frm = new ordersTbl.editor(function(data){
                    frm.showLoading();
                    recFromOrder.runTasks(function(err, results){     
                        frm.hideLoading();                   
                        frm.show = false;
                        if(err){
                            console.log(err);
                        }else{
                            console.log(results)
                        }
                    }, data)
                }).useHeaders([
                    {pName:'asin', caption:'ASIN'},
                    {pName:'sku_html', caption:'SKU'},                
                    {pName:'pending_units', caption:'Units to Receive', useInput:true, type:'number'}
                ]).showCount().caption("Create Receipts").init(_data)

                ordersTbl.showMenuBack = false;
                ordersTbl.toggleMenuOptions();
            }else{
                msgbox.showMsg("None of the lines you've chosen have pending units greater than zero!")
            }

        })
    }    

    var recFromOrder = new tasks.multiTaskHandler(function(rec_data){
        var _orders, indexHolder = [], recs = [];

        function getOrders(nextTask){
            var request = _client.generateRequestObj('getOrders reformatData @ordersCentralMod');
            var ids = uniqueKeys(rec_data, '_id');
            request.mongoQuery.find = {_id:{$in:ids}};

            db.collection('orders').find(request, function(data){
                if(data.length > 0){
                    _orders = data;                    
                    nextTask()
                }
            })
        }

        function processRecs(nextTask){
            //updated order tracking and create receipts
            var line = 0;
            var rec_number = "manual-rec-by-order" + _client.uniqueNumber();

            for (var i = 0; i < rec_data.length; i++) {
                var  order_line  = findByKey(_orders, '_id', rec_data[i]._id)[0];

                if(order_line.pending_units >= rec_data[i].pending_units){
                    var eCalc = new eachesCalc(order_line.unit_breakdown);

                    var rec_eaches = eCalc.units(rec_data[i].pending_units).toEaches()

                    order_line.in_stock_eaches = eCalc.eaches(order_line.in_stock_eaches).add(rec_eaches);
                    order_line.in_stock_units = eCalc.eaches().realUnits();
                    order_line.pending_eaches = eCalc.eaches(order_line.pending_eaches).subtract(rec_eaches);
                    order_line.pending_units = eCalc.eaches().realUnits();

                    //create receipts
                    for (var n = 0; n < order_line.unit_breakdown.length; n++) {                                
                        var pf_sku = order_line.unit_breakdown[n].sku,  rec_qty = rec_eaches[pf_sku];

                        var index = indexHolder.indexOf(pf_sku);
                        if(index === -1){
                            //insert new receipt line
                            var rec_line = {};
                            line++
                            rec_line.line = line;
                            rec_line.receipt_number = rec_number;
                            rec_line.pf_sku = pf_sku;
                            rec_line.rec_qty = rec_qty;
                            rec_line.receipt_date = moment()._d;
                            rec_line.vendor_code = '';
                            rec_line.po_number = 'auto-rec';
                            rec_line.linked_orders =[
                                {
                                    _id:order_line._id,
                                    asin:order_line.asin,
                                    amazon_po:order_line.amazon_po,
                                    assigned_eaches:rec_line.rec_qty
                                }
                            ] 

                            recs.push(rec_line)
                            indexHolder.push(pf_sku);
                        }else{                             
                            //add to receipt line
                            recs[index].rec_qty = recs[index].rec_qty +  rec_qty

                            recs[index].linked_orders.push({
                                _id:order_line._id,
                                assigned_eaches:rec_qty
                            });
                        }
                    }
                    
                }else{  
                    msgbox.showMsg("Invalid quantity on line " + (i + 1) + ".")
                    return
                }                        
            }            
            nextTask();
        }

        function updateOrders(nextTask){
            //send order updates
            var request = _client.generateRequestObj('getOrders updateOrders @ordersCentralMod');

            request.mongoQuery.replace = _orders;

            db.collection('orders').replace(request, function(data){
                console.log(data)                
                nextTask();
            })
        }

        function insertRecs(nextTask){
            //create receipts            
            var request = _client.generateRequestObj('insertRecs @ordersCentralMod');

            request.mongoQuery.insert = recs;
            db.collection('receipts').insert(request, function(data){
                console.log(data)                
                nextTask();
            })

        }

        function reset(nextTask){
            getData(nextTask);  
        }

        return {
            getOrders:getOrders,
            processRecs:processRecs,
            updateOrders:updateOrders,
            insertRecs:insertRecs,
            reset:reset 
        }
    });    
    
    function isWholeNumber(number){
        return (number - Math.floor(number) === 0)
    }
    function bestMatches(orderLines, sku, canceled_qty){        
        //criteria 1. canceled_qty divides evenly in to the items multiple 
        //criteria 2. the items cancelable eaches are greater than or equal to canceled_qty        
        var ordersToCancel = [];

        for (var i = 0; i < orderLines.length; i++) {           
                     
            var orderLine = orderLines[i];

            orderLine.canceling_eaches = (canceled_qty > orderLine.total_cancelable_eaches)?orderLine.total_cancelable_eaches:canceled_qty;

            //round canceling eaches down to the nearest unit
            orderLine.canceling_units = Math.floor(orderLine.canceling_eaches/orderLine.multiple)
            orderLine.canceling_eaches = orderLine.canceling_units * orderLine.multiple;

            if(orderLine.canceling_eaches > 0){
                canceled_qty -= orderLine.canceling_eaches

                //splice order line
                orderLines.splice(i, 1);
                
                //unshift it to top
                orderLines.unshift(orderLine);    
            }
            

            if(canceled_qty <= 0){break}            
        }       
    }

    function findMatchingOrders(sku, canceled_qty){
        var matching_orders = [];
        
        ordersTbl
        .filteredData
        .forEach(function(orderLine){
            var eCalc = new eachesCalc(orderLine.unit_breakdown);

            if(eCalc.isMatchingSku(sku) && (orderLine.pending_eaches[sku] > 0 || orderLine.in_stock_eaches[sku] > 0) ){
            
                var match = cloneKeys(orderLine, ['_id', 'pending_eaches', 'in_stock_eaches', 'sku', 'unit_breakdown', 'asin', 'amazon_po']);

                match.sku_html = (match.unit_breakdown.length > 2) ? eCalc.toSKU_HTML(): 'N/A';
                match.multiple = eCalc.item(sku).multiple;
                match.total_cancelable_eaches = orderLine.in_stock_eaches[sku]  + orderLine.pending_eaches[sku];  
                match.total_cancelable_units = match.total_cancelable_eaches / match.multiple;
                match.canceling_eaches = 0;
                match.canceling_units = 0;

                
                matching_orders.push(match);      
            }
        })

        matching_orders.sort(function(order_a, order_b){
            //sort by higher multiples
            return order_b.multiple - order_a.multiple;
        })

        matching_orders.sort(function(order_a, order_b){
            //sort by higher cancelable qty
            return order_b.total_cancelable_eaches - order_a.total_cancelable_eaches;
        })        

        /*matching_orders.sort(function(order_a, order_b){        
            console.log(order_a.unit_breakdown.length - order_b.unit_breakdown.length)
            return order_a.unit_breakdown.length - order_b.unit_breakdown.length;
        })*/  

        //sort sets to the bottom      
        var sets = [];
        for (var i = 0; i < matching_orders.length; i++) {
            if(matching_orders[i].unit_breakdown.length > 1){
                sets.push(matching_orders[i]);
                matching_orders.splice(i, 1);
                i--;                                        
            }            
        } 
        for (var i = 0; i < sets.length; i++) {
           matching_orders.push(sets[i])
       }       
        //find the best order line to cancel, pre fill canceling_eaches and place it at top of list
        bestMatches(matching_orders, sku, canceled_qty);
               
        return matching_orders
                
    }

    function cancelSkuFrm(){    
        frm = new ordersTbl.editor(function(data){
            frm.showLoading ('finding matching orders');            
            
            var ordersToCancel = findMatchingOrders(data[0].sku, data[0].canceled_eaches);                        
            
            if(ordersToCancel.length > 0){
                cancelOrdersFrm(ordersToCancel, data[0].sku, data[0].canceled_eaches);
            }else{
                frm.hideLoading();
                msgbox.showMsg('No Orders found for this SKU!!!')
            }
        }).init([
            {                                                        
                sku:{value:'', caption:'SKU', useInput:true, type:'text'},
                canceled_eaches:{value:'', caption:'Canceled Eaches', useInput:true, type:'number', min:1}
            },
        ]).caption("Canceled SKU")
        
        ordersTbl.showMenuBack = false;
        ordersTbl.toggleMenuOptions();
    }

    function cancelOrdersFrm(ordersToCancel, sku, canceled_qty){
        var main_cap = 'Cancelling SKU: <span style="color:black;">' + sku + '</span> Target Cancel Quantity: <span style="color:black;">' + canceled_qty + '</span><br>';

        var frm = new ordersTbl.editor(function(data){                        
            frm.showLoading()
            var request = _client.generateRequestObj('cancelOrdersFrm @reportsCentralMod'), cancel_data = [];
            var download_data = []
            for (var i = 0; i < data.length; i++) {                
                if(data[i].canceling_units > 0){
                    cancel_data.push(data[i]);

                    download_data.push({
                        asin:data[i].asin,
                        amazon_po:data[i].amazon_po,
                        sku:data[i].sku,
                        canceled_units:data[i].canceling_units,
                    })                    
                }
            }
            
            request.canceled_orders = cancel_data;

            db.app.cancelOrders(request, function(data){                
                frm.show=false;
                
                var request =  _client.generateRequestObj('cancelOrdersFrm @download Canceled')
                request.mongoQuery.insert = {download:download_data};

                db.collection('aux').insert(request, function(data){
                    window.open('db/export/toexcel/'+ data._id +'/' + 'Canceled Order Lines ');
                    getData();
                })                             
            })

        })
        .useHeaders([
            {pName:'amazon_po', caption:'Amazon PO'},
            {pName:'asin', caption:'ASIN'},
            {pName:'sku', caption:'SKU'},
            {pName:'total_cancelable_eaches', caption:'Cancelable Eaches'},
            {pName:'canceling_eaches', caption:'Eaches to Cancel', useInput:true, type:'number', min:0, maxFrom:'total_cancelable_eaches', readOnly:true},
            {pName:'canceling_units', caption:'Eaches to Units', useInput:true, type:'number', min:0, maxFrom:'total_cancelable_units', onChange:unitsChanged},             
        ])            
        .caption(
            main_cap  
            + 'Total Units Cancelling: <span style="color:black;">' 
            + sumOfKeys(ordersToCancel, 'canceling_units') 
            + '</span> Total Eaches Cancelling: <span style="color:black;">' 
            + sumOfKeys(ordersToCancel, 'canceling_eaches') + '</span><br>' 
        )
        .showCount()
        .init(ordersToCancel)

        ordersTbl.showMenuBack = false;
        ordersTbl.toggleMenuOptions();
        

        //following function used to keep eaches and unit insync
        function unitsChanged(data, line, frm){            
            var mul = findByKey(ordersToCancel, '_id', line._id)[0].multiple, total_eaches = 0, total_units = 0;
            line.canceling_eaches.value = data.value * mul;

            for (var i = 0; i < frm._data.length; i++) {
                total_units +=  frm._data[i].canceling_units.value;
                total_eaches += frm._data[i].canceling_eaches.value;
            }

            frm.cap = main_cap 
            + 'Total Units Cancelling: <span style="color:black;">' 
            + total_units 
            + '</span> Total Eaches Cancelling: <span style="color:black;">' 
            + total_eaches + '</span><br>' 
        }

    }
    return ordersTbl
}])

