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
	//console.log('woker '+PARAMS.id+' send to main : ' + result);
	postMessage({result:result, id:PARAMS.id});
	PARAMS.timer = setTimeout(run,100);
}

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
		return;
	}
	if(e.data.channel == 'run')
	{
		//console.log('woker '+PARAMS.id+' initialized with : ' + PARAMS.base);
		run();
	}
	
}


