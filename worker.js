var id;
var data = {}
var timer;
var stopCalculation = false;

function autostop() {
    clearTimeout(timer);
    result = null
    timer = undefined;
    stopCalculation = true;
    console.log('woker ' + id + ' stop');
}

function round(number, precision = 2) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

// Communication
onmessage = function (e) {
    if (e.data.channel == 'stop') {
        autostop();
        return;
    }

    if (e.data.channel == 'init') {
        id = e.data.id;
        data = e.data.data;
        return;
    }
    if (e.data.channel == 'run') {
        stopCalculation = false;
        console.log('start woker ' + id);
        drawMeARocket();
        return;
    }
}

// Processing functions
function drawMeARocket() {
    //console.log(data);

    var output = {};

    // Case 1 : Generate monobloc rocket for specific Dv
    if (data.rocket.type == 'mono' && data.rocket.stages == 1) {
        // In this case, no need multiple worker
    var fragment_length = Math.ceil(data.engines.length / data.simu.nbWorker);
    var start = worker_id * fragment_length;
    var localengines = data.engines.slice(start, start + fragment_length);

    giveMeASingleStage(localengines, data.rocket.dv, data.rocket.twr, data.cu, data.SOI.kerbin);

    }

    return output;
}

function giveMeASingleStage(availableEngines, targetDv, twr, cu, SOI,) {

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
        }
        postMessage({output: output, id: id});
    }
}


