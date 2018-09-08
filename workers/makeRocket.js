importScripts('../lib/lib.js');  
if(typeof Worker === 'undefined') {
    // Load subworker only if browser not support natively
    importScripts("../lib/subworkers.js");
}


var created = new Date();
var worker_id;
var Global_data = {};
var Global_status = 'run';

// Worker as finish the processing, waiting something other
function autostop() {
    debug.send(worker_id + ' # waiting #');
    self.postMessage({channel: 'end', id: worker_id});
    Global_data = null;
}

// Woker have finish is life and notify is death
function killMe() {
    var stopped = new Date();
    Global_data = null;
    debug.send(worker_id + ' # killMe # ' + round((stopped - created) / 1000,0) + "sec running");
    self.postMessage({channel: 'killMe', id: worker_id});
    close();
}

// Communication
self.addEventListener('message', function (e) {
    // Parent send ALL STOP instruction
    if (e.data.channel == 'stop') {
        Global_status = 'stop';
        killMe();
    }

    // Parent give ID to the worker
    if (e.data.channel == 'create') {
        worker_id = e.data.id;
        console.log(worker_id + ' # Created #');
        return;
    }
    
    // Parent give Data to the worker
    if (e.data.channel == 'init') {
        Global_data = e.data.data;
        debug.setStart(Global_data.simu.startTime);
        debug.send(worker_id + ' # init #');
        return;
    }
    
    // Parent sent Start Procesing  instruction
    if (e.data.channel == 'run') {
        debug.send(worker_id + ' # run #');
        run();
        return;
    }
});