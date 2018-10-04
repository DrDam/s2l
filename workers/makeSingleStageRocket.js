
// Single stage Rocket Case
function makeSingleStageRocket() {

    if (SingleStageWorkersCreated === false) {
        SingleStageWorkersCreated = true;
        SingleStageWorkers = generateWorkers('getStage', Global_data.simu.nbWorker);
    }

    for (var i in SingleStageWorkers) {
        SingleStageWorkers[i].postMessage({channel: "init", data: Global_data});
        SingleStageWorkers[i].postMessage({channel: "run"});
    }
}

// Generation of workers
function generateWorkers(type, nb) {
    var localWorkers = [];
    var i = 0;
    while (i < nb) {
        var w = new Worker('/workers/' + type + ".js");
        var globalId = worker_id + '--' + type + '--' + i;
        //console.log('Generate woker ' + globalId);
        w.postMessage({channel: "create", id: globalId, fragment_id:i, parts: Parts, debug: Global_data.simu.debug});
        localWorkers[globalId] = w;
        SingleStageWorkers[globalId] = localWorkers[globalId];
        SingleStageWorkersStatus[globalId] = 'created';
        SingleStageWorkers[globalId].addEventListener('message', function (e) {
            var result = e.data;
            var subworker_id = result.id
            if (result.channel == 'result') {
                var hash = JSON.stringify(result.output).hashCode();
                DEBUG.send(subworker_id + ' # result # ' + hash);
                //console.log(worker_id);
                //console.log(result);
                //console.log('******************');
                DEBUG.send(worker_id + ' # send to output # ' + hash);
                self.postMessage({channel: 'result', output: result.output, id: worker_id, data: Global_data, hash: hash});
            }
            if (result.channel == 'wait') {
                SingleStageWorkersStatus[subworker_id] = 'wait';
                autostop();
            }
            if (result.channel == 'killMe') {
                SingleStageWorkers[subworker_id] = undefined;
                SingleStageWorkersStatus[subworker_id] = '';
                killMe();
            }
        });
        i++;
    }
    return localWorkers;
}


