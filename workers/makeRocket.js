importScripts('../lib/lib.js');
if (typeof Worker === 'undefined') {
    // Load subworker only if browser not support natively
    importScripts("../lib/subworkers.js");
}
var created = new Date();

// Worker management
var worker_id;
var Global_data = {};
var Global_status = 'run';

// Children Management
var GlobalWorkers = [];
var GlobalWorkersStatus = [];
var GlobalCounter = 0;

// Worker as finish the processing, waiting something other
function waiting() {
    debug.send(worker_id + ' # waiting #');
    self.postMessage({channel: 'end', id: worker_id});
    Global_data = null;
}

// Woker have finish is life and notify is death
function killMe() {
    var stopped = new Date();
    Global_data = null;
    debug.send(worker_id + ' # killMe # ' + round((stopped - created) / 1000, 0) + "sec running");
    self.postMessage({channel: 'killMe', id: worker_id});
    close();
}

// A child send a "kilMe message"
function childSendKillMe(child_id) {
    debug.send(worker_id + ' # ' + child_id + 'send killMe');
    GlobalWorkers[child_id] = undefined;
    GlobalWorkersStatus[child_id] = '';
    if (Object.values(GlobalWorkersStatus).join('') == '') {
        killMe();
    }
}

// Send "stop" command to all children and wait theyr are all death to send killme message
function stopAllChildren() {
    for (var i in GlobalWorkersStatus) {
        if (GlobalWorkersStatus[i] != '') {
            var worker = GlobalWorkers[i];
            worker.postMessage({channel: "stop"});
        }
    }
}

// Communication from parent
self.addEventListener('message', function (e) {
    // Parent send ALL STOP instruction
    if (e.data.channel == 'stop') {
        Global_status = 'stop';
        stopAllChildren();
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
        makeMeARocket();
        return;
    }
});

// Main function
function makeMeARocket() {

    // Case 1 : Generate 1 stage monobloc rocket
    if (Global_data.rocket.type === 'mono' && Global_data.rocket.stages === 1) {
        //debug.send(worker_id + ' # makeSingleStageRocket #');
        makeSingleStageRocket();
    }

    // Case 1 : Generate Multistage monobloc rocket
    if (Global_data.rocket.type === 'mono' && Global_data.rocket.stages > 1) {
        //debug.send(worker_id + ' # makeMultipleStageRocket #');
        makeMultipleStageRocket();
    }

}
/*********************************/
/* Generate 1 stage composition */
/*******************************/

// Single stage Rocket Case
function makeSingleStageRocket() {
    
    // Create a single Worker
    var w = new Worker('/workers/MakeStage.js');
    var globalId = worker_id + '--' + 'single_stage';
    w.postMessage({channel: 'create', id: globalId});
    GlobalWorkers[globalId] = w;
    GlobalWorkersStatus[globalId] = 'run';
    
    // Worker work alone
    w.postMessage({channel: "init", data: Global_data});
    w.postMessage({channel: "run"});
    w.addEventListener('message', function (e) {
        var result = e.data;
        if (result.channel === 'result') {
            //console.log(worker_id);
            //console.log(result);
            //console.log('******************');
            self.postMessage({channel: 'result', output: result.output, id: worker_id, data: result.data});
        }
        // Specific case, no reutilisability of childworker
        if (result.channel === 'wait') {
            GlobalWorkers[result.id].postMessage({channel: 'stop'});
        }
        if (result.channel === 'killMe') {
            childSendKillMe(result.id);
        }
    });    
}

/**********************************/
/* Generate 2 stages composition */
/********************************/
// Concept : 
// Make all possible proportions , put theyr in a "precalculor" stack
// Run X worker to process "precalculor" stack item per item and fill a "UpperStage Result" Stack
// Run X workers to process "UpperStage Result" Stack item per item and postMessage results

// prepare Stack of Datas
var DataToProcessInUpperStage = [];
var UpperStageResults = [];
// Multiple stage Rocket Case
function makeMultipleStageRocket() {

    var Percent_steps = round((100 / Global_data.simu.steps) - 1, 0);
    var i;
    for (i = 0; i < Percent_steps; i++) {
        // Generate Data for all UpperStage Processing
        var part = (i + 1) * Global_data.simu.steps / 100;
        DataToProcessInUpperStage.push(round(part * Global_data.rocket.dv));
    }
    
    var localworkers = createWorkerForMultiStage('MakeStage', Global_data.simu.nbWorker, processDataToProcessInUpperStage);
    // Run X worker to process "DataToProcessInUpperStage" stack item per item and fill a "UpperStageResults" Stack
    for(var wid in localworkers) {
        processDataToProcessInUpperStage(wid);
    }
    
}

function createWorkerForMultiStage(type, nb, computation_callback) {
    var localWorkers = [];
    var i = 0;
    while (i < nb) {
        var w = new Worker('/workers/' + type + ".js");
        var globalId = worker_id + '--' + type + '--' + GlobalCounter;
        w.postMessage({channel: 'create', id: globalId});
        w.addEventListener('message', function (event) {
            var channel = event.data.channel;
            if (channel == 'end') {
                var wid = event.data.id;
                GlobalWorkersStatus[wid] = 'wait';
                //console.log(wid + ' # END # ');
                self[computation_callback](wid);
            }
            if (channel == 'output') {
                var callback = event.data.callback;
                var dataToProcess = event.data.data;
                var wid2 = event.data.id;
                //console.log(worker_id + ' # ' + callback + ' # ');
                self[callback](wid2, dataToProcess);
            }
        });
        //console.log('Generate woker ' + globalId);
        localWorkers[globalId] = w;
        GlobalWorkers[globalId] = localWorkers[globalId];
        GlobalWorkersStatus[globalId] = 'run';
        i++;
        GlobalCounter++;
    }
    return localWorkers;
}

function processDataToProcessInUpperStage(worker_id) {
        var worker = GlobalWorkers[wid];
        var dv = DataToProcessInUpperStage.shift();
        if (dv == undefined) {
            return;
        }
        GlobalWorkersStatus[wid] = 'wait';
        var UpperData = clone(localData);
        UpperData.rocket.dv = dv;
        UpperData.rocket.stages = 1;
        worker.postMessage({channel: "init", id: i, fragment_id: 1, data: UpperData, callback:});
        worker.postMessage({channel: 'run'});
}
