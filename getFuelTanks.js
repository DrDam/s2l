function getFuelTankSolution(stageData) {

    var bestSolution = {};
    var bestOverflow = 999;

    for (var i in stageData.engine.modes) {
        var EnginesNeeded = stageData.engine.modes[i][0].conso.proportions;
    }
    var cu_size = stageData.cu.size;
    var engine_size = stageData.engine.stackable.top;
    var Tanks = preSelectTanks(EnginesNeeded);
    var targetSizes = {
        top: cu_size,
        bottom: engine_size
    };
    // 1) make all possible assembly
    var nbTanks;
    for (nbTanks = 1; nbTanks <= Global_data.simu.maxTanks; nbTanks++) {

        // Make a possible Assembly
        var localBest = getValideAssembly(stageData, targetSizes, Tanks, nbTanks);
        if(localBest != null) {
            //console.log(localBest);
            // 3) select best assembly => less OverFlow
            if (localBest.overflow < bestOverflow) {
                bestOverflow = localBest.overflow;
                bestSolution = localBest;
            }
        }
    }
    
    return (bestOverflow < 999) ? bestSolution : null;
}


function preSelectTanks(EnginesNeeded) {
    var SelectedTanks = [];
    for (var i in Global_data.parts.fuelTanks) {
        var tank = Global_data.parts.fuelTanks[i];

        // Filters tanks by ressources
        var tankContent = getRessourcesKey(tank.ressources);
        var neededRessources = getRessourcesKey(EnginesNeeded);
        if (!tankContent.equals(neededRessources)) {
            continue;
        }
        // No multi engine
        if(tank.id == 'Size4_EngineAdapter_01') {
            continue;
        }

        SelectedTanks.push(tank);
    }
    return SelectedTanks;
}

function getRessourcesKey(obj) {
    var keys = [];
    for (var key in obj) {
        keys.push(key);
    }
    return keys;
}

// Create a possible Assembly and validate it
function getValideAssembly(stageData, targetSizes, availableTanks, nbTanks = 1, stack = []) {
    var bestSolution = {};
    var bestOverflow = 999;

    for (var i in availableTanks) {
        var current = availableTanks[i];
        var localStack = clone(stack);
        localStack.push(current);
        var DvOverFlow = getStackOverflow(localStack, stageData);
 
        // If stack provide enought fuel
        if (DvOverFlow != null && bestOverflow > DvOverFlow) {
            var OrderedStack = organizeTanks(localStack, targetSizes.top, targetSizes.bottom);
            // No organisation found with or without adapters
            if(OrderedStack == null) {
                continue;
            }
            
            var composition = {};
            composition.solution = OrderedStack;
            composition.overflow = DvOverFlow;
            var stackdata = getStackMasses(OrderedStack);
            composition.mFuel = stackdata.Mcarbu;
            composition.mDry = stackdata.Mdry;

            bestSolution = composition;
            bestOverflow = DvOverFlow;

            // Test next tank
            continue;
        }

        if (nbTanks == 1) {
            // No other adition tank
            continue;
        }
        
        if(nbTanks > 1) {
            var subComposition = getValideAssembly(stageData, targetSizes, availableTanks, nbTanks-1, localStack);
            if(subComposition != null) {
                if(bestOverflow > subComposition.overflow) {
                bestSolution = subComposition;
                bestOverflow = subComposition.overflow;
                }
            }
        }
    }

    return (bestOverflow < 999) ? bestSolution : null;
}

function getStackOverflow(stack, stageData) {

    var stackData = getStackMasses(stack);

    // Prepare Masses values
    var MassEngineFull = stageData.engine.mass.full;
    var MassEngineDry = stageData.engine.mass.empty;
    var MstageDry = stageData.cu.mass + MassEngineDry + stackData.Mdry;
    var MstageFull = stageData.cu.mass + MassEngineFull + stackData.Mfull;

    // test Dv
    var Dv = stageData.ISP * stageData.Go * Math.log(MstageFull / MstageDry);
    if (Dv < stageData.targetDv) {
        return null;
    }

    // Test TWR
    if (!testTwr(stageData.thrust, MstageFull, stageData.twr, stageData.Go)) {
        return null;
    }

    // Return Dv Overflow
    return Dv - stageData.targetDv;
}

function getStackMasses(stack) {
    // Get Mass as 1 tank
    var Mfull = 0;
    var Mdry = 0;
    for (i in stack) {
        var tank = stack[i];
        Mfull += tank.mass.full;
        Mdry += tank.mass.empty;
    }
    return {Mdry: Mdry, Mfull: Mfull, Mcarbu: Mfull - Mdry};
}


function organizeTanks(stack, topSize, bottomSize) {

    var newStack = [];
 
    // prepare data
    var Tanks = [];
    for(var i in stack) {
        var Tank = {};
        Tank.id = i;
        Tank.top = stack[i].stackable.top;
        Tank.bottom = stack[i].stackable.bottom;
        Tanks.push(Tank);
    }
   
    // First Try, we try to have a "conique" launcher
    for(var i in Tanks) {
        var Tank = Tanks[i];
        if(transformSizeToOrder(Tank.top) < transformSizeToOrder(topSize)) {
            return null;
        }
        if(transformSizeToOrder(Tank.bottom) > transformSizeToOrder(bottomSize)) {
            return null;
        }
    }

    // Start
    var currentTop = topSize;
    var currentBottom = bottomSize;
    
    // We first try a "natural" sort
    do{
        var nbTanks = Tanks.length;
        for(var i in Tanks) {
            var Tank = Tanks[i];
            if(Tank.top == topSize) {
                newStack.push(stack[Tank.id]);
                currentTop = Tank.bottom;
                // This tank are sorted
                Tanks.splice(i, 1);
            }
        }
    }
    // We loop as long as a tank are sorted
    while(Tanks.length != nbTanks);

    // If it rest some tanks
    var list_tops = [];
    if(Tanks.length != 0) {
        for(var i in Tanks) {
            list_tops.push(Tanks[i].top)
        }
    }
    
    // All tank are sorted
    if(Tanks.length == 0) {
        // Find adapters to finalise stack
        if(currentTop != bottomSize) {

            var adapters = getAdapters(currentTop, bottomSize);
            if(adapters == null) {
                return null;
            }
            for(var i in adapters) {
                newStack.push(adapters[i]);
            }
        }
        return newStack;
    }

    return null;
}

function makeSubStack() {
    
}


function transformSizeToOrder(value) {
        for(var i in Global_data.sizes) {
          if(value == Global_data.sizes[i].id) {
            return i;
        }
    }
}

function getAdapters(topSize, bottomSize, null_if_not_found = false) {
    
    var adapters = [];
    var top = topSize;
    do {
        var nb_adapters = adapters.length;
        for(var i in Global_data.parts.adapters) {
            var adapter = Global_data.parts.adapters[i];
            if(adapter.stackable.top == top) {
                adapters.push(adapter);
                if(adapter.stackable.bottom == bottomSize) {
                    return adapters;
                }
                else {
                    top = adapter.stackable.bottom;
                    continue;
                }
            }
        }   
    }
    while(adapters.length != nb_adapters)

    //console.log([adapters, topSize, bottomSize]);
}

