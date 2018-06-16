importScripts('subworkers.js','lib.js');  

// Generate X stage Rocket
var worker_id;
var globalData = {}
var globalWorkers = [];
var globalWorkersStatus = [];
var globalCounter = 0;
var Global_status = 'run';
function autostop() {
    for (i in globalWorkersStatus) {
        if (globalWorkersStatus[i] == 1) {
            var worker = globalWorkers[i];
            worker.postMessage({channel: "stop"});
        }
    }
}

function killMe() {
    debug('worker ' + worker_id + ' send killMe');
    self.postMessage({channel: 'end', id: worker_id});
}

// Communication
self.addEventListener('message',function(e){
    if (e.data.channel == 'stop') {
        Global_status = 'stop';
        autostop();
        close();
    }
    if (e.data.channel == 'init') {
        worker_id = e.data.id;
        globalData = e.data.data;
        debug('woker ' + worker_id + ' initialized');
        return;
    }
    if (e.data.channel == 'run') {
        debug('start woker ' + worker_id);
        drawMeARocket();
        return;
    }
});

// Processing functions
function drawMeARocket() {
    //debug(data);

    // Case 1 : Generate monobloc rocket for specific Dv
    if (globalData.rocket.type == 'mono' && globalData.rocket.stages == 1) {
        //debug('woker ' + worker_id + ' makeSingleStageRocket');
        makeSingleStageRocket(globalData);
    }

    // Case 1 : Generate monobloc rocket for specific Dv
    if (globalData.rocket.type == 'mono' && globalData.rocket.stages > 1) {
        //debug('woker ' + worker_id + ' makeMultipleStageRocket');
        makeMultipleStageRocket(globalData);
    }
}

function makeMultipleStageRocket(localData) {
    // generate DV repartition
    var i;
    for (i = 0; i < 9; i++) {
        if(Global_status == 'stop') {return null;}
        var part = (i + 1) * 10 / 100;
        var UpperData = clone(localData);
        UpperData.rocket.dv = round(part * localData.rocket.dv);
        UpperData.rocket.stages = 1;
//debug(UpperData.rocket.dv);
//debug(UpperData);
//debug('******************');
        var simpleWorkers = generateWorkers('getStage', localData.simu.nbWorker);
        var counter = 0;
        for (var i in simpleWorkers) {
            simpleWorkers[i].postMessage({channel: "init", id: i, fragment_id: counter, data: UpperData});
            simpleWorkers[i].postMessage({channel: "run"});
            simpleWorkers[i].addEventListener('message',function(e){
                var result = e.data;
                if (result.channel == 'end') {
                    debug('worker ' + result.id + ' send killMe');
                    globalWorkers[result.id].terminate();
                    globalWorkersStatus[result.id] = 0;
                    if (Object.values(globalWorkersStatus).join('') == 0) {
                        killMe();
                    }
                }
                if (result.channel == 'result') {
                    if(Global_status == 'stop') {return null;}
                    //debug(result);
                    var UpperStageData = result.output;
                    var NextData = clone(localData);
                    NextData.rocket.dv = localData.rocket.dv - UpperData.rocket.dv;
                    NextData.rocket.stages = localData.rocket.stages - 1;
                    NextData.cu.mass = UpperStageData.totalMass;
                    NextData.cu.size = UpperStageData.size;
//debug(NextData);
//debug(UpperStageData);
//debug('******************');
                    var nextWorker = generateWorkers('getRocket', 1);
                    for (var i in nextWorker) {
                        nextWorker[i].postMessage({channel: "init", id: i, fragment_id: counter, data: NextData});
                        nextWorker[i].postMessage({channel: "run"});
                        nextWorker[i].addEventListener('message',function(e){
                            var result = e.data;
                            if (result.channel == 'end') {
                                debug('worker ' + result.id + ' send killMe');
                                globalWorkers[result.id].terminate();
                                globalWorkersStatus[result.id] = 0;
                                if (Object.values(globalWorkersStatus).join('') == 0) {
                                    killMe();
                                }
                            }
                            if (result.channel == 'result') {
                                if(Global_status == 'stop') {return null;}
//debug(worker_id);
//debug(result);
//debug('******************');
                                var output_stages = {};

                                var stages = result.output.stages;
                                output_stages = [];
                                output_stages.push(UpperStageData.stages[0]);
                                var total_mass = UpperStageData.totalMass + result.output.totalMass;
                                var burn = UpperStageData.burn + result.output.burn;
                                for (var i in stages) {
                                    output_stages.push(stages[i]);
                                }
                                var total_dv =  UpperStageData.stageDv + result.output.stageDv;
                                //debug(localData);
                                var output = {
                                    stages: output_stages,
                                    nbStages: localData.rocket.stages,
                                    totalMass: total_mass,
                                    burn: burn,
                                    stageDv: total_dv,
                                }
                               //debug('******************');
                               //debug(worker_id);
                               //debug(output);
                               //debug('******************');
                               self.postMessage({channel: 'result', output: output, id: worker_id});
                            }


                        });
                    }
                }
            });
            counter++;
        }
    }
}




// Single stage Rocket Case
function makeSingleStageRocket(localData) {

    var simpleWorkers = generateWorkers('getStage', localData.simu.nbWorker);
    var counter = 0;
    for (var i in simpleWorkers) {
        simpleWorkers[i].postMessage({channel: "init", id: i, fragment_id: counter, data: localData});
        simpleWorkers[i].postMessage({channel: "run"});
        simpleWorkers[i].addEventListener('message',function(e){
            var result = e.data;
            if (result.channel == 'result') {
                //debug(worker_id);
                //debug(result);
                //debug('******************');
                postMessage({channel: 'result', output: result.output, id: worker_id});
            }
            if (result.channel == 'end') {
                debug('worker ' + result.id + ' send killMe');
                globalWorkers[result.id].terminate();
                globalWorkersStatus[result.id] = 0;
                if (Object.values(globalWorkersStatus).join('') == 0) {
                    killMe();
                }
            }

        });
        counter++;
    }
}

// Generation of workers
function generateWorkers(type, nb) {
    var localWorkers = [];
    var i = 0;
    while (i < nb) {
        w = new Worker(type + ".js");
        var globalId = worker_id + '--' + type + '--' + globalCounter;
        //debug('Generate woker ' + globalId);
        localWorkers[globalId] = w;
        globalWorkers[globalId] = localWorkers[globalId];
        globalWorkersStatus[globalId] = 1;
        i++;
        globalCounter++;
    }
    return localWorkers;
}
