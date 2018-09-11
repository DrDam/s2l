
var results = [];
var nb_worker = 300;
var DataStack = [];
var worker_stack = [];

function runLevel2(worker_id, level2_data) {
    var output = level2_data.out;
    //console.log(worker_id + ' # result # ' + output);
    results.push({id: output, worker: worker_id});
}

function createWorker(worker_id) {
    var newWorker = new Worker('test/worker.js');
    newWorker.postMessage({channel: 'create', id: worker_id});
    newWorker.addEventListener('message', function (event) {
        var channel = event.data.channel;
        if (channel == 'end') {
            var wid = event.data.id;
            //console.log(wid + ' # END # ');
            update_worker(wid);
        }
        if (channel == 'output') {
            var callback = event.data.callback;
            var dataToProcess = event.data.data;
            var wid2 = event.data.id;
            //console.log(worker_id + ' # ' + callback + ' # ');
            self[callback](wid2, dataToProcess);
        }
    });
    worker_stack.push(newWorker);
}

function update_worker(worker_id) {
    run(worker_id);
}

function prepare() {
    for (var i = 0; i < (3.5) * nb_worker; i++) {
        DataStack.push({a: i});
    }
    for (var i = 0; i < nb_worker; i++) {
        createWorker(i);
    }
}
function run(worker_id) {
    var worker = worker_stack[worker_id];
    var item = DataStack.shift();
    if (item == undefined) {
        return;
    }
    worker.postMessage({channel: 'init', data: item});
    worker.postMessage({channel: 'run'});
}

function test() {
   prepare();
    for (var j = 0; j < nb_worker; j++) {
        run(j);
    }
    console.log(results);
}

setTimeout(function () {
    //test();
}, 2000);


