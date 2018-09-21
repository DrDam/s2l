
var worker_id;
var Global_data = {};
var Global_status = 'run';

function autostop() {
    self.postMessage({channel: 'end', id: worker_id});
    Global_data = null;
    //close();
}

function killMe() {
    self.postMessage({channel: 'killMe', id: worker_id});
    Global_data = null;
    close();
}

// Communication
self.addEventListener('message', function (e) {
    if (e.data.channel == 'stop') {
        Global_status = 'stop';
        killMe();
    }

    if (e.data.channel == 'create') {
        worker_id = e.data.id;
        console.log(worker_id + ' # Create # ');
        return;
    }
    
    if (e.data.channel == 'init') {
        Global_data = e.data.data;
        console.log(worker_id + ' # init # ' + Global_data.a);
        return;
    }
    
    if (e.data.channel == 'run') {
        make_something();
        return;
    }
});


function make_something() {
    setTimeout(function(){
    //console.log('make_something for ' + Global_data.a);
    self.postMessage({channel:'output', id:worker_id, callback:'runLevel2', data:{out:Global_data.a}});
    autostop();

        //do what you need here
    }, 100);
}
