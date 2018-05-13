// Generate X stage Rocket
var worker_id;
var globalData = {}
var globalWorkers = [];
var globalWorkersStatus = [];
var globalCounter = 0;

function autostop() {
    for (i in globalWorkersStatus) {
        if (globalWorkersStatus[i] == 1) {
            var worker = globalWorkers[i];
            worker.postMessage({channel: "stop"});
        }
    }
}

function killMe() {
    console.log('woker ' + worker_id + ' send killMe');
    postMessage({channel: 'end', id: worker_id});
}

function round(number, precision = 2) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

// Communication
onmessage = function (e) {
    if (e.data.channel == 'stop') {
        autostop();
        return;
    }

    if (e.data.channel == 'init') {
        worker_id = e.data.id;
        globalData = e.data.data;
        return;
    }
    if (e.data.channel == 'run') {
        stopCalculation = false;
        console.log('start woker ' + worker_id);
        drawMeARocket();
        return;
    }
}

// Processing functions
function drawMeARocket() {
    //console.log(data);

    // Case 1 : Generate monobloc rocket for specific Dv
    if (globalData.rocket.type == 'mono' && globalData.rocket.stages == 1) {
        console.log('woker ' + worker_id + ' makeSingleStageRocket');
        makeSingleStageRocket(globalData);
    }

    // Case 1 : Generate monobloc rocket for specific Dv
    if (globalData.rocket.type == 'mono' && globalData.rocket.stages > 1) {
        console.log('woker ' + worker_id + ' makeMultipleStageRocket');
        makeMultipleStageRocket(globalData);
    }
}

function makeMultipleStageRocket(localData) {
    // generate DV repartition
    var i;
    for (i = 0; i < 9; i++) {
        var part = (i + 1) * 10 / 100;
        var UpperData = clone(localData);
        UpperData.rocket.dv = round(part * localData.rocket.dv);
        UpperData.rocket.stages = 1;
//console.log(UpperData.rocket.dv);
//console.log(UpperData);
//console.log('******************');
        var simpleWorkers = generateWorkers('getStage', localData.simu.nbWorker);
        var counter = 0;
        for (var i in simpleWorkers) {
            simpleWorkers[i].postMessage({channel: "init", id: i, fragment_id: counter, data: UpperData});
            simpleWorkers[i].postMessage({channel: "run"});
            simpleWorkers[i].onmessage = function (e) {
                var result = e.data;
                if (result.channel == 'end') {
                    globalWorkers[result.id].terminate();
                    globalWorkersStatus[result.id] = 0;
                    if (Object.values(globalWorkersStatus).join('') == 0) {
                        //killMe();
                    }
                }
                if (result.channel == 'result') {
                    
                    var UpperStageData = result.output;
                    var UpperStageWorker_id = result.id;
                    var NextData = clone(localData);
                    NextData.rocket.dv = localData.rocket.dv - UpperData.rocket.dv;
                    NextData.rocket.stages = localData.rocket.stages - 1;
                    NextData.cu.mass = UpperStageData.totalMass;
//console.log(NextData);
//console.log(UpperStageData);
//console.log('******************');
                    var nextWorker = generateWorkers('getRocket', 1);
                    for (var i in nextWorker) {
                        nextWorker[i].postMessage({channel: "init", id: i, fragment_id: counter, data: NextData});
                        nextWorker[i].postMessage({channel: "run"});
                        nextWorker[i].onmessage = function (e) {
                            var result = e.data;
                            if (result.channel == 'end') {
                                globalWorkers[result.id].terminate();
                                globalWorkersStatus[result.id] = 0;
                                if (Object.values(globalWorkersStatus).join('') == 0) {
                                    //killMe();
                                }
                            }
                            if (result.channel == 'result') {
//console.log(worker_id);
//console.log(result);
//console.log('******************');
                                //console.log('woker ' + result.id + ' callback');
                                var output_stages = {};

                                var stages = result.output.stages;
                                output_stages = [];
                                output_stages.push(UpperStageData.stages[0]);
                                var total_mass = UpperStageData.totalMass + result.output.totalMass;
                                var burn = UpperStageData.burn + result.output.burn;
                                for (var i in stages) {
                                    output_stages.push(stages[i]);
                                }
                                var output = {
                                    stages: output_stages,
                                    totalMass: total_mass,
                                    burn: burn,
                                    dv: 'targetDv',
                                }
                              //  console.log(output);
                                postMessage({channel: 'result', output: output, id: worker_id});
                            }


                        }
                    }
                }
            };
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
        simpleWorkers[i].onmessage = function (e) {
            var result = e.data;
            if (result.channel == 'result') {
                //console.log('woker ' + result.id + ' callback');
                postMessage({channel: 'result', output: result.output, id: worker_id});
            }
            if (result.channel == 'end') {
                globalWorkers[result.id].terminate();
                globalWorkersStatus[result.id] = 0;
                if (Object.values(globalWorkersStatus).join('') == 0) {
                    killMe();
                }
            }

        };
        counter++;
    }
}

// Generation of workers
function generateWorkers(type, nb) {
    var localWorkers = [];
    var i = 0;
    while (i < nb) {
        w = new Worker(type + ".js");
        var globalId = type + globalCounter;
        localWorkers[globalId] = w;
        globalWorkers[globalId] = localWorkers[globalId];
        globalWorkersStatus[globalId] = 1;
        i++;
        globalCounter++;
    }
    return localWorkers;
}

function clone(obj) {
    var copy = JSON.parse(JSON.stringify(obj));
    return copy;
}