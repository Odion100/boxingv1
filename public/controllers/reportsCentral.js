angular.module('reportsCentralMod', [])

.controller('reportsCentralCtrl', ['$scope', 'reportsTbl', '$$msgbox', 'navBar', function($scope, reportsTbl, $$msgbox, navBar){
	
    navBar.currentView = "ReportsCentral"
    $scope.$$msgbox = $$msgbox;
	$scope.tbl = reportsTbl;

	//reportsTbl.getData();
	reportsTbl.sortPropertyName = 'order_date';
	reportsTbl.sortReverse = true;
	$scope.test = function(){
        //reportsTbl.viewModes[0].caption ="THESE NUTZ!"
		//console.log(reportsTbl)
        console.log(reportsTbl);
        
	}
}])

.service('reportsTbl', ['$$db', '_client', 'tbl', 'tasks', '$$eachesCalc', '$$msgbox', '$stateParams',  function(db, _client, tbl, tasks, eachesCalc, msgbox, stateParams){	
	var reportsTbl = tbl(downloadReport);
    reportsTbl.getData = getData;
    reportsTbl.uploadFile = uploadFile;
    reportsTbl.headers = [
         {
            pName:'default',
            fieldName:'No Reports Found',                        
            setData: function(data, json){
                return data
            }
        }
    ]    

    reportsTbl.comboMenu = {
        caption:'Reports Menu',
        type:'template',
        template:'templates/combo-menu.html',                
        showOptions:false, 
        icon:'file text icon',                      
        options:[
            {
                caption:'Run Reports',
                type:'button',
                icon:'play icon',                                
                clickAction:function(){
                    getData(reportsTbl.comboFilters[1].value, reportsTbl.comboFilters[0].value, true)
                }
            },
            {
                caption:'Add Note',
                type:'button',
                iconCombo:{
                    class:'reports-tbl',
                    icon1:'file text outline icon',
                    icon2:'corner add icon'
                },                                
                clickAction:noteFrmInit
            },
            {
                caption:'Download Notes',
                type:'button',
                icon:'download icon',                
                clickAction:downloadNotes
            },
            {
                caption:'Upload Notes',
                type:'file',
                icon:'upload icon',
                name:'new_notes',
                clickAction:function(){

                }
            }
        ]
    }   

    reportsTbl.comboFilters =[
        {
            caption:'Report Type: ',
            pName:'order_week',
            value:'',
            options:[
                'Linked POs Report'
            ]
        },      
        {
            caption:'Week Range: ',
            pName:'order_week',
            value:'',
            options:[]
        },        
    ]

    reportsTbl.setMenus([reportsTbl.comboMenu])
    function setData(data, json, html){
        return data            
    }
    function initHeaders(headers){
        for (var i = 0; i < headers.length; i++) {
            headers[i].setData = setData;
        }
        reportsTbl.headers = headers
    } 
     
    var dataInit = tasks.multiTaskHandler(function(){
        function getWeekRanges(nextTask){
            getOptions('orders', 'order_week', 1, function(){
                nextTask();
            });
    
        }

        function getReportNames(nextTask){
            getOptions('reports', 'report_name', 0, function(){
                nextTask();
            });
        }

        function getReport(nextTask){
            reportsTbl.comboFilters[0].value = stateParams.reportName || reportsTbl.comboFilters[0].options[0]
            reportsTbl.comboFilters[1].value = stateParams.orderWeek || reportsTbl.comboFilters[1].options[0]
            
            getData(reportsTbl.comboFilters[1].value, reportsTbl.comboFilters[0].value)

        }

        return{
            getWeekRanges:getWeekRanges,
            getReportNames:getReportNames,
            getReport:getReport
        }
    }).setTasksAsync(['getWeekRanges', 'getReportNames'], ['getReport'])

    function getOptions(collName, pName, i, callBack){
        var request = _client.generateRequestObj('reportsTbl getOptions  @reportsCentralMod');        
        request.collName = collName;
        request.pName = pName;

        db.app.distinct(request, function(data){
            reportsTbl.comboFilters[i].options = data
            callBack();
        })

    }

    function getData(order_week, report_name, refresh){
        reportsTbl.ready = false;
        var request = _client.generateRequestObj('reportsTbl getData  @reportsCentralMod');
        
        request.mongoQuery.find = {$and:[{order_week:order_week}, {report_name:report_name}]}
        
        db.collection('reports').find(request, function(data){ 
            reportsTbl.ready = true;        
            console.log(data)
            if (data.length === 0){ 
                reportsTbl.setData({default:'Choose report type and week range then run report'})   
                msgbox.showMsg('No Reports Found!!!')                            
            }else if(refresh){
                //---------------------------temp solution for getting fresh copy of report------------------------
                var request = _client.generateRequestObj('reportsTbl getData2  @reportsCentralMod');
                request.po_numbers = data[0].linked_po_numbers;
                request.order_week = order_week;
                reportsTbl.ready = false;   
                db.app.linkPOs(request, function(data){
                    initHeaders(data.reportHeaders);
                    for (var i = 0; i < data.reportTbl.length; i++) {
                        data.reportTbl[i]._notes = (Array.isArray(data.reportTbl[i].notes))? data.reportTbl[i].notes.join("\r\n\r\n") : '';
                        data.reportTbl[i]._id = data.reportTbl[i].sku;
                    }
                    reportsTbl.setData(data.reportTbl); 
                    reportsTbl.ready = true;                                          
                })
            }else{
                initHeaders(data[0].reportHeaders);
                for (var i = 0; i < data[0].reportTbl.length; i++) {
                    data[0].reportTbl[i]._notes = (Array.isArray(data[0].reportTbl[i].notes))? data[0].reportTbl[i].notes.join("\r\n\r\n") : '';
                }
                reportsTbl.setData(data[0].reportTbl);  
            }
        })
     }

     function downloadReport(request, callBack){
        request.mongoQuery.insert = {download:reportsTbl.filteredData};

        db.collection('aux').insert(request, function(data){
            window.open('db/export/toexcel/'+ data._id +'/' + 'Reports Download ' + moment().format("MMM Do YY"));
            callBack();
        })
    }
    
    function noteFrmInit(){
        var order_week = reportsTbl.comboFilters[1].value, report_name = reportsTbl.comboFilters[0].value;

        reportsTbl.validateSelection(function(selection){
            var note = (selection.length === 1)?selection[0]._notes:''
            new reportsTbl.editor(function(data){

                for (var i = 0; i < selection.length; i++) {
                    selection[i].notes = /*selection[i].notes ||*/ [];
                    selection[i].notes.push(data[0].note);                    
                }
                                
                var request = _client.generateRequestObj('reportsTbl noteFrmInit  @reportsCentralMod');
        
                request.mongoQuery.find = {$and:[{order_week:order_week}, {report_name:report_name}]}
                request.data = selection;                

                db.app.addNote(request, function(data){                            
                    console.log(data)  
                    
                    getData(order_week, report_name);                   
                })
            }).init([
                {                                                                                        
                    note:{value:note, caption:'Note', useInput:true, type:'textarea', style:'max-height: 150px;max-width: 223px; vertical-align: text-top;', placeholder:'Enter Note Here'}
                },
            ]).caption("Add Note to Selected Lines")

            reportsTbl.showMenuBack = false;
            reportsTbl.toggleMenuOptions();            
        })            
    }
    dataInit.runTasks(function(err, results){
        if(err){
            console.log(err)
        }else{
            console.log(results)
        }
    })

    function uploadFile (input){        
        console.log(input.files[0]);                
        var request = _client.generateRequestObj('reportsTbl.uploadFile @reportsCentral');
        request.file = input.files[0];        

        if(input.name === 'new_notes'){            
            reportsTbl.ready = false;
            db.collection('aux').xlInsert(request, function(notes, err){ 
                reportsTbl.ready = true;        
                if (notes){           
                    var order_week = reportsTbl.comboFilters[1].value, report_name = reportsTbl.comboFilters[0].value, updates = [];
                    console.log(notes);

                    notes.data.forEach(function(note){
                        var reportLine = findByKey(reportsTbl.data, 'sku', note.sku)[0]
                        if(reportLine){
                            reportLine.notes = [note.notes];
                            updates.push(reportLine)
                        }
                    });

                    var request = _client.generateRequestObj('reportsTbl uploadNotes  @reportsCentralMod');
            
                    request.mongoQuery.find = {$and:[{order_week:order_week}, {report_name:report_name}]}
                    request.data = updates;                

                    db.app.addNote(request, function(data){                            
                        console.log(data)  
                        
                        getData(order_week, report_name);                   
                    })

                }
            })
        }
    
        $(input).val('');
    }

    function downloadNotes(){
        reportsTbl.validateSelection(function(selection){
            var notesDownload = [];
            
            selection.forEach(function(data, index){
                if(index === 0){
                    data.validated = true;  
                }else{
                    data.validated = '';  
                }

                notesDownload.push(cloneKeys(data, ['sku', 'notes', 'validated']));
            })
            var request = _client.generateRequestObj('downloadNotes reportTbl')
            request.mongoQuery.insert = {download:notesDownload};
            db.collection('aux').insert(request, function(data){
                window.open('db/export/toexcel/'+ data._id +'/' + 'notes ');    

            })
        })
    }
    return reportsTbl
}])

