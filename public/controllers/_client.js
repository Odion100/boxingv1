function randomStr() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

var _uName = randomStr();
angular.module('_client', ['ngFileUpload'])

.service('_client',['$http', 'Upload', '$$msgbox', function($http, $upload, msgbox){
    var client = this
    //borrowed code to create unique id from Date
    function uniqueNumber() {
        var date = Date.now();
        
        // If created at same millisecond as previous
        if (date <= uniqueNumber.previous) {
            date = ++uniqueNumber.previous;
        } else {
            uniqueNumber.previous = date;
        }
        
        return date;
    }
    client.uniqueNumber = uniqueNumber;

    uniqueNumber.previous = 0;

    //request can only be made through the request obj and request handler
    client.generateRequestObj = function(initial_fn, callBack){

        var request = {
            _id:uniqueNumber() + '_' + _uName,
            initial_fn:initial_fn,
            clientId:_uName,
            mongoQuery:{}
        };
        //sync and async optional
        if (typeof callBack === 'function') {
            callBack(request)
        }else{
            return request
        }
    }

    client.sendImage = function(image, cb){
        var request = client.generateRequestObj('image')

        request.imageBase64 = image;
        request.path = '/imageBase64';
        request.method = 'PUT'
        client.requestHandler(request, cb)
    }

    client.fileUploadHandler = function(request, callBack){
        console.log(request)
        $upload.upload({
            url:request.path,
            data:request
        }).then(function successCallback(res){
            if (typeof callBack === 'function') {callBack(null, res.data)}
                console.log(res)
        }, function errorCallback(res){
            if(res.data){
                errMsg = res.data.errMsg || res.data.errmsg
                if(errMsg){
                    console.log('dub requests')
                    msgbox.showMsg('<strong>'+errMsg+'</strong>', null, null, {style:'warning'})
                }
                if (typeof callBack === 'function') {callBack(res.data)} 
            }else if(res.status === -1){
                msgbox.button1.clickAction = function(){                    
                    if (typeof callBack === 'function') {callBack(res.data)}                    
                } 
                msgbox.showMsg('<strong>Server Not Found! Make sure server is running!</strong>', null, null, {style:'warning'})
            }             
            console.log(res);
        })
    }
    //request can only be made through the request obj and request handler
    client.requestHandler = function (request, callBack){
        console.log(request)
        $http({
            method:request.method,
            url:request.path,
            data:request
        }).then(function successCallback(res){
            if (typeof callBack === 'function') {callBack(null, res.data)}
                console.log(res)
        }, function errorCallback(res){
            if(res.data){
                errMsg = res.data.errMsg || res.data.errmsg
                if(errMsg){
                    console.log('dub requests')
                    msgbox.showMsg('<strong>'+errMsg+'</strong>', null, null, {style:'warning'})
                }                       
                if (typeof callBack === 'function') {callBack(res.data)}
            }else if(res.status === -1){
                msgbox.button1.clickAction = function(){
                    if (typeof callBack === 'function') {callBack(res.data)}                    
                } 
                msgbox.showMsg('<strong>Server Not Found! Make sure server is running!</strong>', null, null, {style:'warning'})
            }     
            
            
            console.log(res);
        })
    }
}])


//this service will handle all requset to the database
.service('$$db',['_client', '$$msgbox', function(_client, msgbox){

    this.collection = function(collName){
        this.name = collName;

        this.find = function(request, callBack){
            request.method = 'POST';
            request.path ='/db/getData';
            request.collName = this.name

            _client.requestHandler(request, function(err, orders){
                if (typeof callBack === 'function') {
                    callBack(orders)
                }else{
                    return orders
                }
            })
        }


        this.insert = function(request, callBack){
            request.method = 'PUT';
            request.path ='/db/insertData';
            request.collName = this.name
            _client.requestHandler(request, function(err, orders){
                if (typeof callBack === 'function') {
                    callBack(orders)
                }else{
                    return orders
                }
            })
        }

        /*this.delete = function(request, callBack){
            request.method = 'PUT';
            request.path = '/db/deleteData';
            request.collName = this.name
            _client.requestHandler(request, function(err, data){
                if (typeof callBack === 'function') {
                    callBack(data)
                }else{
                    return data
                }
            })
        }*/

        this.update = function(request, callBack){
            request.method = 'PUT';
            request.path = '/db/updateData';
            request.collName = this.name
            _client.requestHandler(request, function(err, data){
                if (typeof callBack === 'function') {
                    callBack(data)
                }else{
                    return data
                }
            })
        }

        this.replace = function(request, callBack){
            request.method = 'PUT';
            request.path = '/db/app/replace';
            request.collName = this.name
            _client.requestHandler(request, function(err, data){
                if (typeof callBack === 'function') {
                    callBack(data)
                }else{
                    return data
                }
            })
        }

        this.xlInsert = function(request, callBack){
            request.path ='/db/excelFileHandler/insert';
            request.collName = this.name
            _client.fileUploadHandler(request, function(err, orders){
                if (typeof callBack === 'function') {
                    callBack(orders)
                }else{
                    return orders
                }
            })
        }

        this.xlUpdate = function(request, callBack){
            request.path ='/db/excelFileHandler/update';
            request.collName = this.name;
            _client.fileUploadHandler(request, function(err, orders){
                if (typeof callBack === 'function') {
                    callBack(orders)
                }else{
                    return orders
                }
            })
        }
        this.xlDownload = function(request, callBack){
            request.method = 'PUT';
            request.path = '/db/app/setXlDownload';
            request.collName = this.name;

            _client.requestHandler(request, function(err, data){
                if(err){
                    callBack(null);
                }else if(data){
                    window.open('db/app/xlDownload/'+ data._id)
                    callBack(data);
                }else{
                    msgbox.showMsg('Download Failed!!!')
                }
            })
        }

        this.sysNotificationsChecks = function(){
            request.path = '/sysnotifications/asinDataCheck'

        }

        return this
    }

    this.app = {};

    this.app.getOrders = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/app/getOrders';

        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(null);
            }else{
                callBack(data);
            }
        })
    }
    
    this.app.ordersDownload = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/app/ordersDownload';

        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(null);
            }else{
                window.open('db/export/toexcel/'+ data._id +'/' + 'Orders Download ' + moment().format("MMM Do YY"))
                callBack(data);
            }
        })
    }

    this.app.xlDownload = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/app/setXlDownload';

        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(null);
            }else{
                window.open('/db/app/xlDownload/' + request.setTasks.join(",") + '/' + data._id); 
                callBack(data);
            }
        })
    }

    this.app.linkPOs = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/app/linkPOs';

        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(null);
            }else{                
                callBack(data);
            }
        })
    }
    this.app.distinct = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/app/distinct';

        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(null);
            }else{                
                callBack(data);
            }
        })
    }
    this.app.addNote = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/app/addNote';

        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(null);
            }else{                
                callBack(data);
            }
        })
    }

    this.app.getPO = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/app/getPO';

        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(null);
            }else{                
                callBack(data);
            }
        })
    }        
    this.app.manualReceipts = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/app/manualReceipts';

        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(null);
            }else{                
                callBack(data);
            }
        })
    }

    this.app.cancelOrders = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/app/cancelOrders';

        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(null);
            }else{                
                callBack(data);
            }
        })
    }

    this.boxing ={}

    function cb(){
        
    }
    
    this.boxing.insertBoxes = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/boxing/insertBoxes';
        request.collName = 'boxing'
        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(err);
            }else{
                callBack(null, data);
            }
        })
    }

    this.boxing.addToBox = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/boxing/addToBox';
        request.collName = 'boxes'
        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(err);
            }else{
                callBack(null, data);
            }
        })
    }

    this.boxing.updateOrder = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/boxing/updateOrder';
        request.collName = 'orders'
        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(err);
            }else{
                callBack(null, data);
            }
        })
    }
    this.boxing.undoOrders = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/boxing/undoOrders';
        request.collName = 'orders'
        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(err);
            }else{
                callBack(null, data);
            }
        })
    }
    this.boxing.undoBoxing = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/boxing/undoBoxing';
        request.collName = 'boxes'
        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(err);
            }else{
                callBack(null, data);
            }
        })   
    }
    this.boxing.recordLabels = function(request, callBack){
        request.method = 'PUT';
        request.path = '/db/boxing/recordLabels';
        
        _client.requestHandler(request, function(err, data){
            if(err){
                callBack(err);
            }else{
                callBack(null, data);
            }
        })   
    }
    this.labelPrinter ={};

    this.labelPrinter.printLabels = function(request, callBack){
        msgbox.showPrinting = true;
        request.method = 'PUT';
        request.path = 'http://localhost:1100/labelPrinter/printLabels';
        //request.path = 'http://dev7:1100/labelPrinter/printLabels';

        try{
            _client.requestHandler(request, function(err, data){
                msgbox.showPrinting = false;
                if(err){
                    callBack();
                }else{
                    callBack(data);
                }
            })
        }catch(e){
            console.log(e)
        }
           
    }

}])

