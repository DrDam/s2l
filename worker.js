var id;
var data = {}
var timer;

// Communication
onmessage = function(e) {
	if(e.data.channel == 'stop') {
		clearTimeout(PARAMS.timer);
                result = null
		timer = undefined;
		console.log('woker '+PARAMS.id+' stop');
		return;
	}
	
	if(e.data.channel == 'init') {
		id = e.data.id;
		data = e.data.data;
                console.log('woker '+id+' initialized');
		return;
	}
	if(e.data.channel == 'run')
	{
		console.log('start woker '+id);
                console.log(data.engines);
		//run();
	}
	
}

// Core function
function run() {
	output = drawMeARocket(data);
	postMessage({output:output, id:id});
	timer = setTimeout(run,100);
}

// Processing functions
function drawMeARocket(data) {

}
