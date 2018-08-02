angular.module('tblMod', [
    'infinite-scroll', 
    'angularResizable'
])

.service('tbl', ['_client', '$$db', '$$msgbox', function(_client, db, msgbox){
	
	console.log('rock-a-bye from tbl');
	var instance = function(downloadTbl, tblChanged){
		var tbl = {}, _menus;
		tbl.setData  = setData;
		tbl.increaseScrollLimit = increaseScrollLimit;
		tbl.resetScrollLimit = resetScrollLimit; 
		tbl.sort = sort;
		tbl.toggleFilter = toggleFilter;
		tbl.hideAllFilters = hideAllFilters;
		tbl.clearFilter = clearFilter;
		tbl.filterKeydown = filterKeydown;
		tbl.selectAllClick = selectAllClick;
		tbl.selectOne = selectOne;
		tbl.toggleMenuOptions = toggleMenuOptions;
		tbl.setMenus = setMenus;
		tbl.filterSelection = filterSelection;
        tbl.filter = filter;
        tbl.validateSelection = validateSelection;
        tbl.initData = initData;
        tbl.editor = editor;
        tbl.clearAll = clearAll;        
        tbl.selectById = selectById;
        tbl.quickFilter = quickFilter;

		tbl.uniqueID = 'myTbl';
        tbl.height = parseInt(screen.height *.631 + .99); // in px ;               
        tbl.width = parseInt((screen.width) * 0.9713229166666667);               
		tbl.data = [];
		tbl.filteredData = [];
		tbl.selectionCount = 0;
		tbl.activeFilter = {};
        tbl.menus = [];
        tbl.headers = [];
        tbl.quickSearch = "";
        tbl.dataEditor = {};
        tbl.selectionFilterIds = [];        

        function editor(submitCB){
            var editor = this;
            editor.submit = submit;
            editor.initFromHeaders = initFromHeaders;
            editor.init = init;
            editor.useHeaders = useHeaders;
            editor.showCount = showCount;
            editor.hideCount = hideCount;
            editor.showLoading = showLoading;
            editor.hideLoading = hideLoading;

            editor.cap =''; 
            editor.caption = caption;
            editor.show = false;
            editor._data = [],
            editor.show_count = false;
            editor.loading = false;
            editor.loading_msg = ''
            editor.loading_msg_top = '0';

            editor.data = [
                /* Test Data / Example Data */
                {
                    _id:'id',                    
                    asin:{value:'B01AZBXJK6', caption:'ASIN'},
                    sku:{value:'BIO2G-X6', caption:'SKU'},
                    pending_eaches:{value:60, caption:'Pending Eaches'},
                    rec_qty:{value:60, caption:'Eaches To Receive', useInput:true, type:'text' , max:60, min:0, style:''}
                },
                {
                    _id:'id',                    
                    asin:{value:'B01AZBXJK6', caption:'ASIN'},
                    sku:{value:'5539017-X10', caption:'SKU'},
                    pending_eaches:{value:60, caption:'Pending Eaches'},
                    rec_qty:{value:60, caption:'Eaches To Receive', useInput:true, type:'number' , max:60, min:0, style:''}
                }
            ];
            
            function showLoading(msg, top){
                editor.loading_msg = msg || 'processing';
                editor.loading = true 
                editor.loading_msg_top = (top + 'px') || '0' 
            }
            function hideLoading(){
                editor.loading_msg = '';
                editor.loading = false      
            }

            function caption(str){
                editor.cap = str
                return editor
            }
            function showCount(){                
                editor.show_count = true;
                return editor
            }
            function hideCount(){                
                editor.show_count = false;
                return editor
            }

            function submit(){
                var _data = [];
                
                for (var i = 0; i < editor._data.length; i++) {
                    var item = {};
                    item._id = editor._data[i]._id;
                    for (var n = 0; n < editor._data[i].headers.length; n++) {
                        item[editor._data[i].headers[n]] = editor._data[i][editor._data[i].headers[n]].value
                    }                
                    _data.push(item)
                }
                submitCB(_data);
            }

            function init(data){
                data = data || editor.data;
                if(editor.headers){
                    initFromHeaders(editor.headers, data);
                }else{
                    _init(data)
                }
                return editor
            }

            function _init(data){            
                editor._data = [];
                for (var i = 0; i < data.length; i++) {
                    var pNames = Object.getOwnPropertyNames(data[i]), headers = [];

                    for (var n = 0; n < pNames.length; n++) {
                        if(pNames[n] != '_id'){headers.push(pNames[n])}
                    }

                    data[i].headers = headers;
                    editor._data.push(data[i]);
                }

                tbl.dataEditor = editor;
                tbl.dataEditor.show = true;
            }

            function useHeaders(headers){
                editor.headers = headers;
                return editor
            }

            function initFromHeaders(headers, data){

                var _data = [];
                
                for (var i = 0; i < data.length; i++) {
                    var itemDef = {};
                    itemDef._id = data[i]._id;
                    for (var n = 0; n < headers.length; n++) {                        
                        itemDef[headers[n].pName] = {};
                        itemDef[headers[n].pName].value = (headers[n].value != undefined)? headers[n].value:data[i][headers[n].pName];
                        itemDef[headers[n].pName].onChange = headers[n].onChange;
                        //itemDef[headers[n].pName] = obj(headers[n]).cloneKeys(['caption', 'useInput', 'type', 'max', 'min'], itemDef[headers[n].pName]);
                        itemDef[headers[n].pName] = cloneKeys(headers[n], null, itemDef[headers[n].pName]);

                        if(itemDef[headers[n].pName].type === 'number'){
                            itemDef[headers[n].pName].max = (headers[n].max != undefined)? headers[n].max:data[i][headers[n].maxFrom];
                            itemDef[headers[n].pName].min = (headers[n].min != undefined)? headers[n].min:data[i][headers[n].minFrom];
                        }
                    }
                    
                    _data.push(itemDef)
                }
                
                _init(_data);
            }

            return editor
        }


		tbl.footer = [
            {
                caption:'Total Selected',
                value:function(){
                    return tbl.selectionCount;
                }

            },

            {
                caption:'Total Showing',
                value:function(){
                	if(!(tbl.filteredData)){
                		debugger
                	}
                    return tbl.filteredData.length;
                }

            },
            {
                caption:'Total Lines',
                value:function(){
                    return tbl.data.length
                }

            }
        ];
        
    	var defaultMenu = {
            caption:'Table Options',
            type:'dropdown',
            icon:'table icon',
            showOptions:false,                       
            options:[
            	{
            		caption:'Filter Selection',
            		type:'button',
            		icon:'filter icon',
            		clickAction:filterSelection,
            	},
            	{
            		caption:'Clear Filters',
            		type:'button',
            		icon:'filter icon clear',
            		clickAction:function(){
            			clearAllFilters();
            			tbl.filteredData = tbl.data;
                        if(typeof tblChanged === 'function'){tblChanged()}
            		}
            	},
            	{
            		caption:'Download Selection',
            		type:'button',
            		icon:'download icon',
            		clickAction:downloadSelection
            	}
            ]
        }
	    
        function initData(data, header, json){

            if(header.data_type === 'date'){
                data = moment(data).format("M/D/YY"); 
            }

            var html = highlight(data);
                                
            return header.setData(data, json, html, header);
        }

        function highlight(str){
            str = str + '';
            if(tbl.quickSearch != ''){
                if(isSubStr(tbl.quickSearch, str)){ 
                    if(!(str.replace)){
                        debugger
                    }
                    return str.replace(new RegExp( '('+ tbl.quickSearch +')', 'gi'), '<span class="highlighted">$1</span>')                                       
                }   
            }
            return str
        }
        function isItems(data, pName){
            //determine if string data fields contain a list of items or full sentences
            // this means that each value is on word containing no spaces
            //example being a list of colors

            //look at first five rows to determine
            for (var i = 0; i < data.length; i++) {
                var str = data[i][pName] || '';
                if(typeof str === 'string'){
                    if(str.split(' ').length > 1){
                        return false
                    }
                }
                if(i >5){break}
            }

            return true
        }
		function setData(data, callBack){ 
											         	            
			for (var i = 0; i < tbl.headers.length; i++) {
                var data_type = 'string';

                if(data.length > 0){								
					data_type = typeof data[0][tbl.headers[i].pName];
					
					if(data_type === 'string' && isSubStr('date', tbl.headers[i].pName)){
						data_type ='date';
						for (var n = 0; n < data.length; n++) {
							data[n][tbl.headers[i].pName] = moment(data[n][tbl.headers[i].pName])._d;
						}					
					}else if(data_type != 'number') { 
                        data_type = 'string';    
                        tbl.headers[i].isBlank = false;
                        tbl.headers[i].notBlank = false;                    
                    }				
                }

				tbl.headers[i].data_type = data_type;
                tbl.headers[i].includeColumn = (tbl.headers[i].includeColumn === undefined)?  true:tbl.headers[i].includeColumn ;
				tbl.headers[i].filterValue1 = (tbl.headers[i].filterValue1 === undefined)? '':tbl.headers[i].filterValue1 ;
				tbl.headers[i].filterValue2 = (tbl.headers[i].filterValue2 === undefined)? '':tbl.headers[i].filterValue2 ;
                
                if(data_type === 'string'){
                    tbl.headers[i].splitBy = (isItems(data, tbl.headers[i].pName))? ' ':null;    
                }

				tbl.selectionCount = 0;
				tbl.headers[i].showFilter = false;
			}
			

            if(_menus){_menusInit()}
            resizeCells();							
            tbl.data = data;
            tbl.filteredData = tbl.data;            
            if(tbl.selectionFilterIds.length > 0){
                reFilterSelection();
            }else{
                filter();      
            }
            
            tbl.ready = true;
            if(typeof callBack === 'function'){callBack()}   
            if(typeof tblChanged === 'function'){tblChanged()}                          
        }
    	function resizeCells(){
    		var count = 0;
    		for (var i = 0; i < tbl.headers.length; i++) {
    			if(tbl.headers[i].includeColumn){
    				count++
    			}
    		}
    		
    		tbl.cellWidth = parseInt( screen.width *.93/count+.99);    		
    	}
    	function increaseScrollLimit(){
            //used on ng-repeat param 'limitTo'
            tbl.scrollLimit+=10;
        }
        function resetScrollLimit(){
            tbl.scrollLimit = 50;
        }
        resetScrollLimit();

        //-----------------------sorting and filtering functionality---------------------------
        tbl.sortFields = [];
        tbl.sortReverse = false;

        function sort(pName){
            var index = tbl.sortFields.indexOf(pName);

            if(index ===  -1){
                tbl.sortFields.unshift(pName);
                //only doing two fields at a time for now                
                if(tbl.sortFields.length >= 3){tbl.sortFields.splice(2, 1)}
            }else if(index != 0){
                //swich posistings
                tbl.sortFields.splice(1, 1)
                tbl.sortFields.unshift(pName);
            }else{
                tbl.sortReverse = !tbl.sortReverse; 
            }                        
        }

        function toggleFilter(header){        	
        	header.showFilter = true;
        	tbl.showFilterBack = true;
        	tbl.activeFilter = cloneKeys(header, ['filterValue1', 'filterValue2', 'isBlank', 'notBlank', 'pName']);
        	 window.setTimeout(function() {
                var id = '#' + header.pName + '-filter1';
                $(id).select();
            }, 10);        	
        }

        function clearFilter(header){
        	header.filterValue1 = '';
        	header.filterValue2 = '';
            header.isBlank = false;
            header.notBlank = false;
        	hideAllFilters();            
        }
        function hideAllFilters(){
        	var shouldFilter = false;
        	for (var i = 0; i < tbl.headers.length; i++) {        		
        		tbl.headers[i].showFilter = false;
				
                  
				//all this is to speed up this execution of this function
				//the code will only enter this loop once
				if(tbl.headers[i].pName === tbl.activeFilter.pName){
                    /*tbl.activeFilter.filterValue1 = tbl.activeFilter.filterValue1 || '';
                    tbl.activeFilter.filterValue2 = tbl.activeFilter.filterValue2 || '';
                    tbl.activeFilter.isBlank = tbl.activeFilter.isBlank || false;
                    tbl.activeFilter.notBlank = tbl.activeFilter.notBlank || false;*/
					if(tbl.headers[i].filterValue1 !== tbl.activeFilter.filterValue1 || tbl.headers[i].filterValue2 !== tbl.activeFilter.filterValue2 || 
                        tbl.headers[i].isBlank !== tbl.activeFilter.isBlank || tbl.headers[i].notBlank !== tbl.activeFilter.notBlank){
						filter()
					}
				}else{
                    tbl.headers[i].filterValue1 = (tbl.headers[i].filterValue1) || '';
                    tbl.headers[i].filterValue2 = (tbl.headers[i].filterValue2) || '';
                }                
        	}

        	tbl.showFilterBack = false;        	
        }
        function clearAllFilters(){
        	for (var i = 0; i < tbl.headers.length; i++) {        		
        		tbl.headers[i].filterValue1 = '';
        		tbl.headers[i].filterValue2 = '';
                tbl.headers[i].isBlank = false;
                tbl.headers[i].notBlank = false;
                tbl.selectionFilterIds = [];
        	}
            tbl.quickSearch = '';                                  
        }

        function quickFilter(){

            if(tbl.quickSearch === ''){
                filter()
             
            }else{
                var filteredData = [];
                var pNames = Object.getOwnPropertyNames(tbl.filteredData[0])

                for (var i = 0; i < tbl.filteredData.length; i++) {
                    var str = '';

                    for (var n = 0; n < pNames.length; n++) {
                        str += tbl.filteredData[i][pNames[n]];
                    }

                    if(isSubStr(tbl.quickSearch, str)){
                        filteredData.push(tbl.filteredData[i])
                    }
                }

                tbl.filteredData = filteredData;
                tbl.resetScrollLimit();
                tbl.selectAll = false;
                tbl.selectionFilterIds = [];
                if(typeof tblChanged === 'function'){tblChanged()}
            }
                
        }
        function isSubStr(subStr, fullStr, splitBy){ //create a procedure to handle multi comma seperated string filters
            //expect comma seperated values
            var strArr = subStr.split(splitBy);

            for (var i = 0; i < strArr.length; i++) {                 
                //create a RegExp from the tblHead subStr1
                var regx = '/*' + strArr[i].trim().toUpperCase() + '/*';

                var pattern = new RegExp(regx);
                //check the RegExp for each filter value against its curresponding property value
                 if(pattern.test((fullStr + "" ).trim().toUpperCase()) || strArr[i] === ''){
                    return true
                 }
            }
            return false    	        
	    }
	    function isNotSubStr(subStr, fullStr){
	    	return !isSubStr(subStr, fullStr) || subStr ===''
	    }

        function filter(header){
        	var filteredData = [],  showRow, filterValue1, filterValue2, propertyValue;

        	for (var i = 0; i < tbl.data.length; i++) {
                
        		for (var n = 0; n < tbl.headers.length; n++) { 
	    			filterValue1  = tbl.headers[n].filterValue1;
	                filterValue2  = tbl.headers[n].filterValue2;
	                propertyValue = tbl.data[i][tbl.headers[n].pName];

	                if(tbl.headers[n].data_type === 'string'){
                        var splitBy = tbl.headers[n].splitBy;
	                    showRow  = (isSubStr(filterValue1, propertyValue, splitBy) && isNotSubStr(filterValue2, propertyValue, splitBy)) 
                        && (!tbl.headers[n].isBlank || (tbl.headers[n].isBlank && propertyValue === '')) 
                        && (!tbl.headers[n].notBlank || (tbl.headers[n].notBlank && propertyValue != ''))

	                }else if(tbl.headers[n].data_type === 'number' || tbl.headers[n].data_type === 'date'){
	                    filterValue1 = (filterValue1 ==='' || filterValue1 == null) ? -Infinity : filterValue1;
	                    filterValue2 = (filterValue2 ==='' || filterValue2 == null) ? Infinity : filterValue2;
	                    showRow = propertyValue >= filterValue1 && propertyValue <= filterValue2;
	                }
	                if(!showRow){
	                	break
	                } 	                
                }
                if(showRow){filteredData.push(tbl.data[i])}/*else{
                    debugger
                }*/
        	}
        	tbl.filteredData = filteredData;
            tbl.resetScrollLimit();
            tbl.selectAll = false;
            tbl.selectionFilterIds = [];
            if(typeof tblChanged === 'function'){tblChanged()}
        }

        function filterKeydown(keyEvent){
        	if(keyEvent.which === 13){
        		hideAllFilters();
        	}
        }

         function selectAllClick(){
            for (var i = 0; i < tbl.filteredData.length; i++) {
                
                selectOne(tbl.filteredData[i],  tbl.selectAll);                        
            }            
        }

        function selectOne(data, sel){
            sel = (!(sel === undefined))? sel: !data.selected;
            data.selected = data.selected || false;

            if(data.selected != sel){                
                data.selected = sel;
                if(sel){                    
                    tbl.selectionCount++;
                }else{                    
                    tbl.selectionCount--;
                }
            }
        }

        function selectById(arr){
            var count = 0;

            for (var i = 0; i < tbl.filteredData.length; i++) {

                if(arr.indexOf(tbl.filteredData[i]._id) > -1){
                    //debugger
                    selectOne(tbl.filteredData[i])
                    count++
                    if (count >= arr.length) {break}    
                }
                
            }
        }
        function createColumnMenu(){
        	// create a table menu  for showing and hiding columns
            //can only be created after table headers are deifined
        	var columnMenu = {
        		caption:'Show/Hide columns',
	            type:'dropdown',
	            icon:'hide icon',
	            showOptions:false,                       
	            options:[]
        	};

        	for (var i = 0; i < tbl.headers.length; i++) {

                tbl.headers[i].includeColumn = (tbl.headers[i].includeColumn)? tbl.headers[i].includeColumn : true;
				columnMenu.options.push(new _menuOption(tbl.headers[i]));        			       		
        	}
        	tbl.menus.unshift(columnMenu)
        }
        function _menuOption(header){
        	var option = {
				caption:header.fieldName,
        		type:'checkbox',
        		value:header.includeColumn,            		
        		clickAction:function(){
        			header.includeColumn = !header.includeColumn;
        			option.value = header.includeColumn;
        			resizeCells();
        		}        			
    		}   
    		return option; 		
        }

        function toggleMenuOptions(menu){
        	var show = (menu)?!menu.showOptions:null;

        	for (var i = 0; i < tbl.menus.length; i++) {
        		tbl.menus[i].showOptions = false;
        	}

        	if(menu){  
        		menu.showOptions = show;
        		tbl.showMenuBack = show;      
        	}
        }

        function setMenus(new_menus){
            tbl.menus = [defaultMenu]
            
            _menus = new_menus;            
            if(tbl.headers.length > 0){
                _menusInit();                
            }			
        }

        function _menusInit(){
        	createColumnMenu();
        	for (var i = 0; i < _menus.length; i++) {
        		tbl.menus.unshift(_menus[i]);
        	}
        	_menus = null;
        }

        function reFilterSelection(){
            selectById(tbl.selectionFilterIds)
            filterSelection();
        }

        function filterSelection(){
            clearAllFilters();

            var filteredData = [];   
            tbl.data.forEach(function(data){
                if(data.selected){
                    filteredData.push(data)
                    tbl.selectionFilterIds.push(data._id)
                }
            })   

            tbl.filteredData = filteredData;
            resetScrollLimit();
            tbl.selectAll = false;
            if(typeof tblChanged === 'function'){tblChanged()}
        }

        function validateSelection(callBack){
            if (tbl.selectionCount === 0){
                msgbox.showMsg('Select the rows you would like to work on!!!');
                tbl.ready = true;
            }else{
                //tbl.ready = false
                filterSelection();                
                if(tbl.selectionCount != tbl.filteredData.length){
                    clearAll();
                    msgbox.showMsg('Select the rows you would like to work on!!!');
                    tbl.ready = true;
                }else{
                    callBack(tbl.filteredData) 
                }                               
            }        
        }

        function downloadSelection(){        	
        	if(typeof downloadTbl === 'function'){
            	validateSelection(function(selection){
                    var _ids = uniqueKeys(selection, '_id')
                    var request = _client.generateRequestObj('tbl > downloadSelection')

                    request.mongoQuery.find = {_id:{$in:_ids}};
                    
                    downloadTbl(request, function(data){
                        //console.log(data);
                        tbl.ready = true;
                    })
                })    	                    
            }
        }

        function clearAll(){
            tbl.selectAll = false;
            selectAllClick();
            tbl.filteredData = tbl.data;
            clearAllFilters();
            if(typeof tblChanged === 'function'){tblChanged()}
        }

		return tbl
	}

	return instance;
}])

.directive('tbl', function(){
    return {
        restrict : "E",
        templateUrl : "templates/tbl.html"
    };
})


.filter('$$unsafe', function($sce){ 

    return function(data){

        if(!isNaN(data) && data !== null){
            data = data.toString();
        }
        return $sce.trustAsHtml(data); 
    }
})

/*.filter("highlight", ['$sce', 'tbl', function($sce, tbl){
    console.log('ddsf')
    //debugger
    return function(data,  searchText){
         
        debugger
        if(typeof data === 'string'){

            
            data = data.replace(new RegExp( '('+ searchText +')', 'gi'), '<span class="highlighted">$1</span>')
        }
        return $sce.trustAsHtml(data);            
    } 

}])*/