var Debug = false;
var debug = function(message) {
    if(Debug === true) {
        console.log(message);
    }
};

function clone(obj) {
    var copy = JSON.parse(JSON.stringify(obj));
    return copy;
}

function round(number, precision) {
    if(precision === undefined) {
        precision = 2;
    }
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

function mergeArray(array1, array2) {  
    var output = clone(array1);
    for(var i in array2) {
        output.push(array2[i]);
    }
    return output;
}

function testTwr(Thrust, Mass, target, Go) {
    var Twr = Thrust / Mass / Go;
    return(Twr > target.min && Twr < target.max);
}

// Warn if overriding existing method
if(Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
};
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});