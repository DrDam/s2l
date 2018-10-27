importScripts('../lib/lib.js', 'getFuelTanks.js');
var startTime = new Date();

var worker_id;
var Global_data = {};
var Parts = {};
var Global_status = 'run';
var fragment_id = undefined;
if(DEBUG === undefined) {DEBUG = {};}

var Stacks = [];
var nbTanks = 0;
// Communication
self.addEventListener('message', function (e) {
    var inputs = e.data;
    
    if(inputs.channel == 'create') {
        DEBUG.setStatus(inputs.debug.status);
        DEBUG.setStart(inputs.debug.startTime);
        worker_id = inputs.id;
        Parts = inputs.parts;
        MaxTanks = inputs.nbTanks;
        DEBUG.send(worker_id + ' # created');
    }

    if (e.data.channel == 'run') {
        DEBUG.send(worker_id + ' # run');
        generateStacks();
        self.postMessage({channel:'result', stacks:Stacks});
    }
});

/**********************/
/** Generate Stacks **/
/********************/
function generateStacks() {
    for (var nbTanks = 1; nbTanks <= MaxTanks; nbTanks++) {
        //console.log('makeAssembly ' + nbTanks);
        self.postMessage({channel:'info', nb:nbTanks});
        makeAssembly(1, nbTanks);
    }
}

function makeAssembly(nbTanks = 1, localMaxTanks = 1, topSize = null, stack = {}) {
    for (var i in Parts) {

        var current = Parts[i];
        
        // Manage First Part of Stack
        if(topSize == null) {
            stack = {};
            stack.parts = [];
            stack.info = {};
            stack.info.mass = {};
            stack.info.mass.empty = 0;
            stack.info.mass.full = 0;
            stack.info.stackable = {};
            stack.info.stackable.top = current.stackable.top;
        }
        else {
            // if other part of stack, check assembly
            if (topSize !== current.stackable.top) { continue; }
        }
        
        // Manage fuelType
        if(current.ressources != undefined) {
            // First Stack part with fuel
            if(stack.info.ressources == undefined) {
                stack.info.ressources = getKeys(current.ressources);
            }
            else {
                // Check if part are correct fuel
                var currentContent = getKeys(current.ressources);
                var neededRessources = stack.info.ressources;
                if (!currentContent.equals(neededRessources)) {
                    continue;
                }
            }
        }
        
        // Manage TopSize
        var localStack = clone(stack);
        //localStack.parts.push({id: current.id, name: current.name});
        localStack.parts.push(current);
        localStack.info.mass.full += current.mass.full;
        localStack.info.mass.empty += current.mass.empty;    
        
        if(nbTanks == localMaxTanks) {
            localStack.info.stackable.bottom = current.stackable.bottom;
            Stacks.push(localStack);
            continue;
        }
        else {
            makeAssembly(nbTanks+1, localMaxTanks, current.stackable.bottom, localStack);
        }
    }
}

function getKeys(obj) {
    var keys = [];
    for (var key in obj) {
        keys.push(key);
    }
    return keys;
}