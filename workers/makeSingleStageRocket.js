
// Single stage Rocket Case
function makeSingleStageRocket() {
    
    if (SingleStageWorkersCreated === false  ) {
        SingleStageWorkersCreated = true;
        SingleStageWorkers = generateWorkers('getStage', 1);
    }
    
    for (var i in SingleStageWorkers) {
        SingleStageWorkers[i].postMessage({channel: "init", data: Global_data});
        SingleStageWorkers[i].postMessage({channel: "run"});
        SingleStageWorkers[i].addEventListener('message',function(e){
            var result = e.data;
            var subworker_id = result.id
            if (result.channel == 'result') {
                //console.log(worker_id);
                //console.log(result);
                //console.log('******************');
                self.postMessage({channel: 'result', output: result.output, id: worker_id, data:Global_data});
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
    }
}

// Generation of workers
function generateWorkers(type, nb) {
    var localWorkers = [];
    var i = 0;
    while (i < nb) {
        var w = new Worker('/workers/' + type + ".js");
        var globalId = worker_id + '--' + type;
        //console.log('Generate woker ' + globalId);
        w.postMessage({channel: "create", id: globalId, debug: Global_data.simu.debug});
        localWorkers[globalId] = w;
        SingleStageWorkers[globalId] = localWorkers[globalId];
        SingleStageWorkersStatus[globalId] = 'created';
        i++;
    }
    return localWorkers;
}


