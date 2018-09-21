importScripts('../lib/lib.js');  
if(typeof Worker === 'undefined') {
    // Load subworker only if browser not support natively
    importScripts("../lib/subworkers.js");
}

// Worker ID
var worker_id;

// Computation data / status
var Global_data = {};

var Global_status = 'run';
var created = new Date();

// MULTIPLE STAGE

// Worker Stack
var UpperWStackStatus = [];
var UpperWStack = [];
var RocketWStackStatus = [];
var RocketWStack = [];

// Temporary Result Stack
var RepartitionStack = [];
var UpperResultStack = [];

// ONLY ONE STAGE
var SingleStageWorkers = [];
var SingleStageWorkersStatus = [];


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
    debug.send(worker_id + ' # wait # ' + round((stopped - created) / 1000, 0) + "sec running");
    self.postMessage({channel: 'wait', id: worker_id});
}

 // Delete me
 function killMe() {
     if(Object.values(SingleStageWorkers).join('') == '' &&
        Object.values(UpperWStackStatus).join('') == '' &&
        Object.values(RocketWStackStatus).join('') == '') {
            self.postMessage({channel: 'killMe', id: worker_id});
            cleanData();
            close();    
     }
 }

// Stop All Children
function SendStopToAllChildren() {
    for (var i in UpperWStack) {
        UpperWStack[i].postMessage({channel: "stop"});
    }
    for (var i in RocketWStack) {
        RocketWStack[i].postMessage({channel: "stop"});
    }
    for (var i in SingleStageWorkers) {
        SingleStageWorkers[i].postMessage({channel: "stop"});
    }
}


// Communication
self.addEventListener('message', function (e) {
    var inputs = e.data;
    if (inputs.channel == 'stop') {
        Global_status = 'stop';
        debug.send(worker_id + ' # to stop');
        SendStopToAllChildren();
        return;
    } 

    if (inputs.channel == 'create') {
        worker_id = inputs.id;
        debug.setStart(inputs.startTime);
        debug.send(worker_id + ' # created');
        return;
    }

    if (inputs.channel == 'init') {
        cleanData();
        Global_data = inputs.data;
        debug.setStart(Global_data.simu.startTime);
        debug.send(worker_id + ' # init');
        return;
    }

    if (inputs.channel == 'run') {
        debug.send(worker_id + ' # run');
        drawMeARocket();
        return;
    }
});

// Processing functions
function drawMeARocket() {
    //console.log(data);
    // Case 1 : Generate monobloc rocket for specific Dv
    if (Global_data.rocket.type == 'mono' && Global_data.rocket.stages == 1) {
        debug.send(worker_id + ' # makeSingleStageRocket');
        makeSingleStageRocket();
    }

    // Case 1 : Generate monobloc rocket for specific Dv
    if (Global_data.rocket.type == 'mono' && Global_data.rocket.stages > 1) {
        debug.send(worker_id + ' # makeMultipleStageRocket');
        makeMultipleStageRocket();
    }
}

function makeMultipleStageRocket() {
    console.log(Global_data);
    var input_step = Global_data.simu.step;
    var calculation_step = round(100/input_step, 0) - 1
    
    for (var i = 0; i < calculation_step; i++) {
        var part = (i + 1) * input_step / 100;       
        var dv_step = round(part * localData.rocket.dv);
        RepartitionStack.push(dv_step);
    }
    
    // Generate RockerW
    if (UpperWStackStatus.length === 0) {
        MakeUpperStageW(Global_data.simu.nbWorker );
    }
    
        // Run First Process
    for (var UpperW_id in UpperWStack) {
        UpperWStackStatus[UpperW_id] = 'reserved';
        SearchUpperStage(UpperW_id);
    }
}

// Send data to UpperStage Processing
function SearchUpperStage(worker_id) {
    var upperStageDv = RepartitionStack.shift();
    if (upperStageDv === undefined) {
        UpperWStackStatus[worker_id] = 'wait';
        return;
    }
    // Make data for UpperStage
    var UpperData = clone(Global_data);
    UpperData.originData = {}
    UpperData.originData.dv = Global_data.rocket.dv;
    UpperData.originData.stages = Global_data.rocket.stages;
    UpperData.rocket.dv = upperStageDv;
    UpperData.rocket.stages = 1;
    
    // Send Data to UpperStage
    UpperWStack[worker_id].postMessage({channel: 'init', data: UpperData});
    UpperWStackStatus[worker_id] = 'run';
    UpperWStack[worker_id].postMessage({channel: 'run'});
}

// Generate Upper Worker
function MakeUpperStageW(nb) {
    var i = 0;
    while (i < nb) {
        var worker_uid = worker_id + '--' + i;
        UpperWStackStatus[worker_uid] = 'created';
        var w = new Worker('getStage.js');
        //debug('Generate woker ' + globalId);
        UpperWStack[worker_uid] = w;
        w.postMessage({channel: 'create', id: worker_uid});
        w.addEventListener('message', function (e) {
            var channel = e.data.channel;
            var worker_id = e.data.id;
            if (channel == 'killMe') {
                UpperWStack[worker_id] = undefined;
                UpperWStackStatus[worker_id] = '';
                killMe();
            }
            if (channel == 'wait') {
                SearchUpperStage(worker_id);
            }
            if (channel == 'result') {
                UpperResultStack.push({
                    output : e.data.output,
                    data : e.data.data,
                });
            }
        });
        i++;
    }
}

// When a UpperStage has push data to UpperStack
self.addEventListener('UpperStackPush', function () {
    if (RocketWStackStatus.length === 0) {
        MakeRocketW(Global_data.nb_worker);
    }

    for (var RocketW_id in RocketWStack) {
        if (RocketWStackStatus[RocketW_id] === 'wait' || RocketWStackStatus[RocketW_id] === 'created') {
            RocketWStackStatus[RocketW_id] = 'reserved';
            SearchUnderStage(RocketW_id);
        }
    }
});


// Search Under Stage rocessing
function SearchUnderStage(worker_id) {
    var Item = UpperResultStack.shift();
    if (Item === undefined) {
        RocketWStackStatus[worker_id] = 'wait';
        return;
    }
    // Item = {out: {stage Found}, data: {Generation Date used}}
    NextData = clone(Item.data);
    NextData.rocket.dv = Item.data.originData.dv - Item.data.rocket.dv;
    NextData.rocket.stages = Item.data.originData.stages - 1;
    NextData.cu.mass = Item.out.totalMass;
    NextData.cu.size = Item.out.size;

    NextData.Upper = Item.data;
    
    RocketWStack[worker_id].postMessage({channel: 'init', data: NextData});
    RocketWStackStatus[worker_id] = 'run';
    RocketWStack[worker_id].postMessage({channel: 'run'});
}

// Signal end of all processing
self.addEventListener('UpperStackIsEmpty', function () {
    
    var nbRunning = findAllRunningWorker();
    
    if (RepartitionStack.length === 0 &&
            UpperResultStack.length === 0 &&
            nbRunning == 0) {
        // Normal Stopping
        autostop();
    }
});

// Find how many children are running
function findAllRunningWorker() {
    var counter = 0;
    for(worker_id in UpperWStackStatus) {
        if(UpperWStackStatus[worker_id] === 'run') {
            counter++;
        }
    }
        for(worker_id in UpperWStackStatus) {
        if(RocketWStackStatus[worker_id] === 'run') {
            counter++;
        }
    }
    return counter;
}


function MakeRocketW(nb) {
    var i = 0;
    while (i < nb) {
        var worker_uid = worker_id + '--' + i;
        RocketWStackStatus[worker_uid] = 'created';
        var w = new Worker('getRocket.js');
        //debug('Generate woker ' + globalId);
        RocketWStack[worker_uid] = w;
        w.postMessage({channel: 'create', id: worker_uid});
        w.addEventListener('message', function (e) {
            var channel = e.data.channel;
            var worker_id = e.data.id;
            if (channel == 'killMe') {
                RocketWStack[worker_id] = undefined;
                RocketWStackStatus[worker_id] = '';
                killMe();
            }
            if (channel == 'wait') {
                SearchUnderStage(worker_id);
            }
            if (channel == 'result') {
                var result = e.data.result;
                
                var output_stages = {};


// A finir

                                var stages = result2.output.stages;
                                output_stages = [];
                                output_stages.push(UpperStageData.stages[0]);
                                var total_mass = UpperStageData.totalMass + result2.output.totalMass;
                                var burn = UpperStageData.burn + result2.output.burn;
                                for (var i in stages) {
                                    output_stages.push(stages[i]);
                                }
                                var total_dv =  UpperStageData.stageDv + result2.output.stageDv;
                                //console.log(localData);
                                var output = {
                                    stages: output_stages,
                                    nbStages: localData.rocket.stages,
                                    totalMass: total_mass,
                                    burn: burn,
                                    stageDv: total_dv,
                                };
                                //console.log('******************');
                                //console.log(worker_id);
                                //console.log(output);
                                //console.log('******************');
                                self.postMessage({channel: 'result', output: output, id: worker_id, data:Global_data});
                
                
                
                self.postMessage({channel: 'result', output: result});
            }
        });
        i++;
    }
}

















/* OLD PROCESSING */










function makeMultipleStageRocket(localData) {
    // generate DV repartition
    var i;
    for (i = 0; i < 9; i++) {
        if(Global_status == 'stop') {return null;}
        var part = (i + 1) * 10 / 100;
        var UpperData = clone(localData);
        UpperData.rocket.dv = round(part * localData.rocket.dv);
        UpperData.rocket.stages = 1;

        // Fire multiple worker testing all engine for last Stage
        var simpleWorkers = generateWorkers('getStage', 1);
        for (var i in simpleWorkers) {
            simpleWorkers[i].postMessage({channel: "init", id: i, data: UpperData});
            simpleWorkers[i].postMessage({channel: "run"});
            simpleWorkers[i].addEventListener('message',function(e){
                var result = e.data;
                if (result.channel == 'end') {
                    childSendKillMe(result.id);
                }
                if (result.channel == 'result') {
                    if(Global_status == 'stop') {return null;}
                    // When UpperStage found a solution, 
                    // construct all rest of the launcher
                    // console.log(result);
                    var UpperStageData = result.output;
                    var NextData = clone(localData);
                    
                    NextData.rocket.dv = localData.rocket.dv - UpperData.rocket.dv;
                    NextData.rocket.stages = localData.rocket.stages - 1;
                    NextData.cu.mass = UpperStageData.totalMass;
                    NextData.cu.size = UpperStageData.size;

                    var nextWorker = generateWorkers('getRocket', 1);
                    for (var i in nextWorker) {
                        nextWorker[i].postMessage({channel: "init", id: i, data: NextData});
                        nextWorker[i].postMessage({channel: "run"});
                        nextWorker[i].addEventListener('message',function(e){
                            var result2 = e.data;
                            if (result2.channel == 'end') {
                                childSendKillMe(result2.id);
                            }
                            if (result2.channel == 'result') {
                                if(Global_status == 'stop') {return null;}
                                // If rest of launcher find a solution
                                //console.log(worker_id);
                                //console.log(result);
                                //console.log('******************');
                                var output_stages = {};

                                var stages = result2.output.stages;
                                output_stages = [];
                                output_stages.push(UpperStageData.stages[0]);
                                var total_mass = UpperStageData.totalMass + result2.output.totalMass;
                                var burn = UpperStageData.burn + result2.output.burn;
                                for (var i in stages) {
                                    output_stages.push(stages[i]);
                                }
                                var total_dv =  UpperStageData.stageDv + result2.output.stageDv;
                                //console.log(localData);
                                var output = {
                                    stages: output_stages,
                                    nbStages: localData.rocket.stages,
                                    totalMass: total_mass,
                                    burn: burn,
                                    stageDv: total_dv,
                                };
                                //console.log('******************');
                                //console.log(worker_id);
                                //console.log(output);
                                //console.log('******************');
                                self.postMessage({channel: 'result', output: output, id: worker_id});
                            }
                        });
                    }
                    NextData = null;
                }
            });
        }
    }
}





 /************** A GARDER *******************/


// Single stage Rocket Case
function makeSingleStageRocket() {

    var simpleWorkers = generateWorkers('getStage', 1);
    for (var i in simpleWorkers) {
        simpleWorkers[i].postMessage({channel: "create", id: i, startTime: Global_data.simu.startTime});
        simpleWorkers[i].postMessage({channel: "init", data: Global_data});
        simpleWorkers[i].postMessage({channel: "run"});
        simpleWorkers[i].addEventListener('message',function(e){
            var result = e.data;
            var subworker_id = result.id
            if (result.channel == 'result') {
                //debug(worker_id);
                //debug(result);
                //debug('******************');
                self.postMessage({channel: 'result', output: result.output, id: worker_id});
            }
            if (result.channel == 'wait') {
                SingleStageWorkersStatus[subworker_id] = 'wait';
                SingleStageWorkers[subworker_id].postMessage({channel:'stop'})
            }
            if (result.channel == 'killMe') {
                SingleStageWorkers[subworker_id] = undefined;
                SingleStageWorkersStatus[subworker_id] = '';
                killMe();
            }

        });
    }
}

// Generation of workers
function generateWorkers(type, nb) {
    var localWorkers = [];
    var i = 0;
    while (i < nb) {
        var w = new Worker('/workers/' + type + ".js");
        var globalId = worker_id + '--' + type;
        //debug('Generate woker ' + globalId);
        localWorkers[globalId] = w;
        SingleStageWorkers[globalId] = localWorkers[globalId];
        SingleStageWorkersStatus[globalId] = 'created';
        i++;
    }
    return localWorkers;
}


