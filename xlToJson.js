const fs = require('fs');
const xlsx2json = require('xlsx-to-json');
const tempLocation = process.cwd() + '\\temp\\';
const moment = require('moment');
const objID = require("mongojs").ObjectId;

//-------------------------------------------------------------------
function stringToBoolean(str){
	if(typeof str === 'string'){
	    switch(str.toLowerCase().trim()){
	        case "true": case "yes": case "1": return true;
	        case "false": case "no": case "0": case null: return false;
	        default: return Boolean(str);
	    }
    }
}

function check_last(json, callBack){
	//sometimes the last few empty rows in excel sheet is included in the conversion
	//every value will be an empty string
	var last = json.length -1;
	var pNames =  Object.getOwnPropertyNames(json[0]);

	do_check();

	function do_check(){
		for (var i = 0; i < pNames.length; i++) {		
			if(json[last][pNames[i]] != ''){				
				//exit if any value doesn't equal empty string
				callBack();
				return false 
			}
				
		}			
		json.splice(last, 1)	
		next()	
	}

	function next(){
		last = json.length -1
		do_check()
	}
}

function parseJson(json, validations, callBack){
	var isValid, value, propertyName	
		
	validations.before(json);
	console.log('jsons 0-------------------')
	console.log(json[0])
	for (var i = 0; i < json.length; i++) {

		for (var n = 0; n < validations.dates.length; n++) {				
			json[i][validations.dates[n]] = moment(json[i][validations.dates[n]], 'MM-DD-YYYY')._d;
		}

		for (var n = 0; n < validations.numbers.length; n++) {						
			json[i][validations.numbers[n]] = Number(json[i][validations.numbers[n]]);		
		}
		
		for (var n = 0; n < validations.booleans.length; n++) {				
			json[i][validations.booleans[n]] = stringToBoolean(json[i][validations.booleans[n]]);			
		}

		for (var n = 0; n < validations.json.length; n++) {			
			json[i][validations.json[n]] = JSON.parse(json[i][validations.json[n]]);
		}

		for (var n = 0; n < validations.object_id.length; n++) {			
			json[i][validations.object_id[n]] = objID(json[i][validations.object_id[n]]);
		}

		delete json[i].delete;
		delete json[i].validated;

		isValid = true;		
		//deleting objects that don't pass validations here in the case that the validation depends on the data already being parsed / reformatted
		for (var n = 0; n < validations.tests.length; n++) {
			propertyName = validations.tests[n].propertyName;
							
			value = json[i][propertyName];
			isValid = validations.tests[n].isValid(value, json[i]);
		
			//if you remove the item at the current index that index will become that of the next item						
			if(!isValid){
				json.splice(i, 1);
				i--
			}								
		}

	}

	if(validations.after){
		validations.after(json, function(results){
			callBack(results);
		});
	}else{
		callBack(json);
	}
	
	
}


//dateFields, numberFields, booleanFields
exports.convert = function(file, validations, callBack){

	xlsx2json({input:tempLocation + file.originalname, output:null} , function(err, json){

        if(err){
        	console.log(err)
            callBack(err, null)
        }else{
        	console.log("json[0].validated ==='TRUE' " + json[0].validated ==='TRUE')
        	console.log('json[0]----------------------------------------')
        	
			if (json[0].validated ==='TRUE') {
				check_last(json, function(){
					parseJson(json, validations, function(json){
		        		callBack(null, json);
		        	})	
				})
				
			}else{
				var err = {errMsg:'Import Template Not Validated!!!'}				
				callBack(err);
			}        		

            //delete the file    
            fs.unlink(tempLocation + file.originalname, function(err) {
                if (err) throw err;
            })                
        }
    })

}

exports.convertSync = function(){

}
// if (typeof callBack === 'function') {
//     callBack(err)
// }else{
//     return err
// }   