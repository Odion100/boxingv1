const fs = require('fs');
const proc = require('child_process');
const vbsFile = 'ops.vbs';
const csv2json = require('csvtojson');

var cwd = process.cwd();

const output_path = cwd + '\\PF_OUT\\';
var cmd = 'cmd.exe';

//ensure 32 bit cmd is used
if (process.arch === 'x64'){
	const windir = process.env.windir || process.env.WINDIR;
	cmd = windir + '\\SysWOW64\\' + cmd;  
}

//ensure vbsFile exists in the current directory
if (!(fs.existsSync(cwd + '\\' + vbsFile))){
	throw 'Point Force querys cannot be executed: vbsFile file is missing!!!';
}

//ensure the output directory exists
if (!(fs.existsSync(output_path))){
	fs.mkdirSync(output_path)
}

function execQuery(query, output_name, callBack){
	
	var args = ' "' + query + '" "' + output_name + '" "' + output_path + '"';

	proc.exec('cscript ' + vbsFile + ' //NoLogo ' + args, {cwd:cwd, shell:cmd}, function(err, stdout, stderr) {
		
		//console.log('stdout: ' + stdout.trim());    
    	//console.log('stderr: ' + stderr.trim());
    	//console.log('--------------------------------');
	    if (err) {
	        console.log('exec err: ');
	    	callBack(null, err);
	    	return false;
	    }

	    if(stdout.trim() === "error" ){	
	    	console.log('error');    	
	    	console.log('--------------------------------');
	    	getOutput('error', function(errOutput, err){
	    		if(err){
	    			callBack(null, err)	;
	    		}else{
	    			callBack(null, errOutput);	
	    		}	    			    			
	    	});
	    }

	    if(stdout.trim() === 'No records found'){
	    	callBack(null, null);
	    }

	    if(stdout.trim() === output_name){
	    	//console.log('success');  
	    	//console.log('--------------------------------');
	    	getOutput(output_name, function(dataOutput, err){
	    		if(err){
	    			callBack(null, err);
	    		}else{
	    			callBack(dataOutput);
	    		}	    			    		
	    	});	    		  
	    }

	});
}
var headers ={
	error:['errMsg', 'extra_info'],	
	order_line_editor:['status', 'extra_info'],
	sku_line_editor:['status', 'extra_info'],
	receipts:['line','receipt_number', 'po_number', 'pf_sku', 'rec_qty', 'vendor_code' ],
	new_skus:['sku','description', 'created_date'],
	set_breakdown:['main_sku','sub_sku', 'multiple'],
	po_query:['po_number', 'pf_sku', 'order_qty', 'rec_qty', 'price'],
	old_po_query:['order_line', 'po_number', 'order_date', 'pf_sku', 'order_qty', 'receipt_number', 'rec_line', 'rec_date', 'rec_qty', 'rec_case_qty', 'supplier'],
	vendor_skus:['pf_sku', 'vendor_sku', 'vendor_code']
}

function typeConverter(json, output_name){
	var numbers = {
		set_breakdown:['multiple'],		
		receipts:['line', 'rec_qty'],
		po_query:['order_qty', 'rec_qty',]
	}
	if(numbers[output_name]){
		for (var i = 0; i < numbers[output_name].length; i++) {
			json[numbers[output_name][i]] = Number(json[numbers[output_name][i]]);			
		}
	}
	return json
}

function getOutput(output_name, callBack){
	var jsonArr = [];
	console.log(output_path + output_name);    
	console.log('--------------------------------');

	csv2json({
		delimiter:'|_|', 
		noheader:true,
		headers: headers[output_name]
	}).fromFile(output_path + output_name + '.csv')

	.on('json', function(json){

		json = typeConverter(json, output_name);
		jsonArr.push(json);
	})

	.on('error', function(err){
		console.log('on error');
		callBack(null, err);
	})

	.on('end', function(){
		callBack(jsonArr)
	})
}

 
var pointForceQueries = {
	getPOs:function(po_arr, callBack){	
		var POs = "('" + po_arr.join("', '") + "')";

		var query = 'SELECT POOO_2.PURORD, POOO_2.PRODCT, POOO_2.ORDQTY, POOO_2.RECQTY, POOO_2.PURPRI FROM POOO_2 WHERE POOO_2.PURORD IN ' + POs;

		var output_name = 'po_query';	

		execQuery(query, output_name, function(data, err){
			if(err){
				callBack(null, err);
			}else{
				callBack(data);	
			}
		});

	},
	getReceipts:function(precessedRec, callBack){
		//filter out receipts that have already been processed for the day
		var old_rec = "('" + precessedRec.join("', '") + "')";

		var query = 'SELECT POPRD.LINE, POPRD.RECPT, POPRD.PURORD, POPRD.PRODCT, POPRD.RECQTY, POPRD.SUPPLR FROM POPRD WHERE POPRD.RECPT Not In ' + old_rec ;
		console.log(query)
		var output_name = 'receipts';

		execQuery(query, output_name, function(data, err){
			if(err){
				callBack(null, err);
			}else{
				if(data[0].receipt_number){					
					callBack(data);	
				}else{
					console.log('null-------');	
					callBack(null);	
				}	
				
			}
		})
	},
	getNewSkus:function(lastDate, callBack){

		var query = "SELECT ICI1.PRODCT, ICI1.PRODCTDES, ICI1.CREDAT FROM ICI1 WHERE (ICI1.CREDAT>={d'" + lastDate + "'})"; //"'2017-01-01'"

		var output_name = 'new_skus';
		console.log(query)
		execQuery(query, output_name, function(data, err){
			if(err){
				callBack(null, err);
			}else{
				if(data[0].description === 'null'){
					console.log('null-------');	
					callBack(null);	
				}else{
					callBack(data);	
				}	
				
			}
		})
	},
	getSetExplosion:function(sku_arr, callBack){
		var whereStatment = (sku_arr.length < 2000)? " WOFPD WHERE WOFPD.PRODCT In " + "('" + sku_arr.join("', '") + "')":'';
		
		var query = "SELECT WOFPD.PRODCT, WOFPD.MATPRODCT, WOFPD.REQQTY FROM WOFPD " + whereStatment
		console.log(query);
		
		var output_name = 'set_breakdown';

		execQuery(query, output_name, function(data, err){
			if(err){
				callBack(null, err);
			}else{
				if(data[0].sub_sku === 'null'){
					console.log('null-------');	
					callBack(null);	
				}else{
					callBack(data);	
				}	
				
			}
		})
	},
	getOldPOs:function(po_arr, callBack){	
		var POs = "('" + po_arr.join("', '") + "')";

		var query = 'SELECT POPH.PURORDLIN, POPH.PURORD, POPH.PODAT, POPH.PRODCT, POPH.ORDQTY, POPH.RECPT, POPH.RECLIN, POPH.RECDAT, POPH.RECQTYSKU, POPH.RECQTYSKU, POPH.SUPPLR FROM POPH' + ' WHERE POPH.PURORD IN ' + POs;
		console.log(query)
		var output_name = 'old_po_query';	

		execQuery(query, output_name, function(data, err){
			if(err){
				callBack(null, err);
			}else{
				callBack(data);	
			}
		});

	},
	getSupplerSkus:function(sku_arr, callBack){	
		console.log(sku_arr.length)
		console.log('-------------------------------sku_arr.length')

		var whereStatment = ""//(sku_arr.length < 2000)?'POPI WHERE POPI.PRODCT In ' + "('" + sku_arr.join("', '") + "')":'';

		var query = 'SELECT POPI.PRODCT, POPI.SUPPRO, POPI.SUPPLR FROM POPI ' + whereStatment;
		console.log(query);
		var output_name = 'vendor_skus';	

		execQuery(query, output_name, function(data, err){
			if(err){
				callBack(null, err);
			}else{
				callBack(data);	
			}
		});

	},
	getSuppler:function(sku, callBack){				

		var query = "SELECT POPI.PRODCT, POPI.SUPPRO, POPI.SUPPLR FROM POPI POPI WHERE POPI.PRODCT = '" + sku + "'";

		//console.log(query)
		var output_name = 'vendor_skus';	

		execQuery(query, output_name, function(data, err){
			if(err){
				callBack(null, err);
			}else{
				callBack(data);	
			}
		});

	},
	queryTest:function(sku_arr, callBack){
		
		var query = "SELECT POOO_2.PURORD, POOO_2.PRODCT, POOO_2.ORDQTY, POOO_2.RECQTY FROM POOO_2"

		var output_name = 'po_query';

		execQuery(query, output_name, function(data, err){
			if(err){
				callBack(null, err);
			}else{
				callBack(data);	
			}
		})
	}

}

/*SELECT ICI1.PRODCT, ICI1.SUPPLR FROM ICI1 ICI1 WHERE (ICI1.PRODCT='THRNP0037') OR (ICI1.PRODCT In ('KEH00015610'))*/
exports.aux_fns = {
	setData:function(output_name, callBack){
		//'order_line_editor'
		execQuery(null, output_name, function(data, err){
			if(err){
				callBack(null, err);
			}else{
				callBack(data);	
			}
		});		
	}
}
/*pointForceQueries.getSupplerSkus(['UNI433905'], function(data, err){
	if(err){
		console.log(err)
		return
	}
	console.log(data[0])
	console.log(data[1])
	console.log(data[2])
	console.log(data[3])
	console.log(data[4])
	console.log(data.length)
})*/
exports.pointForceQueries =pointForceQueries;