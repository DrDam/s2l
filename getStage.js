importScripts('lib.js');
// Generate 1 stage Rocket
var worker_id;
var fragment_id;
var Global_data = {};

function autostop() {
    debug('worker ' + worker_id + ' stop');
    self.postMessage({channel: 'end', id: worker_id});
}

// Communication
self.addEventListener('message',function(e){
    if (e.data.channel == 'stop') {
        autostop();
        return;
    }

    if (e.data.channel == 'init') {
        worker_id = e.data.id;
        Global_data = e.data.data;
        fragment_id = e.data.fragment_id;
        return;
    }
    if (e.data.channel == 'run') {
        debug('start woker ' + worker_id);
        drawMeARocket();
        return;
    }
});

// Processing functions
function drawMeARocket() {
    var fragment_length = Math.ceil(Global_data.parts.engines.length / Global_data.simu.nbWorker);
    var start = fragment_id * fragment_length;
    var localengines = Global_data.parts.engines.slice(start, start + fragment_length);

    giveMeASingleStage(localengines, Global_data.rocket.dv, Global_data.rocket.twr, Global_data.cu, Global_data.SOI.kerbin);
    autostop();
}

function giveMeASingleStage(availableEngines, targetDv, twr, cu, SOI) {

    //availableEngines = [availableEngines[8]];
    for (var i in availableEngines) {
        var engine = availableEngines[i];

        // Get Engine ISP / Thrust
        var caracts = getEngineCaract(engine);
        var curveData = getEngineCurveDateForAtm(caracts, 0);
        var ISP = curveData.ISP;
        var Thrust = curveData.Thrust;

        // Prepare Masses values
        var MassEngineFull = engine.mass.full;
        var MassEngineDry = engine.mass.empty;
        var MstageDry = cu.mass + MassEngineDry;
        var MstageFull = cu.mass + MassEngineFull;

        // calculate Fuel mass for the needed for Dv
        var DvFactor = Math.exp(targetDv / (ISP * SOI.Go));
        var Mcarbu = (DvFactor - 1) * MstageDry;
        // Calcul of Mcarbu => OK ! Verified 10times
        
        // If Engine contain fuel ( Booster or TwinBoar
        if (MassEngineDry < MassEngineFull) {
            Mcarbu -= (MassEngineFull - MassEngineDry);
        }

        // Manage solid Boosters
        if (engine.modes.SolidBooster) {
            if (Mcarbu > 0) {
                // not enough solid fuel in engine 
                continue;
            } else {
                // it's a viable option
            }
        }

        var decoupler = getDecoupler(cu.size);

        // Get Tank configuration
        var stageData = {
            // Engine informations
            engine: engine,
            ISP: ISP,
            thrust: Thrust,
            
            // decoupler
            decoupler: decoupler,
            Mdecoupler: decoupler.mass.full,
            // Performance Target
            cu: cu,
            targetDv: targetDv,

            // Constraints
            twr: twr,
            Go: SOI.Go
        };
        //console.log('###########');
        var TankSolution = getFuelTankSolution(stageData);
        //console.log(TankSolution);
        //console.log('###########');

        // Correct Mass of Stage
        var MstageFull = cu.mass + decoupler.mass.full + MassEngineFull + TankSolution.mFuel + TankSolution.mDry;
        var MstageDry = cu.mass + decoupler.mass.full + MassEngineDry + TankSolution.mDry;
        
        if (!testTwr(Thrust, MstageFull, twr, SOI.Go)) {
            continue;
        }

        var TwrFull = Thrust / MstageFull / SOI.Go;
        var TwrDry = Thrust / MstageDry / SOI.Go;
        var burnDuration = TankSolution.mFuel * ISP * SOI.Go / Thrust;
        var Dv = ISP * SOI.Go * Math.log(MstageFull / MstageDry);
        var stage = {
            engine: engine.name,
            decoupler: decoupler.name,
            mcarbu: round(TankSolution.mFuel,4),
            twr: {
                min: round(TwrFull),
                max: round(TwrDry)
            },
            totalMass: round(MstageFull, 4),
            burn: round(burnDuration, 1),
            tanks: TankSolution.solution,
            stageDv: Dv,
        };
        var output = {
            stages: [stage],
            totalMass: stage.totalMass,
            burn: stage.burn,
            stageDv: Dv,
            nbStages: 1
        };
        self.postMessage({channel: 'result', output: output, id: worker_id});
    }
}

function getEngineCaract(engine) {
    var modes = engine.modes;
    for (var mode_id in modes) {
        return modes[mode_id][0];
    }
}

function getEngineCurveDateForAtm(engineCaracts, AtmPressur) {
    var curve = engineCaracts.curve;
    for (var point_id in curve) {
        var point = curve[point_id];
        if (point.atmo == AtmPressur) {
            return point;
        }
    }
}

function testTwr(Thrust, Mass, target, Go) {
    var Twr = Thrust / Mass / Go;
    return(Twr > target.min && Twr < target.max);
}


function getFuelTankSolution(stageData) {
    
    var bestSolution = {};
    var bestOverflow = 999;
    
    for (var i in stageData.engine.modes) {
        var EnginesNeeded = stageData.engine.modes[i][0].conso.proportions;
    }
    var cu_size = stageData.cu.size;
    var engine_size = stageData.engine.stackable.top;
    var Tanks = preSelectTanks(EnginesNeeded);

    // 1) make all possible assembly
    var nbTanks;
    for (nbTanks = 1; nbTanks <= Global_data.simu.maxTanks; nbTanks++) {
        
        // Make a possible Assembly
        var localBest = getValideAssembly(stageData, cu_size, engine_size, Tanks, nbTanks);
        if(localBest != null) {
            //console.log(localBest);
            // 3) select best assembly => less OverFlow
            if (localBest.overflow < bestOverflow) {
                bestOverflow = localBest.overflow;
                bestSolution = localBest;
            }
        }

    }
    
    return bestSolution;
}


// Create a possible Assembly and validate it
function getValideAssembly(stageData, cu_size, engine_size, availableTanks, nbTanks = 1, stack = []) {
    var bestSolution = {};
    var bestOverflow = 999;
    
    for (var i in availableTanks) {
        var current = availableTanks[i];
        
        // validate construction (adaptators or respect size) 
        if (cu_size == current.stackable.top && engine_size == current.stackable.bottom) {
            var localStack = clone(stack);
            localStack.push(current);
            
            var DvOverFlow = getStackOverflow(localStack, stageData);
            if( DvOverFlow != null) {
                var output = {};
                output.solution = localStack;
                output.overflow = DvOverFlow;
                var stackdata = getStackMasses(localStack);
                output.mFuel = stackdata.Mcarbu;
                output.mDry = stackdata.Mdry;
                return output;
            }
            
            if(nbTanks == 1) {
                // No other adition tank
                continue;
            };
            
            if(nbTanks > 1) {
                var subComposition = getValideAssembly(stageData, current.stackable.bottom, engine_size, availableTanks, nbTanks-1, localStack);
                if(subComposition != null) {
                    if(bestOverflow > subComposition.overflow) {
                        bestSolution = subComposition;
                        bestOverflow = subComposition.overflow;
                    }
                }
            }
        }
    }

    if(bestOverflow < 999) {
        return bestSolution;
    }
    return null;
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
    return {Mdry: Mdry, Mfull:Mfull, Mcarbu:Mfull-Mdry};
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
    if(Dv < stageData.targetDv) {
        return null;
    }
    
    // Test TWR
    if (!testTwr(stageData.thrust, MstageFull, stageData.twr, stageData.Go)) {
        return null;
    }
    
    // Return Dv Overflow
    return Dv - stageData.targetDv;
}


function preSelectTanks(EnginesNeeded) {
    var SelectedTanks = [];
    for (var i in Global_data.parts.fuelTanks) {
        var tank = Global_data.parts.fuelTanks[i];

        // Filters tanks by ressources
        var tankContent = getRessourcesKey(tank.ressources)
        var neededRessources = getRessourcesKey(EnginesNeeded);
        if (!tankContent.equals(neededRessources)) {
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

function getDecoupler(size) {
    for (var i in Global_data.parts.decouplers) {
        var decoupler = Global_data.parts.decouplers[i];

        if(decoupler.stackable.top == size && decoupler.isOmniDecoupler == false) {
            return decoupler;
        }
    }
}

