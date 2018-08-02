/*const fs = require('fs');
const outputFilename = '/OPS 2.0/tmp/';*/
const objID = require("mongojs").ObjectId;
const db = require('./_dbHandler');
const fs = require('fs');
//express and middleware
const express = require('express');
const app = express();

const bodyParser = require('body-parser')
const json2xls = require('json2xls');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json({limit: '5mb'}));
app.use(json2xls.middleware);

const multer = require('multer');

const tempLocation = './temp'

var storage = multer.diskStorage({
    destination:function (req, file, cb) {
        cb(null, tempLocation)
    },

    filename: function (req, file, cb) {
        
        cb(null, file.originalname)
    }
});

//ensure the output directory exists
if (!(fs.existsSync(tempLocation))){
    fs.mkdirSync(tempLocation)
}


var fileHandler = multer({storage:storage}).single('file')


app.post('/db/getData', function(req, res){

    db.processRequest(req, function(err){        
        if(err){
            res.status(500).json(err);
            return false
        }

        var collName = req.body.collName;
        var mq = req.body.mongoQuery;
        mq.fields = mq.fields || null

        db.collection(collName).find(mq.find, mq.fields, function(err, doc){
            if(err){
                res.status(500).json(err);
                console.log(err);
            }else{
                res.json(doc);
                console.log('getData-------------------------'); 
                if(collName === 'orders'){
                    console.log(mq.find);
                    console.log(doc.length);
                }
                           
            }
        })
    })        
    
});


app.put('/db/insertData', function(req, res){

    db.processRequest(req, function(err){        
        if(err){
            res.status(500).json(err);
            return false
        }

        var collName = req.body.collName;
        db.collection(collName).insert(req.body.mongoQuery.insert, function(err, doc){
            if(err){
                console.log(err)
                res.status(500).json(err);
            }else{
                res.json(doc);
            }
        })        
    })

});

app.put('/db/deleteData', function(req, res){
    console.log('db/deleteData ' + JSON.stringify(req.body));
    db.processRequest(req, function(err){        
        if(err){
            console.log(err);
            res.status(500).json(err);
            return false
        }

        var collName = req.body.collName;
        db.collection(collName).remove(req.body.mongoQuery.delete, function(err, doc){
            if(err){
                res.status(500).json(err);
            }else{
                res.json(doc);
            }
        })
    })
});


app.get('/db/export/toexcel/:_id/:name', function(req, res){
    console.log(req.params._id)
    db.getDownload(req.params._id, function(doc, err){
        
        if(err){
            res.status(500).json(err);
        }else{            

            switch (req.params.name){
                case '':
                    var err ={};
                    err.errMsg = 'missing filename!!!'
                    res.status(500).json(err);             
                    break 

                case 'Order Line Editor':
                    
                    db.setOrderLineEditor(doc.download, function(err){

                        if(err){
                            res.status(500).json(err);
                        }else{
                            res.download('C:/OPS2.0/public/excel templates/Order Lines Editor Template.xlsm')
                        }                             
                    })
                    break 
                /*case 'ASIN Editor'
                    db.setAsinEditor(doc.download, function(err){
                        if(err){
                            res.status(500).json(err);
                        }else{
                            res.download()
                        }
                    })
                    break*/
                case 'PF SKU Editor':
                    db.setSkuEditor(doc.download, function(err){
                        if(err){
                            res.status(500).json(err);
                        }else{
                            res.download('C:/OPS2.0/public/excel templates/PF SKU Line Editor.xlsm')
                        }
                    })
                    break
                default:
                    res.xls(req.params.name + '.xlsx', doc.download);                   
            }
            
            console.log('download');
        }
    })
});


//if you are wondering why my codes are written like this:
//its to avoid repeating code for fileHandler based on the method chosen
app.post('/db/excelFileHandler/:method', function(req, res){    
    //this is used to validate for the specific file name for a specific method and
    // to choose the correct method to execute 
    var requestHelper = {
        insert:{
            orders:{expectedFileName:'Orders Upload Template.xlsm'},
            asinData:{expectedFileName:'ASIN Data Upload Template.xlsm'},
            receipts:{expectedFileName:'Manual Receipts Template.xlsm'},            

            fn:function(req){                
                db.processRequest(req, function(err){                                     
                    if(err){
                        res.status(500).json(err);
                        return false
                    }       
                        
                    db.collection(req.body.collName).xlFileHandler.setTasks([
                        'convertToJson',
                        'insert'
                    ]).runTasks(function(err, results){
                        if(err){
                            res.status(500).json(err);
                            return false
                        }else{
                            res.json(results.insert);
                        }
                    }, req.file)
                })
            }                            
        },

        update:{
            orders:{expectedFileName:'Order Lines Editor Template.xlsm'},
            pf_skus:{expectedFileName:'PF SKU Line Editor.xlsm'},
            fn:function(req){
                db.processRequest(req, function(err){                    
                    if(err){
                        res.status(500).json(err);
                        return false
                    }                    
                    db.collection(req.body.collName).xlFileHandler.setTasks([
                        'convertToJson',
                        'update'
                    ]).runTasks(function(err, results){
                        if(err){
                            res.status(500).json(err);
                            return false
                        }else{
                            res.json(results.update);
                        }
                    }, req.file)
                })
            }     
        }        
    };

    fileHandler(req, res, function(err){
        req.body.mongoQuery = (req.body.mongoQuery) ? req.body.mongoQuery:{};
          
        var method = req.params.method;
        var collName = req.body.collName;
        var error = {};
        
        if(err){
            console.log('fileHandler error');
            console.log(err);
            res.status(500).json(err);
            return false
        }

        if(!(req.file)){
            error = {errMsg:'No file was uploaded'};           
            res.status(500).json(error);
            return false;
        }
        
        if(req.file.originalname != requestHelper[method][collName].expectedFileName){
            error = {errMsg: req.file.originalname + ' does not match the expected filename'}
            res.status(500).json(error);
            return false
        }

        requestHelper[method].fn(req)
                
    })

});

app.get('/sysNotifications/:notifications', function(req, res){

    db.sysCheckService.runTasks(function(err, results){
        if(err){
            console.log(err)
            res.status(500).json(err)
        }else{
            console.log(results)
            res.json(results.getUpdate)
        }

    })
})

app.get('/boxing-app', function(req, res){
    res.sendFile(__dirname + '/public/boxing/index.html');
});


app.listen(4001);
console.log("VC_OPS listening on port 4001");


