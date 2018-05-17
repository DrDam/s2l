importScripts('lib.js');  
// Generate 1 stage Rocket
var worker_id;
var fragment_id;
var data = {}

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
        data = e.data.data;
        fragment_id = e.data.fragment_id;
        return;
    }
    if (e.data.channel == 'run') {
        debug('start woker ' + worker_id);
        drawMeARocket();
        return;
    }
}

// Processing functions
function drawMeARocket() {
    var fragment_length = Math.ceil(data.engines.length / data.simu.nbWorker);
    var start = fragment_id * fragment_length;
    var localengines = data.engines.slice(start, start + fragment_length);

    giveMeASingleStage(localengines, data.rocket.dv, data.rocket.twr, data.cu, data.SOI.kerbin);
    autostop();
}

function giveMeASingleStage(availableEngines, targetDv, twr, cu, SOI) {

    for (var i in availableEngines) {
        var engine = availableEngines[i];

        var ISP = engine.ISP.vac;
        var Thrust = engine.Thrust.vac;
        var MassEngineFull = engine.Mass.full;
        var MassEngineDry = engine.Mass.empty;

        // calculate Fuel mass for the needed for Dv
        var MstageDry = cu.mass + MassEngineDry;

        var DvFactor = Math.exp(targetDv / (ISP * SOI.Go));
        var Mcarbu = (DvFactor - 1) * MstageDry;

        // Add 1/9 fuel tank mass
        var MstageFull = cu.mass + MassEngineFull + Mcarbu * 10 / 9;

        var TwrFull = Thrust / MstageFull / SOI.Go;
        var TwrDry = Thrust / MstageDry / SOI.Go;

        if (TwrFull < twr.min || TwrFull > twr.max) {
            continue;
        }
        var burnDuration = Mcarbu * ISP * SOI.Go / Thrust;
        var stage = {
            engine: engine.name,
            mcarbu: round(Mcarbu),
            twr: {
                min: round(TwrFull),
                max: round(TwrDry)
            },
            totalMass: round(MstageFull, 4),
            burn: round(burnDuration, 1),
        }
        var output = {
            stages: [stage],
            totalMass: stage.totalMass,
            burn: stage.burn,
            dv: targetDv,
            nbStages: 1,
        };
        postMessage({channel: 'result', output: output, id: worker_id});
    }
}


