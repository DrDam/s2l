
var results = [];

function runLevel2(worker_id, level2_data) {
    var output = level2_data.out;
    console.log(worker_id + ' # result # ' + output);
    results.push({id:output, worker:worker_id});
}



var nb_worker = 40;

    var worker_stack = [];
    for (var i = 0; i < nb_worker; i++) {
        createWorker(i);
    }

    var DataStack = [
        {a: 1},
        {a: 2},
        {a: 3},
        {a: 4},
        {a: 5},
        {a: 6},
        {a: 7},
        {a: 8},
        {a: 9},
        {a: 10},
        {a: 11},
        {a: 12},
        {a: 13},
        {a: 14},
        {a: 15},
        {a: 16},
        {a: 17},
        {a: 18},
        {a: 19},
        {a: 20},
        {a: 21},
        {a: 22},
        {a: 23},
        {a: 24},
        {a: 25},
        {a: 26},
        {a: 27},
        {a: 28},
        {a: 29},
        {a: 30},
        {a: 31},
        {a: 32},
        {a: 33},
        {a: 34},
        {a: 35},
        {a: 36},
        {a: 37},
        {a: 38},
        {a: 39},
        {a: 40},
        {a: 41},
        {a: 42},
        {a: 43},
        {a: 44},
        {a: 45},
        {a: 46},
        {a: 47},
        {a: 48},
        {a: 49},
        {a: 50},
        {a: 51},
        {a: 52},
        {a: 53},
        {a: 54},
        {a: 55},
        {a: 56},
        {a: 57},
        {a: 58},
        {a: 59},        
        {a: 60},
        {a: 61},
        {a: 62},
        {a: 63},
        {a: 64},
        {a: 65},
        {a: 66},
        {a: 67},
        {a: 68},
        {a: 69},         
    ];




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

    function run(worker_id) {
        var worker = worker_stack[worker_id];
        var item = DataStack.shift();
        if (item == undefined) {
            return;
        }
        worker.postMessage({channel: 'init', data: item});
        worker.postMessage({channel: 'run'});
    }

setTimeout(function () {

    for (var j = 0; j < nb_worker; j++) {
        //run(j);
    }
    //console.log(results);
}, 2000);


