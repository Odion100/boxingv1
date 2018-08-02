
exports.eachesCalc = function(unit_breakdown){    
    var eachesCalc = this;
    eachesCalc.unit_breakdown = (unit_breakdown) ? unit_breakdown : [{sku:'MISSING ASIN DATA!!!', multiple:0}];

    eachesCalc.currentEaches = {};
    eachesCalc.currentUnits = 0;

    function toEaches(units){
        var eaches = {};        

        for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {                
            eaches[eachesCalc.unit_breakdown[i].sku] = units * eachesCalc.unit_breakdown[i].multiple;            
        }         

        return eaches;    
    }

    function toUnits(eaches){
        //for each sku in the unit_breakdown multiple the eaches on hand by the multiple in the unit_breakdown for that sku
        //the lowest number returned after calculating each sku in to it's multiple will be the total_complete_units
        var total_complete_units = 0, calculated_units = 0;
        
         for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {

            calculated_units = parseInt(eachesCalc.currentEaches[eachesCalc.unit_breakdown[i].sku] / eachesCalc.unit_breakdown[i].multiple);

            //assign the lowest value to total_calculated_units
            total_complete_units = (calculated_units < total_complete_units || total_complete_units === 0) ? calculated_units : total_complete_units;
        }

        eachesCalc.currentUnits = total_complete_units;
        return total_complete_units;
    }
    eachesCalc.itemCount = function(){
        var count = 0;
        for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {
            count += eachesCalc.unit_breakdown[i].multiple
        }
        return count
    }

    eachesCalc.item = function(sku){        
        for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {
            if(eachesCalc.unit_breakdown[i].sku === sku){
                return eachesCalc.unit_breakdown[i]
            }
        }        
    }
    
    eachesCalc.sumOfEaches = function(eachesToSum){
        eachesToSum = eachesToSum || currentEaches;
        var sum = 0;            
        if(!(eachesCalc.unit_breakdown) || !(eachesToSum)){ 
            return -1
        }

        for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {
            sum = sum + eachesToSum[eachesCalc.unit_breakdown[i].sku]
        }  
              
        return sum;
    }

    eachesCalc.isMatchingSku = function(sku){
        for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {
            if(eachesCalc.unit_breakdown[i].sku === sku){
                return true
            }    
        } 
        return false
    }

    eachesCalc.toSKU = function(){
        var sku = '';
        //add sku column            
        sku = (eachesCalc.unit_breakdown.length > 1)? 'set of:': '';                            
        for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {
            sku = sku + eachesCalc.unit_breakdown[i].sku + '-X' + eachesCalc.unit_breakdown[i].multiple + ', ';
        } 

        return sku                      
    }

    eachesCalc.toSKU_HTML = function(){
        if(!(unit_breakdown)){
            return '<span style="color:red;font-weight:bold">MISSING ASIN DATA!!!</span><br>'
        }
        
        var sku = '<span style="color:green;white-space: nowrap;">set of: </span><br>';
        //add sku column            
        sku = (eachesCalc.unit_breakdown.length > 1)? '<span style="color:green;white-space: nowrap;">set of: </span><br>': '';                            
        for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {
            sku = sku + '<span style="font-weight:bold;white-space: nowrap;">' + eachesCalc.unit_breakdown[i].sku + '<span style="color:#008eff">-X' + eachesCalc.unit_breakdown[i].multiple +'</span>, </span><br>'      
        } 

        return '<span style="font-weight:bold;white-space: nowrap;">' + sku + '</span><br>'     
    }

    eachesCalc.eaches = function(eaches){
        var _eaches = {};
        if(eaches != undefined){
            eachesCalc.currentEaches = eaches
            eachesCalc.currentUnits = toUnits(eaches)
        }

        _eaches.toUnits = toUnits

        //subtract from each key of the currently defined currentEaches
        _eaches.subtract = function(eachesToSub){
            var resultingEaches = {};

            for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {
                var num = (eachesToSub[eachesCalc.unit_breakdown[i].sku]) ? eachesToSub[eachesCalc.unit_breakdown[i].sku]:0
                
                resultingEaches[eachesCalc.unit_breakdown[i].sku] = eachesCalc.currentEaches[eachesCalc.unit_breakdown[i].sku] - num;                
            }  

            eachesCalc.currentEaches = resultingEaches;
            _eaches.toUnits();                        
            return resultingEaches; 
        }

        _eaches.add = function(eachesToAdd){
            var resultingEaches = {};

            for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {
                var num = (eachesToAdd[eachesCalc.unit_breakdown[i].sku]) ? eachesToAdd[eachesCalc.unit_breakdown[i].sku]:0
                
                resultingEaches[eachesCalc.unit_breakdown[i].sku] = eachesCalc.currentEaches[eachesCalc.unit_breakdown[i].sku] + num;                
            }  
            
            eachesCalc.currentEaches = resultingEaches;
            _eaches.toUnits();                        
            return resultingEaches; 
        }
        
        _eaches.leftOvers = function(){
            var resultingEaches = {};

            for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {
                resultingEaches[eachesCalc.unit_breakdown[i].sku] = eachesCalc.currentEaches[eachesCalc.unit_breakdown[i].sku] - eachesCalc.unit_breakdown[i].multiple * eachesCalc.currentUnits;
            }

            return resultingEaches;
        }
        _eaches.realUnits = function (){
            var completeUnits = _eaches.toUnits();
            var partialUntis = eachesCalc.sumOfEaches(_eaches.leftOvers())            
                      
            return  (partialUntis > 0)? completeUnits + .5:completeUnits
        }

        _eaches.toString = function(){
            var pNames = Object.getOwnPropertyNames(eachesCalc.currentEaches), str = '';
            console.log(eachesCalc.currentEaches)                                
            console.log(pNames)
            for (var i = 0; i < pNames.length; i++) {
                   str = str + pNames[i] +  ': ' + eachesCalc.currentEaches[pNames[i]] + ', ';
            }
            return str;
        }
        _eaches.toQty_HTML = function(){
                
            if(eachesCalc.unit_breakdown.length === 0){
                return '<span style="color:red;">Missing ASIN DATA</span>'
            }
            var units = toUnits(eaches)                
            var html = '<div style="font-weight:bold;"><span>' + units  +' </span>'   
            if(units === 0){

                return html +'</div>'
            }

            if(eachesCalc.unit_breakdown.length > 1){
                //if is a set   
                for (var i = 0; i < eachesCalc.unit_breakdown.length; i++) {                        
                    html = html +' <br><span style="white-space:nowrap;color: #2196F3;">(' + eachesCalc.currentEaches[eachesCalc.unit_breakdown[i].sku] + ' eaches of '+ eachesCalc.unit_breakdown[i].sku +')</span>'
                }

                html = html + '</div>'
            }else if(eachesCalc.unit_breakdown[0].multiple > 1){
                
                html = html +' <span style="white-space:nowrap;color: #2196F3;">(' + eachesCalc.currentEaches[eachesCalc.unit_breakdown[0].sku] + ' eaches)</span></div>'
            }   

            return html
        }

        return _eaches;
    }

    eachesCalc.units = function(units){
        var _units = {};
        if(units != undefined){
            eachesCalc.currentUnits = units
            eachesCalc.currentEaches = toEaches(units);
        }        

        _units.toEaches = function(){                        
            return eachesCalc.currentEaches; 
        }

        _units.add = function(unitToAdd){
            var eachesToAdd = toEaches(unitToAdd);
            

            eachesCalc.eaches().add(eachesToAdd);
            
            return eachesCalc.units();
        }

        _units.subtract = function(untisToSub){
            var eachesToSub = toEaches(untisToSub);

            eachesCalc.eaches().subtract(eachesToSub);
            return eachesCalc.units();
        }

        return _units;
    }


    return eachesCalc;
}