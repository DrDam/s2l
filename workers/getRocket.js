importScripts('../lib/lib.js', 'makeSingleStageRocket.js');
if (typeof Worker === 'undefined') {
    // Load subworker only if browser not support natively
    importScripts("../lib/subworkers.js");
}

if(DEBUG === undefined) {DEBUG = {};}

// Worker ID
var worker_id;

// Computation data / status
var Global_data = {};

var Global_status = 'run';
var startTime = new Date();

// Worker Stacks

// ONE STAGE
var SingleStageWorkers = {};
var SingleStageWorkersStatus = {};
var SingleStageWorkersCreated = false;

// MULTIPLE STAGE
var UpperWStackStatus = {};
var UpperWStack = {};
var UpperWStackCreated = false;
var RocketWStackStatus = {};
var RocketWStack = {};
var RocketWStackCreated = false;

// Temporary Result Stack
var RepartitionStack = [];
var UpperResultStack = [];

// Refresh Temporary Result Stack & event launcher
function cleanData() {

    Global_data = {};
    RepartitionStack = [];
    UpperResultStack = [];

    UpperResultStack.push = function (e) {
        Array.prototype.push.call(UpperResultStack, e);
        self.dispatchEvent(new CustomEvent('UpperStackPush'));
    };

    UpperResultStack.shift = function (e) {
        var output = Array.prototype.shift.call(UpperResultStack, e);
        if (output === undefined && UpperResultStack.length === 0) {
            self.dispatchEvent(new CustomEvent('UpperStackIsEmpty'));
        }
        return output;
    };
}

// Wait for another pull of data to process
function autostop() {
    cleanData();
    var stopped = new Date();
    DEBUG.send(worker_id + ' # wait # ' + round((stopped - startTime) / 1000, 0) + "sec running");
    self.postMessage({channel: 'wait', id: worker_id});
}

// Delete me
function killMe() {
    if (Object.values(SingleStageWorkersStatus).join('') === '' &&
            Object.values(UpperWStackStatus).join('') === '' &&
            Object.values(RocketWStackStatus).join('') === '') {
        DEBUG.send(worker_id + ' # killMe');
        self.postMessage({channel: 'killMe', id: worker_id});
        cleanData();
        close();
    }
}

// Stop All Children
function SendStopToAllChildren() {
    for (var i in UpperWStack) {
        if(UpperWStack[i] !== undefined) {
            UpperWStack[i].postMessage({channel: "stop"});
        }
    }
    for (var j in RocketWStack) {
        if(RocketWStack[j] !== undefined) {
            RocketWStack[j].postMessage({channel: "stop"});
        }
    }
    for (var k in SingleStageWorkers) {
        if(SingleStageWorkers[k] !== undefined) {
            SingleStageWorkers[k].postMessage({channel: "stop"});
        }
    }
}


// Communication
self.addEventListener('message', function (e) {
    var inputs = e.data;
    if (inputs.channel === 'stop') {
        Global_status = 'stop';
        DEBUG.send(worker_id + ' # to stop');
        SendStopToAllChildren();
        return;
    }

    if (inputs.channel === 'create') {
        worker_id = inputs.id;
        DEBUG.setStatus(inputs.debug.status);
        DEBUG.setStart(inputs.debug.startTime);
        DEBUG.send(worker_id + ' # created');
        return;
    }

    if (inputs.channel === 'init') {
        cleanData();
        Global_data = inputs.data;
        startTime = new Date();
        DEBUG.send(worker_id + ' # init');
        return;
    }

    if (inputs.channel === 'run') {
        DEBUG.send(worker_id + ' # run');
        drawMeARocket();
        return;
    }
});

// Processing functions
function drawMeARocket() {
    //console.log(data);
    // Case 1 : Generate monobloc rocket for specific Dv
    if (Global_data.rocket.stages === 1) {
        DEBUG.send(worker_id + ' # makeSingleStageRocket');
        // in makeSingleStageRocket.js
        makeSingleStageRocket();
    }

    // Case 2 : Generate monobloc rocket for specific Dv
    if (Global_data.rocket.type === 'mono' && Global_data.rocket.stages > 1) {
        DEBUG.send(worker_id + ' # makeMultipleStageRocket');
        makeMultipleStageRocket();
    }
}

// Make multistage rocket
function makeMultipleStageRocket() {

    var input_step = Global_data.simu.step;
    var calculation_step = round(100 / input_step, 0) - 1;

    for (var i = 0; i < calculation_step; i++) {
        var part = (i + 1) * input_step / 100;
        var dv_step = round(part * Global_data.rocket.dv);
        RepartitionStack.push(dv_step);
    }

    // Generate RockerW
    if (UpperWStackCreated === false  ) {
        UpperWStackCreated = true;
        MakeUpperStageW(Global_data.simu.nbWorker);
    }

    // Run First Process
    for (var UpperW_id in UpperWStack) {
        UpperWStackStatus[UpperW_id] = 'reserved';
        SearchUpperStage(UpperW_id);
    }
}

// Generate Upper Worker
function MakeUpperStageW(nb) {
    var i = 0;
    while (i < nb) {
        var worker_uid = worker_id + '--TopStage--' + i;
        UpperWStackStatus[worker_uid] = 'created';
        var w = new Worker('getStage.js');
        //DEBUG('Generate woker ' + globalId);
        UpperWStack[worker_uid] = w;
        w.postMessage({channel: 'create', id: worker_uid, debug: Global_data.simu.debug});
        w.addEventListener('message', function (e) {
            var channel = e.data.channel;
            var sub_worker_id = e.data.id;
            if (channel === 'killMe') {
                UpperWStack[sub_worker_id] = undefined;
                UpperWStackStatus[sub_worker_id] = '';
                killMe();
            }
            if (channel === 'wait') {
                SearchUpperStage(sub_worker_id);
            }
            if (channel === 'result') {
                DEBUG.send(sub_worker_id + ' # send Result');
                UpperResultStack.push({
                    output: e.data.output,
                    data: e.data.data
                });
            }
        });
        i++;
    }
}

// Send data to UpperStage Processing
function SearchUpperStage(sub_worker_id) {
    if(Global_status === 'stop') {
        SendStopToAllChildren();
        return;
    }
    
    var upperStageDv = RepartitionStack.shift();
    if (upperStageDv === undefined) {
        UpperWStackStatus[sub_worker_id] = 'wait';
        return;
    }

    // Make data for UpperStage
    var UpperData = clone(Global_data);
    UpperData.originData = {};
    UpperData.originData.dv = Global_data.rocket.dv;
    UpperData.originData.stages = Global_data.rocket.stages;
    UpperData.rocket.dv = upperStageDv;
    UpperData.rocket.stages = 1;

    // Send Data to UpperStage
    UpperWStack[sub_worker_id].postMessage({channel: 'init', data: UpperData});
    UpperWStackStatus[sub_worker_id] = 'run';
    UpperWStack[sub_worker_id].postMessage({channel: 'run'});
}



// When a UpperStage has push data to UpperStack
self.addEventListener('UpperStackPush', function () {
    
    DEBUG.send(worker_id +' # UpperResultStack.length # ' + UpperResultStack.length);
    
    if (RocketWStackCreated === false) {
        RocketWStackCreated = true;
        MakeRocketW(Global_data.simu.nbWorker);
    }

    for (var RocketW_id in RocketWStack) {
        if (RocketWStackStatus[RocketW_id] === 'wait' || RocketWStackStatus[RocketW_id] === 'created') {
            RocketWStackStatus[RocketW_id] = 'reserved';
            SearchUnderStage(RocketW_id);
        }
    }
});


// Search Under Stage rocessing
function SearchUnderStage(sub_worker_id) {
    if(Global_status === 'stop') {
        SendStopToAllChildren();
        return;
    }
    
    var Item = UpperResultStack.shift();
    if (Item === undefined) {
        RocketWStackStatus[sub_worker_id] = 'wait';
        return;
    }

    // Item = {output: {stage Found}, data: {Generation Date used}}
    var NextData = clone(Item.data);
    NextData.rocket.dv = Item.data.originData.dv - Item.data.rocket.dv;
    NextData.rocket.stages = Item.data.originData.stages - 1;
    NextData.originData.mass = NextData.cu.mass;
    NextData.originData.size = NextData.cu.size;
    NextData.cu.mass = Item.output.totalMass;
    NextData.cu.size = Item.output.size;

    NextData.Upper = Item.output;
    Item = undefined;

    RocketWStack[sub_worker_id].postMessage({channel: 'init', data: NextData});
    RocketWStackStatus[sub_worker_id] = 'run';
    RocketWStack[sub_worker_id].postMessage({channel: 'run'});
}

// Signal end of all processing
self.addEventListener('UpperStackIsEmpty', function () {
    if(Global_status === 'stop') {
        SendStopToAllChildren();
        return;
    }

    DEBUG.send(worker_id + ' # UpperResultStack is Empty');

    var nbRunning = findAllRunningWorker();

    if ((RepartitionStack.length === 0 &&
            UpperResultStack.length === 0 &&
            nbRunning === 0) || Global_status === 'stop')
    {
        // Normal Stopping
        autostop();
    }
});

// Find how many children are running
function findAllRunningWorker() {
    var counter = 0;
    for (sub_worker_id in UpperWStackStatus) {
        if (UpperWStackStatus[sub_worker_id] === 'run') {
            counter++;
        }
    }
    for (sub_worker_id in UpperWStackStatus) {
        if (RocketWStackStatus[sub_worker_id] === 'run') {
            counter++;
        }
    }
    return counter;
}


function MakeRocketW(nb) {
    var i = 0;
    while (i < nb) {
        var worker_uid = worker_id + '--BottomStage--' + i;
        RocketWStackStatus[worker_uid] = 'created';
        var w = new Worker('getRocket.js');
        //DEBUG('Generate woker ' + globalId);
        RocketWStack[worker_uid] = w;
        w.postMessage({channel: 'create', id: worker_uid, debug: Global_data.simu.debug});
        w.addEventListener('message', function (e) {
            var channel = e.data.channel;
            var sub_worker_id = e.data.id;
            if (channel === 'killMe') {
                DEBUG.send(sub_worker_id + ' # send killMe');
                RocketWStack[sub_worker_id] = undefined;
                RocketWStackStatus[sub_worker_id] = '';
                killMe();
            }
            if (channel === 'wait') {
                DEBUG.send(sub_worker_id + ' # send wait');
                SearchUnderStage(sub_worker_id);
            }
            if (channel === 'result') {
                DEBUG.send(sub_worker_id + ' # send Result # ' + e.data.hash);
                var result = e.data;
                var output = result.output;
                var stages = output.stages;
                var output_stages = [];
                var total_mass = 0;
                var burn = 0;
                var total_dv = 0;
                // Récupération des étages suppérieurs
                var upperData = result.data;
                var Upper = upperData.Upper;
                for(var stage_id in Upper.stages) {
                    output_stages.push(Upper.stages[stage_id]);                        
                }
                burn = Upper.burn;
                total_mass = Upper.totalMass;
                total_dv = Upper.stageDv;
                Upper = undefined;

                // Ajout de l'étage en dessous
                for (var i in stages) {
                    output_stages.push(stages[i]);
                }
                total_dv += output.stageDv;
                burn += output.burn;
                total_mass += output.totalMass;
                
                var output = {
                    stages: output_stages,
                    nbStages: upperData.originData.stages,
                    totalMass: total_mass,
                    burn: burn,
                    stageDv: total_dv,
                };
                var allData = upperData;
                upperData.underData = output;
                
                var hash = JSON.stringify(output).hashCode() ;
                DEBUG.send(worker_id + ' # send to output # ' + hash);
                self.postMessage({channel: 'result', output: output, id: worker_id, data: allData, hash:hash});
            }
        });
        i++;
    }
}
