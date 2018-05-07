var PARAMS = {};
var result = null;

function addOne(i) {
    return i + 1;
}

function run() {
	if(result == null) {
		result = PARAMS.base;
	}
	result = addOne(result);
	console.log('message send to main');
	postMessage({result:result, id:PARAMS.id});
	setTimeout(run,100);
}

onmessage = function(e) {
	if(e.data.stop == true) {
		return;
	}
	else {
		PARAMS.id = e.data.id;
		PARAMS.base = e.data.start;
		run();
	}
	
}


