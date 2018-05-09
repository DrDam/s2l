var PARAMS = {};
var result = null;

// Communication
onmessage = function(e) {
	if(e.data.channel == 'stop') {
		clearTimeout(PARAMS.timer);
                result = null
		PARAMS.timer = undefined;
		console.log('woker '+PARAMS.id+' stop');
		return;
	}
	
	if(e.data.channel == 'init') {
		PARAMS.id = e.data.id;
		PARAMS.base = e.data.start;
                console.log('woker '+PARAMS.id+' initialized');
		return;
	}
	if(e.data.channel == 'run')
	{
		console.log('start woker '+PARAMS.id);
		run();
	}
	
}

// Core function
function run() {
	if(result == null) {
		result = PARAMS.base;
	}
	result = addOne(result);
	postMessage({result:result, id:PARAMS.id});
	PARAMS.timer = setTimeout(run,100);
}

// Processing functions
function addOne(i) {
    return i + 1;
}
