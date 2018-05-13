// Generate X stage Rocket
var worker_id;
var globalData = {}
var globalWorkers = [];
var globalWorkersStatus = [];
var globalCounter = 0;

function autostop() {
    for(i in globalWorkersStatus) {
        if(globalWorkersStatus[i] == 1) {
            var worker = globalWorkers[i];
            worker.postMessage({channel: "stop"});
        }
    }
}

function killMe(){
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
        makeSingleStageRocket(globalData, singleRocketCallback);
    }
}













// Single stage Rocket Case
var singleRocketCallback = function(localData) {
    postMessage({channel: 'result',  output: localData.output, id: worker_id});
}
function makeSingleStageRocket(data, callback) {

    var simpleWorkers = generateWorkers('getStage', data.simu.nbWorker);
    var counter = 0;
    for (var i in simpleWorkers) {
        simpleWorkers[i].postMessage({channel: "init", id: i, fragment_id : counter, data: data});
        simpleWorkers[i].postMessage({channel: "run"});
        simpleWorkers[i].onmessage = function (e) {
            var result = e.data;
            if(result.channel == 'result') {
                //console.log('woker ' + result.id + ' callback');
                callback(result);
            }
            if(result.channel == 'end') {
                globalWorkers[result.id].terminate();
                globalWorkersStatus[result.id] = 0;
                if(Object.values(globalWorkersStatus).join('') == 0) {
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