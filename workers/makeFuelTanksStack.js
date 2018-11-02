importScripts('../lib/lib.js');
var startTime = new Date();

var worker_id;
var Parts = {};
var Global_status = 'run';

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
        DEBUG.send(worker_id + ' # Finished');
    }
});

/**********************/
/** Generate Stacks **/
/********************/
function generateStacks(topSize = null, stack = {}) {
    for(var i in Parts) {

        // select part
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
            stack.info.provider = {};
            stack.info.provider[current.provider] = current.provider;
        }
        else {
            // if other part of stack, check assembly
            if (topSize !== current.stackable.top) { 
                continue; 
            }
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

        // add Part to stack
        var localStack = clone(stack);
        localStack.parts.push({id: current.id, name: current.name, provider : current.provider});
        //localStack.parts.push(current);

        // add mass & provider to stack
        localStack.info.mass.full += current.mass.full;
        localStack.info.mass.empty += current.mass.empty;    
        localStack.info.provider[current.provider] = current.provider;

        // push stack
        localStack.info.stackable.bottom = current.stackable.bottom;
        Stacks.push(localStack);

        if(localStack.parts.length < MaxTanks) {
            generateStacks(current.stackable.bottom, localStack);
        }
    }
}
