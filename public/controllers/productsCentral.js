angular.module('productsCentralMod', [])

.controller('productsCentralCtrl', ['$scope', 'productsTbl', '$$msgbox', 'navBar', function($scope, productsTbl, $$msgbox, navBar){
	
    navBar.currentView = "ProductsCentral"

    $scope.$$msgbox = $$msgbox;
	$scope.tbl = productsTbl;

	productsTbl.getData();
	
	productsTbl.sortReverse = true;
	$scope.test = function(){
		console.log(productsTbl)
	}
}])

.service('productsTbl', ['$$db', '_client', 'tbl', 'tasks', '$$eachesCalc', '$$msgbox',  function(db, _client, tbl, tasks, eachesCalc, msgbox){

	var productsTbl = tbl(downloadProducts);
	productsTbl.getData = getData;
    productsTbl.uploadFile = uploadFile;

    var asinHeaders = [        
         {
            pName:'_id',
            fieldName:'ID',                       
            setData: function(data, json, html){
                return html 
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
            pName:'category',
            fieldName:'WH Category',                       
            setData: function(data){                
                return data;
            }
        },
        {
            pName:'vendor_code',
            fieldName:'Vendor Code',                       
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'labels_required',
            fieldName:'Labels Required',                       
            setData: function(data){                
                return (data) ? 'TRUE' : 'FALSE';
            }
        },
        {
            pName:'prep_instructions',
            fieldName:'Prep Instructions',                       
            setData: function(data, json, html){
                return html
            }
        },
        {
            pName:'pf_sku',
            fieldName:'PF SKU',                       
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'multiple',
            fieldName:'Multiple',                       
            setData: function(data, json, html){
                return html;
            }
        }
        
    ]

    skusHeader =[
        {
            pName:'sku',
            fieldName:'SKU',            
            setData: function(data, json, html){
                return html
            }
        },
        {
            pName:'description',
            fieldName:'Description',            
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'created_date',
            fieldName:'Created Date',            
            setData: function(data){
                return moment(data).format("M/D/YY");
            }
        },
        {
            pName:'is_set',
            fieldName:'Is Set',            
            setData: function(data){
                return (data) ? 'TRUE' : 'FALSE';
            }
        },
        {
            pName:'set_skus',
            fieldName:'Set SKUS',            
            setData: function(data, json){

                return (json.is_set) ? eachesCalc(json.set_breakdown).toSKU_HTML(): '<strong>'+ data +'</strong>'
            }
        },
        {
            pName:'upcs',
            fieldName:'UPCs',            
            setData: function(data, json, html){
                return data;
            }
        },
        /*{
            pName:'keywords',
            fieldName:'Keywords',            
            setData: function(data, json, html){
                return html;
            }
        },*/
        {
            pName:'vendor_codes',
            fieldName:'Vendor Codes',            
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'vendor_skus',
            fieldName:'Vendor SKUS',            
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'weight',
            fieldName:'Weight',            
            setData: function(data, json, html){
                return html;
            }
        },
        {
            pName:'deprecated',
            fieldName:'Deprecated',            
            setData: function(data){
                return (data) ? 'TRUE' : 'FALSE';
            }
        },
        {
            pName:'alternative_sku',
            fieldName:'Replacement SKU',            
            setData: function(data, json, html){
                return html;
            }
        }

    ]

    productsTbl.viewModes = [
        {
            caption:'ASINS',
            query:'asinData',            
            clickAction:getData
        },
        {
            caption:'PF SKUS',
            query:'pf_skus',            
            clickAction:getData
        },      
    ];
    productsTbl.viewMode = productsTbl.viewModes[0].query;

    productsTbl.setMenus([
        
             
    ])
    var pf_skusMenus =[    	
        {
            caption:'Edits And Corrections',
            type:'dropdown',
            icon:'edit icon',
            showOptions:false,                       
            options:[
                {
                    caption:'Export SKUS for Editing',
                    type:'button',
                    icon:'file excel outline icon',
                    clickAction:exportForEditing
                },
                {
                    caption:'Import Edits',
                    type:'file',
                    icon:'upload icon',
                    name:'edit_skus',
                    clickAction:function(){

                    }
                }
            ]
        }   
    ]


    var asinDataMenus = [
    	{
            caption:'Add ASINS',
            type:'dropdown',
            icon:'plus icon',
            showOptions:false,                       
            options:[
                {
                    caption:'ASIN Upload Template',
                    type:'button',
                    icon:'file excel outline icon',
                    clickAction:function(){
                        window.open('/db/templates/ASIN Data Upload Template.xlsm')
                    }
                },
                {
                    caption:'Upload New ASINS',
                    type:'file',
                    icon:'upload icon',
                    name:'new_asins',
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
                    caption:'ASIN Data Editor',
                    type:'button',
                    icon:'file excel outline icon',
                    clickAction:asinEditorDownload
                },
                {
                    caption:'Import Edits',
                    type:'file',
                    icon:'upload icon',
                    name:'edit_asins',
                    clickAction:function(){

                    }
                },
                {
                    caption:'Delete ASINS',
                    type:'button',
                    icon:'trash icon',
                    clickAction:function(){

                    }
                }
            ]
        }   
    ]
    

    var menus ={
    	asinData:asinDataMenus,
    	pf_skus:pf_skusMenus
    }   		
    var headers = {
    	asinData:asinHeaders,
    	pf_skus:skusHeader
    }

    function getData(){
    	productsTbl.ready = false;
        var request = _client.generateRequestObj('getData > productsTbl  > productsCentralMod');    
        request.mongoQuery.find = {};

        db.collection(productsTbl.viewMode).find(request, function(data){
            if(data){
            	console.log(data);
            	productsTbl.headers = headers[productsTbl.viewMode];
            	productsTbl.setMenus(menus[productsTbl.viewMode]);

            	if(productsTbl.viewMode === 'pf_skus'){
            		for (var i = 0; i < data.length; i++) {
						data[i].set_skus = (data[i].is_set)? eachesCalc(data[i].set_breakdown).toSKU():'N/A';
                        data[i].upcs = data[i].upcs.join(", ");
                        //data[i].vendor_codes = data[i].vendor_codes.join(", ");
                        //data[i].vendor_skus = data[i].vendor_skus.join(", ");
            		}
            	}
            	productsTbl.setData(data);
            }                        
        })
    }

    function skuEditerTemplate(){

    }
    
    function uploadFile (input){        
        console.log(input.files[0]);                
        var request = _client.generateRequestObj('productsTbl.uploadFile productsCentralMod');
        request.file = input.files[0];        
        console.log('i Mean its working');

        if(input.name === 'new_asins'){         	          
            productsTbl.ready = false;
            db.collection('asinData').xlInsert(request, function(data, err){ 
                productsTbl.ready = true;        
                if (data){                                            
                    productsTbl.getData();
                    console.log(data);
                }
            })
        } else 
        if(input.name === 'edit_asins'){
           	productsTbl.ready = false;
            db.collection('asinData').xlUpdate(request, function(data, err){ 
                productsTbl.ready = true;        
                if (data){                                            
                    productsTbl.getData();
                    console.log(data);
                }
            })
        }else 
        if(input.name === 'edit_skus'){
			productsTbl.ready = false;
            db.collection('pf_skus').xlUpdate(request, function(data, err){ 
                productsTbl.ready = true;        
                if (data){                                            
                    productsTbl.getData();
                    console.log(data);
                }
            })            	
        }
    
        $(input).val('');
    }

    function downloadASINs(name){
        var request = _client.generateRequestObj('downloadASINs @productsCentralMod');
        request.mongoQuery.insert = {download:productsTbl.filteredData};

        db.collection('aux').insert(request, function(data){
            window.open('db/export/toexcel/'+ data._id +'/ ' + name + ' Download ' + moment().format("MMM Do YY"));            
        })
    }

    function downloadProducts(request, callBack){
    	if(/*productsTbl.viewMode != 'pf_skus'*/ true){downloadASINs(productsTbl.viewMode); return}

    	db.collection(productsTbl.viewMode).xlDownload(request, function(data){
			console.log(data);
			callBack();
		})
    }    

    function exportForEditing(){
    	productsTbl.validateSelection(function(selection){
    		var request = _client.generateRequestObj('Export SKUS for Editing @productsCentralMod');
    		var unique_ids = uniqueKeys(selection, '_id') 
			
			request.mongoQuery.find = {_id:{$in:unique_ids}};                    					
			request.setTasks = ['skuEditorDownload'];
			request.collName = 'pf_skus';
			
			db.app.xlDownload(request, function(data){
				productsTbl.ready = true;
			})
    	})
    }

    function asinEditorDownload(){
        productsTbl.validateSelection(function(selection){
            var request = _client.generateRequestObj('asinEditorDownload @productsCentralMod');
            var unique_ids = uniqueKeys(selection, '_id') 
            
            request.mongoQuery.find = {_id:{$in:unique_ids}};                                       
            request.setTasks = ['asinEditorDownload'];
            request.collName = 'asinData';
            
            db.app.xlDownload(request, function(data){
                productsTbl.ready = true;
            })
        })          
    }
    return productsTbl
}])