var Debug = true;
var debug = function(message) {
    if(Debug === true) {
        console.log(message);
    }
};

function clone(obj) {
    var copy = JSON.parse(JSON.stringify(obj));
    return copy;
}

function round(number, precision = 2) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}