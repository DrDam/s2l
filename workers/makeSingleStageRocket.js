
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


