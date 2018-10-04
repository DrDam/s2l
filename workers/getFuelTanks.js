/********************/
/** Tank selection **/
/********************/

function getFuelTankSolution(stageData) {
    if (Global_status == 'stop') {
        return null;
    }
    
    var bestSolution = {};
    var bestOverflow = 999;
    var EnginesNeeded = stageData.engine.caract.conso.proportions;
    var cu_size = stageData.cu.size;
    var engine_size = stageData.engine.stackable.top;
    var Tanks = preSelectTanks(EnginesNeeded);
    var Adapters = Global_data.parts.adapters;
    var localparts = mergeArray(Tanks, Adapters);

    var targetSizes = {
        top: cu_size,
        bottom: engine_size
    };
    // 1) make all possible assembly
    var nbTanks;
    for (nbTanks = 1; nbTanks <= Global_data.simu.maxTanks; nbTanks++) {
        if (Global_status == 'stop') {
            return null;
        }
        // Make a possible Assembly
        var localBest = getValideAssembly(stageData, targetSizes, localparts, nbTanks);
        if (localBest !== null) {
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
        if (Global_status == 'stop') {
            return null;
        }
        var tank = Global_data.parts.fuelTanks[i];

        // Filters tanks by ressources
        var tankContent = getRessourcesKey(tank.ressources);
        var neededRessources = getRessourcesKey(EnginesNeeded);
        if (!tankContent.equals(neededRessources)) {
            continue;
        }
        // No multi engine
        if (tank.id == 'Size4_EngineAdapter_01') {
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
function getValideAssembly(stageData, targetSizes, localParts, nbTanks = 1, stack = []) {
    var bestSolution = {};
    var bestOverflow = 999;

    for (var i in localParts) {
        if (Global_status == 'stop') {
            return null;
        }
        var current = localParts[i];

        // Test if part go on top
        if (targetSizes.top === current.stackable.top) {

            var localStack = clone(stack);
            localStack.push(current);
            var DvOverFlow = getStackOverflow(localStack, stageData);

            // If stack provide enought fuel
            if (DvOverFlow !== null && bestOverflow > DvOverFlow) {

                // If bottom not feat with engine
                if (targetSizes.bottom !== current.stackable.bottom) {
                    var finished = false;
                    // Find a adapter
                    for (var j in Global_data.parts.adapters) {
                        if (Global_status == 'stop') {
                            return null;
                        }
                        var adapter = Global_data.parts.adapters[j];

                        // Adapter must feat with engin size
                        if (targetSizes.bottom === adapter.stackable.bottom &&
                                // Adapter must feat with bottom of last part
                                current.stackable.bottom === adapter.stackable.top)
                        {
                            // Restest overflow
                            var testStack = clone(localStack);
                            testStack.push(adapter);
                            var TestDvOverFlow = getStackOverflow(testStack, stageData);
                            // If adapter kill best stage => next
                            if (!(DvOverFlow !== null && bestOverflow > TestDvOverFlow)) {
                                continue;
                            } else {
                                // If adapter don't change best
                                localStack.push(adapter);
                                DvOverFlow = TestDvOverFlow;
                                finished = true;
                            }

                        } else {
                            continue;
                        }
                    }

                    // If we not found correct adapter, next tank
                    if (finished !== true) {
                        continue;
                    }
                }

                var composition = {};
                composition.solution = localStack;
                composition.overflow = DvOverFlow;
                var stackdata = getStackMasses(localStack);
                composition.mFuel = stackdata.Mcarbu;
                composition.mDry = stackdata.Mdry;

                bestSolution = composition;
                bestOverflow = DvOverFlow;

                // Test next tank
                continue;
            }

            if (nbTanks === 1) {
                // No other adition tank
                continue;
            }

            if (nbTanks > 1) {
                var Sizes = clone(targetSizes);
                Sizes.top = current.stackable.bottom;
                var subComposition = getValideAssembly(stageData, Sizes, localParts, nbTanks - 1, localStack);
                if (subComposition !== null) {
                    if (bestOverflow > subComposition.overflow) {
                        bestSolution = subComposition;
                        bestOverflow = subComposition.overflow;
                    }
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
    for (var i in stack) {
        var tank = stack[i];
        Mfull += tank.mass.full;
        Mdry += tank.mass.empty;
    }
    return {Mdry: Mdry, Mfull: Mfull, Mcarbu: Mfull - Mdry};
}
