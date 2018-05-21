importScripts('lib.js');
// Generate 1 stage Rocket
var worker_id;
var fragment_id;
var Global_data = {};

function autostop() {
    debug('worker ' + worker_id + ' stop');
    postMessage({channel: 'end', id: worker_id});
}

// Communication
onmessage = function (e) {
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
};

// Processing functions
function drawMeARocket() {
    var fragment_length = Math.ceil(Global_data.engines.length / Global_data.simu.nbWorker);
    var start = fragment_id * fragment_length;
    var localengines = Global_data.engines.slice(start, start + fragment_length);

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

        // Get Tank configuration
        var stageData = {
            engine: engine,
            cu: cu,
            mCarbu: Mcarbu,
            targetDv: targetDv,
            thrust: Thrust,
            twr: twr,
            ISP: ISP,
            Go: SOI.Go
        };
        var TankSolution = getFuelTank(stageData);
        //console.log(TankSolution);

        // Correct Mass of Stage
        var MstageFull = cu.mass + MassEngineFull + TankSolution.mFuel + TankSolution.mDry;
        var MstageDry = cu.mass + MassEngineDry + TankSolution.mDry;
        
        if (!testTwr(Thrust, MstageFull, twr, SOI.Go)) {
            continue;
        }

        var TwrFull = Thrust / MstageFull / SOI.Go;
        var TwrDry = Thrust / MstageDry / SOI.Go;
        var burnDuration = TankSolution.mFuel * ISP * SOI.Go / Thrust;
        var Dv = ISP * SOI.Go * Math.log(MstageFull / MstageDry);
        var stage = {
            engine: engine.name,
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
        postMessage({channel: 'result', output: output, id: worker_id});
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

function getFuelTank(stageData) {

    /*
    console.log('#################');
    console.log('fuel need (t) : ' + stageData.mCarbu);
    */
    for (var i in stageData.engine.modes) {
        var EnginesNeeded = stageData.engine.modes[i][0].conso.proportions;
    }
    var cu_size = stageData.cu.size;
    var engine_size = stageData.engine.stackable.top;
    var Tanks = preSelectTanks(EnginesNeeded);

    var bestSolution = {};
    var bestOverflow = 999;

    var nbTanks;
    for (nbTanks = 1; nbTanks <= Global_data.simu.maxTanks; nbTanks++) {

        var last = false;
        if (nbTanks == 1) {
            last = true;
        }

        var localBest = getTankSolution(stageData.mCarbu, cu_size, engine_size, Tanks, last, nbTanks);
     /*   console.log('**************');
        console.log(localBest);
        console.log('**************');*/
        if(localBest == null) {
            continue;
        }
        // test solution againt best knowed
        if (localBest.overflow < bestOverflow && localBest.mFuel > stageData.mCarbu) {
            bestOverflow = localBest.overflow;
            bestSolution = localBest;
        }
    }
    
    return bestSolution;
}


function getTankSolution(Target, topSize, BottomSize, availableTanks, last = false, nbTanks = 1) {

    if (nbTanks == 1) {
        var bestOverflowSolution = {};
        var bestRestSolution = {};
        var bestOverflow = 999;
        var bestRest = 0;

        for (var i in availableTanks) {
            var tank = availableTanks[i];
            var fuelMass = tank.mass.full - tank.mass.empty;

            // If a tank exist with good top & bottom Size
            if (topSize == tank.stackable.top && BottomSize == tank.stackable.bottom) {
                var overflow = fuelMass - Target;

                // Tank provide exact amount of full or to much 
                if (overflow == 0) {
                    return {solution: [tank], overflow: overflow, top: tank.stackable.top, bottom: tank.stackable.bottom};
                }

                // Tank provide to much fuel
                if (overflow > 0) {
                    if (Target <= fuelMass && bestOverflow > overflow) {
                        bestOverflow = overflow;
                        bestOverflowSolution = {solution: [tank], mFuel: fuelMass, mDry: tank.mass.empty, overflow: overflow, top: tank.stackable.top, bottom: tank.stackable.bottom};
                    } else {
                        continue;
                    }
                }

                // Tank provide to less Fuel
                if (overflow < 0) {
                    if (bestRest > (-1 * overflow)) {
                        bestRest = -1 * overflow;
                        bestRestSolution = {solution: [tank], mFuel: fuelMass, mDry: tank.mass.empty, rest: bestRest, top: tank.stackable.top, bottom: tank.stackable.bottom};
                    }
                }
            } else {
                continue;
            }
        }


        if (last == false) {
            return (bestRest == 0) ? null : bestRestSolution;
        } else {
            return (bestOverflow == 0) ? null : bestOverflowSolution;
        }
        
        return null;

    }
    // find multi tank solution
    else {
        // Find SubSolution for N-1 tanks => as a rest
        var subSolution = getTankSolution(Target, topSize, BottomSize, availableTanks, false, nbTanks - 1);
        if(subSolution == null) {
            return null;
        }

        // Find last Tank of group => as a overflow
        var lastTank = getTankSolution(subSolution.rest, subSolution.top, subSolution.bottom, availableTanks, true, 1);
        if(lastTank == null) {
            return null;
        }

        // Return solution
        var solution = {};
        solution.solution = [];
        for (var i in subSolution.solution) {
            var subTank = subSolution.solution[i];
            solution.solution.push(subTank);
        }
        solution.solution.push(lastTank.solution[0]);
        solution.mfuel = lastTank.mfuel + subSolution.mfuel;
        solution.mDry = lastTank.mDry + subSolution.mDry;
        solution.overflow = lastTank.overflow - subSolution.rest;
        solution.top = subSolution.top;
        solution.bottom = lastTank.bottom;
        return solution;
    }
}



function preSelectTanks(EnginesNeeded) {
    var SelectedTanks = [];
    for (var i in Global_data.fuelTanks) {
        var tank = Global_data.fuelTanks[i];

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


