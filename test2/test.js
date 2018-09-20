
var nb_worker = 5;
// Provide Src Datas
var DataStack = [];
var Results = [];
console.log(Results);

function test2_process() {
    
    var Data = {};
    Data.nb_worker = nb_worker;
    var master = new Worker('worker1.js');
    master.postMessage({channel: 'create', id: 'master'});
    master.postMessage({channel: 'init', data: Data});
    master.addEventListener('message', function (event) {
        var channel = event.data.channel;
        if(channel == 'wait') {
            // If Master end all is processing, kill it
            master.postMessage({channel:'stop'})
        }
        if(channel == 'output') {
            // make something
            var master_result = event.data.result;
            Results.push(master_result);
        }
    });
    master.postMessage({channel:'run'});
}


setTimeout(function () {
    test2_process();
}, 2000);







