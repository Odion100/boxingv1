angular.module('receiptsCentralMod', [])

.controller('receiptsCentralCtrl', ['$scope', 'receiptsTbl', '$$msgbox', 'navBar', function($scope, receiptsTbl, $$msgbox, navBar){
	
    navBar.currentView = "ReceiptsCentral"

    $scope.$$msgbox = $$msgbox;
	$scope.tbl = receiptsTbl;

	receiptsTbl.getData();
	//receiptsTbl.sortPropertyName = 'order_date';
	//receiptsTbl.sortReverse = true;
	$scope.test = function(){
		console.log(receiptsTbl)
	}
}])


.service('receiptsTbl', ['$$db', '_client', 'tbl', 'tasks', '$$eachesCalc', '$$msgbox',  function(db, _client, tbl, tasks, $$eachesCalc, msgbox){

	var receiptsTbl = tbl(downloadReceipts);
	receiptsTbl.getData = getData;
    receiptsTbl.uploadFile = uploadFile;

	var header1 = [
        {
            pName:'line',
            fieldName:'Line #',                                                                        
            setData: function(data, json, html){
                return html
            }
        },
        {
            pName:'receipt_number',
            fieldName:'Receipt #',                                                                        
            setData: function(data, json, html){
                return html
            }
        },
        {
            pName:'receipt_date',
            fieldName:'Receipt Date',                                                                        
            setData: function(data, json, html){
                return html
            }
        },
        {
            pName:'po_number',
            fieldName:'PO #',                                                                        
            setData: function(data, json, html){
                return html
            }
        },        
        {
            pName:'vendor_code',
            fieldName:'Vendor Code',                                                                        
            setData: function(data, json, html){
                return html
            }
        },
        {
            pName:'pf_sku',
            fieldName:'SKU',                                                                        
            setData: function(data, json, html){
                return html
            }
        },
        {
            pName:'rec_qty',
            fieldName:'Receipt Qty',                                                                        
            setData: function(data, json, html){
                return html
            }
        },
        {
            pName:'used_qty',
            fieldName:'Total Qty Used',                                                                        
            setData: function(data, json, html){
                return html
            }
        }
    ];
    //a cobination with header1 on a it's own header data
    var header2 = (function(){
        var h = [
            {
                pName:'amazon_po',
                fieldName:'Amazon PO',                                                                                                
                setData: function(data, json, html){
                    return html
                }
            },
            {
                pName:'asin',
                fieldName:'ASIN',                                                                                                
                setData: function(data, json, html){
                    return html
                }
            },
            {
                pName:'sku',
                fieldName:'SKU-X',                                                                                                
                setData: function(data, json, html, json){
                    return html //$$eachesCalc(json.unit_breakdown).toSKU_HTML();
                }
            },
            {
                pName:'assigned_eaches',
                fieldName:'Assigned Eaches',                                                                                                
                setData: function(data, json, html){
                    return html
                }
            }
        ]
    	var newHeaders = [];      
        for (var i = 0; i < header1.length; i++) {
            newHeaders.push(header1[i])
        }
        console.log(newHeaders)
        for (var i = 0; i < h.length; i++) {
            newHeaders.push(h[i])
        }

        return newHeaders
    })()

    receiptsTbl.viewModes = [
        {
            caption:'RECEIPTS HISTORY',
            query:['getReceipts', 'totalUsedQty', 'setHeader1'],            
            clickAction:getData
        },
        {
            caption:'ACTIVATED  LINES',
            query:['getReceipts', 'splitRec', 'getOrderData', 'setHeader2'],            
            clickAction:getData
        },

    ];

    receiptsTbl.viewMode = receiptsTbl.viewModes[0].query;

    receiptsTbl.setMenus([
        {
            caption:'Manual Receipts',
            type:'dropdown',
            icon:'plus icon',
            showOptions:false,                       
            options:[
                {
                    caption :'Manual Receipts Template',
                    type:'button',
                    icon:'file excel outline icon',
                    clickAction:function(){
                        window.open('/db/templates/Manual Receipts Template.xlsm')
                    }
                },
                {
                    caption :'Upload Manual Receipts',
                    type:'file',
                    icon:'upload icon',
                    name:'manual_receipts',
                    clickAction:function(){

                    }
                },
                {
                    caption :'Receive All By PO Number',
                    type:'button',
                    iconCombo:{
                        class:'tbl-shipping',
                        icon1:'shipping icon',
                        icon2:'corner add icon'
                    },                                    
                    clickAction:getPONumber
                }
            ]
        }
    ])

    function sendManualReceipt(recs, callBack){        
        var request = _client.generateRequestObj('sendManualReceipt @receiptsCentralCtrl');    
        request.receipts = recs;

        db.app.manualReceipts(request, function(data){
            if(data.status === 'successful'){
                callBack();
            }else{
                msgbox.showMsg('MANUAL RECEIPT ERROR!')
            }
        })
    }

    function getPO(po_number, callBack){
        var request = _client.generateRequestObj('dataInit > getReceipts @receiptsCentralCtrl');    
        request.po_number = po_number;

        db.app.getPO(request, function(data){
            if(data[0].order_qty){
                callBack(data)
            }else{
                callBack()
            }
        })
    }

    function getLinkedPOReport(po_number, callBack){
        var request = _client.generateRequestObj('receiptsTbl getLinkedPOReport  @reportsCentralMod');
        
        request.mongoQuery.find = {$and:[{report_name:'Linked POs Report'}, {linked_po_numbers:po_number}]}

        db.collection('reports').find(request, function(data){
            console.log(data)
            if(data[0]){
                callBack(data[0]);
            }else{
                callBack();
            }
        })
    }
    function removeLinkedPO(report, po_number){
        var request = _client.generateRequestObj('receiptsTbl removeLinkedPO  @reportsCentralMod');
        
        request.mongoQuery.find = {_id:report._id};
        request.mongoQuery.update = {$pull:{linked_po_numbers:po_number}};
        request.parse_id = true;

        db.collection('reports').update(request, function(data){
            console.log(data)            
        })
    }

    function receiptFrmInit(PurOrder, report, po_number){

        frm = new receiptsTbl.editor(function(recs){
            frm.showLoading ('Pocessing');
            var receipt_number = 'MANUAL' + _client.uniqueNumber();
            for (var i = 0; i < recs.length; i++) {
                recs[i].rec_qty = recs[i].order_qty;
                recs[i].order_qty = null;
                recs[i].receipt_number = receipt_number
                recs[i].line = i + 1;                
                recs[i].vendor_code = '';
            }
            sendManualReceipt(recs, function(){
                frm.hideLoading()
                removeLinkedPO(report, po_number);
                msgbox.showMsg('Manual Receipt Successful!!!') 
                getData();
            })
            
        })
        .useHeaders([
            {pName:'po_number', caption:'PO Number'},
            {pName:'pf_sku', caption:'SKU'},                          
            {pName:'order_qty', caption:'Open Qty', useInput:true, type:'number', readOnly:true}
        ])
        .showCount()
        .caption("Manual Receive All")
        .init(PurOrder)
    }

    function getPONumber(){    
        frm = new receiptsTbl.editor(function(data){            
            var po_number = data[0].po_number;
            console.log(data)

            getLinkedPOReport(po_number, function(report){                            
                if(report){                    
                    frm.showLoading ('Searching'); 
                    getPO(po_number, function(PurOrder){
                        frm.hideLoading()
                        if(PurOrder){
                            receiptFrmInit(PurOrder, report, po_number)
                        }else{
                            msgbox.showMsg('PO NOT FOUND!!!' )        
                        }
                    })
                }else{
                    //if po is not linked show msg
                    msgbox.showMsg('PO Number ' + po_number + ' is not linked to vendor orders!!!' )
                }
            })
            
        }).init([
            {                                                                                            
                po_number:{value:'', caption:'PointForce PO Number', useInput:true, type:'text'}
            },
        ]).caption("Enter PO Number Linked to Orders")
        
        receiptsTbl.showMenuBack = false;
        receiptsTbl.toggleMenuOptions();
    }

    var dataInit = new tasks.multiTaskHandler(function(){
        var receipts = [], asinData = [], orderData = [];

        function getReceipts(nextTask){
            receiptsTbl.ready = false;
            var request = _client.generateRequestObj('dataInit > getReceipts @receiptsCentralCtrl');    
            request.mongoQuery.find = {};
            console.log(db)
            db.collection('receipts').find(request, function(data){  
                receipts = data;             
                nextTask(null, data);
           })
        }                    

        function totalUsedQty(nextTask){
            for (var i = 0; i < receipts.length; i++) {
                receipts[i].used_qty = sumOfKeys(receipts[i].linked_orders, 'assigned_eaches');
            }
            nextTask();
        }

        function splitRec(nextTask){
            //split each rec line into multiple lines based on rec allocation data
            var newReceipts = [];
            for (var i = 0; i < receipts.length; i++) {
                receipts[i].used_qty = sumOfKeys(receipts[i].linked_orders, 'assigned_eaches');
                for (var n = receipts[i].linked_orders.length - 1; n >= 0; n--) {
                    var newRecLine = cloneKeys(receipts[i]);

                    newRecLine.order_line_id = receipts[i].linked_orders[n]._id;
                    newRecLine.assigned_eaches = receipts[i].linked_orders[n].assigned_eaches;
                    newReceipts.push(newRecLine)
                }                
            }

            receipts = newReceipts;
            nextTask()
        }            

        function getOrderData(nextTask){            
            var POs =[];

            for (var i = 0; i < receipts.length; i++) {           
                for (var n = 0; n < receipts[i].linked_orders.length; n++) {
                    if(POs.indexOf(receipts[i].linked_orders[n]._id) === -1){
                        POs.push(receipts[i].linked_orders[n]._id)
                    }                    
                }                
            }

            var request = _client.generateRequestObj('dataInit > getOrderData @receiptsCentralCtrl');  

            request.mongoQuery.find = {_id:{$in:POs}}
            
            db.app.getOrders(request, function(data){
                orderData = data;                          
                nextTask();
            })
        }

        function setHeader1(nextTask){
        	receiptsTbl.headers = header1;
        	nextTask();
        }

        function setHeader2(nextTask){
        	receiptsTbl.headers = header2;
        	nextTask();
        }

        function combineData(){                            
            if(orderData.length > 0){
                for (var n = 0; n < receipts.length; n++) {
                    var order_line = findByKey(orderData, '_id', receipts[n].order_line_id)[0];                       
                    if(order_line){
                        receipts[n].asin = order_line.asin;
                        receipts[n].amazon_po = order_line.amazon_po

                        receipts[n].unit_breakdown = order_line.unit_breakdown;   
                        receipts[n].sku = $$eachesCalc(receipts[n].unit_breakdown).toSKU();
                        
                        receipts[n].assigned_units = order_line.unit_breakdown;
                    }else{
                        receipts[n].asin = "N/A"
                        receipts[n].amazon_po = "N/A"

                        receipts[n].unit_breakdown = "N/A"
                        receipts[n].sku = "N/A"
                        
                        receipts[n].assigned_units = "N/A"
                    }
                                    
                }               
            }
            receiptsTbl.ready = true;
            return receipts
        }        

        return{
            getReceipts:getReceipts,
            totalUsedQty:totalUsedQty,
            splitRec:splitRec,
            getOrderData:getOrderData,
            setHeader1:setHeader1,
            setHeader2:setHeader2,              
            _return:combineData
        } 
    })


    function getData(){
    	receiptsTbl.ready = false;

    	dataInit.setTasks(receiptsTbl.viewMode).runTasks(function(err, results){
    		if(err){
    			console.log(err);
    		}else{
    			console.log(results);
    			receiptsTbl.setData(results);    			
    		}
    	})
    }

    function uploadFile (input){        
        console.log(input.files[0]);                
        var request = _client.generateRequestObj('receiptsTbl.uploadFile @ordersCentralMod');
        request.file = input.files[0];        

        if(input.name === 'manual_receipts'){            
            receiptsTbl.ready = false;
            db.collection('receipts').xlInsert(request, function(orders, err){ 
                receiptsTbl.ready = true;        
                if (orders){                                            
                    receiptsTbl.getData();
                    console.log(orders);
                }
            })
        } 
        
    
        $(input).val('');
    }

    function downloadReceipts(request, callBack){
		request.mongoQuery.insert = {download:receiptsTbl.filteredData};

		db.collection('aux').insert(request, function(data){
			window.open('db/export/toexcel/'+ data._id +'/' + 'Receipts Download ' + moment().format("MMM Do YY"));
			callBack();
		})
	}

    return receiptsTbl	

}])