importScripts('lib.js', 'getFuelTanks.js');
var created = new Date();
// Generate 1 stage Rocket
var worker_id;
var fragment_id;
var Global_data = {};
var Global_status = 'run';

function autostop() {
    debug('worker ' + worker_id + ' stop');
    self.postMessage({channel: 'end', id: worker_id});
}

// Communication
self.addEventListener('message', function (e) {
    if (e.data.channel == 'stop') {
        Global_status = 'stop';
        autostop();
        var stoped = new Date();
        debug('worker ' + worker_id + ' stoped after ' + round((stoped - created) / 1000,0) + "sec");
        close();
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
        if(Global_status == 'stop') {return null;}
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

        // Add decoupler mass
        var decoupler = getDecoupler(cu.size);
        var decouplerMass = (decoupler == null) ? 0 : decoupler.mass.full;
        cu.mass = cu.mass + decouplerMass;

        // Add commandModule if needed
        var command = {mass : 0};
        var commandMass = (decoupler == null) ? 0 : command.mass;
        cu.mass = cu.mass + commandMass;

        // Get Tank configuration
        var stageDataForTank = {
            // Engine informations
            engine: engine,
            ISP: ISP,
            thrust: Thrust,

            // Performance Target
            cu: cu,
            targetDv: targetDv,

            // Constraints
            twr: twr,
            Go: SOI.Go
        };

        //console.log('###########');
        var TankSolution = getFuelTankSolution(stageDataForTank);
        if(TankSolution == null) {
            continue;
        }
        //console.log(TankSolution);
        //console.log('###########');

        // Make stage caracterics
        MstageFull = cu.mass + MassEngineFull + TankSolution.mFuel + TankSolution.mDry;
        MstageDry = cu.mass + MassEngineDry + TankSolution.mDry;

        var TwrFull = Thrust / MstageFull / SOI.Go;
        var TwrDry = Thrust / MstageDry / SOI.Go;
        var burnDuration = TankSolution.mFuel * ISP * SOI.Go / Thrust;
        var Dv = ISP * SOI.Go * Math.log(MstageFull / MstageDry);

        var stage = {
            decoupler: decoupler.name,
            commandModule: command,
            tanks: TankSolution.solution,
            engine: engine.name,
            
            mcarbu: round(TankSolution.mFuel, 4),
            twr: {
                min: round(TwrFull),
                max: round(TwrDry)
            },
            totalMass: round(MstageFull, 4),
            burn: round(burnDuration, 1),
            stageDv: Dv
            
        };
        var output = {
            stages: [stage],
            totalMass: stage.totalMass,
            burn: stage.burn,
            stageDv: Dv,
            nbStages: 1,
            size: engine.stackable.bottom
        };
        self.postMessage({channel: 'result', output: output, id: worker_id});
    }
}

function getDecoupler(size) {
    for (var i in Global_data.parts.decouplers) {
        var decoupler = Global_data.parts.decouplers[i];
        if (decoupler.stackable.top == size && decoupler.isOmniDecoupler === false) {
            return decoupler;
        }
    }
    return null;
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
