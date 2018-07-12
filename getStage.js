importScripts('lib.js', 'getFuelTanks.js');
var created = new Date();
// Generate 1 stage Rocket
var worker_id;
var fragment_id;
var Global_data = {};
var Global_status = 'run';

function autostop() {
    self.postMessage({channel: 'end', id: worker_id});
    var stopped = new Date();
    debug('worker ' + worker_id + ' stopped after ' + round((stopped - created) / 1000, 0) + "sec");
    close();
}

// Communication
self.addEventListener('message', function (e) {
    if (e.data.channel == 'stop') {
        Global_status = 'stop';
        autostop();
    }

    if (e.data.channel == 'init') {
        worker_id = e.data.id;
        Global_data = e.data.data;
        fragment_id = e.data.fragment_id;
        debug('worker ' + worker_id + ' init');
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
        if (Global_status == 'stop') {
            return null;
        }
        var engine = availableEngines[i];

        // Get Engine ISP / Thrust
        var caracts = getEngineCaract(engine);
        var curveData = getEngineCurveDateForAtm(caracts, 0);
        var ISP = curveData.ISP;
        var Thrust = curveData.Thrust;

        // Add decoupler mass
        var decoupler = {};
        decoupler = getDecoupler(cu.size);
        if(decoupler === null) {
            decoupler = {};
            decoupler.mass = {};
            decoupler.mass.full = 0;
            decoupler.name = '';
        }
        cu.mass = cu.mass + decoupler.mass.full;

        // Add commandModule if needed
        var command = {mass: 0, stack:[]};
        cu.mass = cu.mass + command.mass;

        // Prepare Masses values
        var MassEngineFull = engine.mass.full;
        var MassEngineDry = engine.mass.empty;
        var MstageDry = cu.mass + MassEngineDry + command.mass + decoupler.mass.full;
        var MstageFull = cu.mass + MassEngineFull + command.mass + decoupler.mass.full;

        // calculate Fuel mass for the needed for Dv
        var DvFactor = Math.exp(targetDv / (ISP * SOI.Go));
        var Mcarbu = (DvFactor - 1) * MstageDry;
        // Calcul of Mcarbu => OK ! Verified 10times

        var no_tank = false;
        
        // If Engine contain fuel ( Booster or TwinBoar )
        var EngineFuelMass = 0;
        if (MassEngineDry < MassEngineFull) {
            EngineFuelMass = MassEngineFull - MassEngineDry;
            Mcarbu -= EngineFuelMass;
            // If onboard fuel are suffisant
            if(Mcarbu < 0) {
                Mcarbu = 0;
                no_tank = true;
            }
        }
        
        // Manage solid Boosters
        if (engine.modes.SolidBooster) {
            if (Mcarbu > 0) {
                // not enough solid fuel in engine 
                continue;
            } else {
                // Booster get enougth dv
                no_tank = true;
            }
        }

        // Get Out engines where Mcarbu outrise twr
        if (!testTwr(Thrust, MstageFull + Mcarbu, twr, SOI.Go)) {
            continue;
        }
        
        var TankSolution = {};
        if (no_tank === false) {
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

            TankSolution = getFuelTankSolution(stageDataForTank);
            if (TankSolution === null) {
                continue;
            }
            //console.log('###########');
            //console.log(stageDataForTank);
            //console.log(TankSolution);
            //console.log('###########');
        } else {
            TankSolution.mFuel = 0;
            TankSolution.mDry = 0;
            TankSolution.solution = [];
        }

        // Make stage caracterics
        MstageFull = cu.mass + MassEngineFull + TankSolution.mFuel + TankSolution.mDry;
        MstageDry = cu.mass + MassEngineDry + TankSolution.mDry;
        var stageFuelMass = TankSolution.mFuel + EngineFuelMass;
        var TwrFull = Thrust / MstageFull / SOI.Go;
        var TwrDry = Thrust / MstageDry / SOI.Go;
        var burnDuration = stageFuelMass * ISP * SOI.Go / Thrust;
        var Dv = ISP * SOI.Go * Math.log(MstageFull / MstageDry);
        
        var stage = {
            decoupler: decoupler.name,
            commandModule: command.stack,
            tanks: TankSolution.solution,
            engine: engine.name,

            mcarbu: stageFuelMass,
            twr: {
                min: TwrFull,
                max: TwrDry
            },
            totalMass: MstageFull,
            burn: burnDuration,
            stageDv: Dv,
            targetDv: targetDv,

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
