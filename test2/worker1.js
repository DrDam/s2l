
var worker_id;
var Global_data = {};
var Global_status = 'run';

var UpperWStackStatus = [];
var UpperWStack = [];
var RocketWStackStatus = [];
var RocketWStack = [];
var RepartitionStack = [];
var UpperResultStack = [];



function cleanData() {

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
    self.postMessage({channel: 'wait', id: worker_id});
    Global_data = null;
}
/*
 // Delete me
 function killMe() {
 self.postMessage({channel: 'killMe', id: worker_id});
 Global_data = null;
 close();
 }*/

// Communication
self.addEventListener('message', function (e) {
    /*if (e.data.channel == 'stop') {
     Global_status = 'stop';
     killMe();
     }*/

    if (e.data.channel == 'create') {
        worker_id = e.data.id;
        //console.log(worker_id + ' # Create # ');
        return;
    }

    if (e.data.channel == 'init') {
        Global_data = e.data.data;
        cleanData();
        // console.log(worker_id + ' # init # ' + Global_data.a);
        return;
    }

    if (e.data.channel == 'run') {
        make_something();
        return;
    }
});



function make_something() {

    // Generate Repartition of Data
    for (var i = 0; 5 * Global_data.nb_worker; i++) {
        RepartitionStack.push({a: i, p: 1});
    }

    // Generate RockerW
    if (UpperWStackStatus.length === 0) {
        MakeUpperW(Global_data.nb_worker);
    }

    // Run First Process
    for (var UpperW_id in UpperWStack) {
        UpperWStackStatus[UpperW_id] = 'reserved';
        process1(UpperW_id);
    }
}



self.addEventListener('UpperStackPush', function () {
    if (RocketWStackStatus.length === 0) {
        MakeRocketW(Global_data.nb_worker);
    }

    for (var RocketW_id in RocketWStack) {
        if (RocketWStackStatus[RocketW_id] === 'wait' || RocketWStackStatus[RocketW_id] === 'created') {
            RocketWStackStatus[RocketW_id] = 'reserved';
            process2(RocketW_id);
        }
    }
});

self.addEventListener('UpperStackIsEmpty', function () {
    if (RepartitionStack.length === 0 &&
            UpperResultStack.length === 0 &&
            UpperWStackStatus.join('run').length === 0 &&
            RocketWStackStatus.join('run').length === 0) {
        autostop();
    }
});

// Generate Upper Worker
function MakeUpperW(nb) {
    var i = 0;
    while (i < nb) {
        var w = new Worker('worker2.js');
        var worker_uid = worker_id + '--' + i;
        //debug('Generate woker ' + globalId);
        UpperWStack[worker_uid] = w;
        UpperWStackStatus[worker_uid] = 'created';
        w.postMessage({channel: 'create', id: worker_uid});
        w.addEventListener('message', function (e) {
            var channel = e.data.channel;
            var worker_id = e.data.id;
            if (channel == 'wait') {
                process1(worker_id);
            }
            if (channel == 'result') {
                var result = e.data.result;
                UpperResultStack.push(result);
            }
        });
        i++;
    }
}

// Make UpperStage Processing
function process1(worker_id) {
    var Item = RepartitionStack.shift();
    if (Item === undefined) {
        UpperWStackStatus[worker_id] = 'wait';
        return;
    }
    UpperWStack[worker_id].postMessage({channel: 'init', data: Item});
    UpperWStackStatus[worker_id] = 'run';
    UpperWStack[worker_id].postMessage({channel: 'run'});
}

// Make Rocket Processing
function process2(worker_id) {
    var Item = UpperResultStack.shift();
    if (Item === undefined) {
        RocketWStackStatus[worker_id] = 'wait';
        return;
    }
    RocketWStack[worker_id].postMessage({channel: 'init', data: Item});
    RocketWStackStatus[worker_id] = 'run';
    RocketWStack[worker_id].postMessage({channel: 'run'});
}

function MakeRocketW(nb) {
    var i = 0;
    while (i < nb) {
        var w = new Worker('worker1.js');
        var worker_uid = worker_id + '--' + i;
        //debug('Generate woker ' + globalId);
        RocketWStack[worker_uid] = w;
        RocketWStackStatus[worker_uid] = 'created';
        w.postMessage({channel: 'create', id: worker_uid});
        w.addEventListener('message', function (e) {
            var channel = e.data.channel;
            var worker_id = e.data.id;
            if (channel == 'wait') {
                process2(worker_id);
            }
            if (channel == 'result') {
                var result = e.data.result;
                self.postMessage({channel: 'result', output: result});
            }
        });
        i++;
    }
}
