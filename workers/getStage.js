importScripts('../lib/lib.js', 'getFuelTanks.js');
var startTime = new Date();
// Generate 1 stage Rocket
var worker_id;
var Global_data = {};
var Global_status = 'run';
if(DEBUG === undefined) {DEBUG = {};}
function autostop() {
    self.postMessage({channel: 'wait', id: worker_id});
    var stopped = new Date();
    Global_data = null;
    DEBUG.send(worker_id + ' # wait # ' + round((stopped - startTime) / 1000, 0) + "sec running");
}

function killMe() {
    DEBUG.send(worker_id + ' # killMe');
    self.postMessage({channel: 'killMe', id: worker_id});
    Global_data = null;
    close();
}

// Communication
self.addEventListener('message', function (e) {
    var inputs = e.data;
    if (inputs.channel == 'stop') {
        Global_status = 'stop';
        DEBUG.send(worker_id + ' # to stop');
        killMe();
    }
    
    if(inputs.channel == 'create') {
        DEBUG.setStatus(inputs.debug.status);
        DEBUG.setStart(inputs.debug.startTime);
        worker_id = inputs.id;
        DEBUG.send(worker_id + ' # created');
    }

    if (inputs.channel == 'init') {
        Global_data = inputs.data;
        startTime = new Date();
        DEBUG.send(worker_id + ' # init');
        return;
    }
    if (e.data.channel == 'run') {
        DEBUG.send(worker_id + ' # run');
        drawMeARocket();
        return;
    }
});

// Processing functions
function drawMeARocket() {
    giveMeASingleStage(Global_data.parts.engines, Global_data.rocket.dv, Global_data.rocket.twr, Global_data.cu, Global_data.SOI.kerbin);
    setTimeout(function(){ autostop(); }, 10);
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
        self.postMessage({channel: 'result', output: output, id: worker_id, data:Global_data});
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