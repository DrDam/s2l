var id;
var data = {}
var timer;
var stopCalculation = false;

function autostop() {
    clearTimeout(timer);
    result = null
    timer = undefined;
    stopCalculation = true;
    console.log('woker '+id+' stop');
}

function round(number, precision = 2) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

// Communication
onmessage = function(e) {
	if(e.data.channel == 'stop') {
                autostop();
		return;
	}
	
	if(e.data.channel == 'init') {
            
		id = e.data.id;
		data = e.data.data;
                //console.log('woker '+id+' initialized');
		return;
	}
	if(e.data.channel == 'run')
	{
                stopCalculation = false;
		console.log('start woker '+id);
		run();
	}
	
}

// loop function
function run() {
	output = drawMeARocket(data);
	postMessage({output:output, id:id});
	
        if(stopCalculation === false ) {
            timer = setTimeout(run,100);
        } else {
            autostop();
        }
}

// Processing functions
function drawMeARocket(data) {
    console.log(data);
    
    var output = {};
    
    // Case 1 : Generate monobloc rocket for specific Dv
    if(data.rocket.type == 1) {
        // Share all engine between all workers
        var fragment_length = Math.ceil(data.engines.length / data.simu.nbWorker);
        var start = id * fragment_length;
        var localengines = data.engines.slice(start, start + fragment_length);
        var stage = giveMeASingleStage(localengines, data.rocket.dv, data.rocket.twr, data.cu, data.SOI.kerbin);
        output = {
            stages: [stage],
            totalMass: stage.totalMass,
            burn: stage.burn,
        }
        // Cut calculation in this case
        stopCalculation = true;
    }
    
    

    return output;
}

function giveMeASingleStage(availableEngines, targetDv, twr, cu, SOI) {
    
    var bestMass = null;
    var bestStage = {};
    for(var i in availableEngines) {
        var engine = availableEngines[i];

        var ISP = engine.ISP.vac;
        var Thrust = engine.Thrust.vac;
        var MassEngineFull = engine.Mass.full;
        var MassEngineDry = engine.Mass.empty;
        
        // calculate Fuel mass for the needed for Dv
        var MstageDry = cu.mass + MassEngineDry;
        
        var DvFactor = Math.exp(targetDv / (ISP * SOI.Go) );
        var Mcarbu = (DvFactor - 1) * MstageDry;
        
        // Add 1/9 fuel tank mass
        var MstageFull = cu.mass + MassEngineFull + Mcarbu * 10 /9 ;
        
        var TwrFull = Thrust / MstageFull / SOI.Go;
        var TwrDry = Thrust / MstageDry / SOI.Go;
        
        if(TwrFull < twr.min) {
            continue;
        }
        if(bestMass == null || MstageFull < bestMass) {
            
            var burnduration = Mcarbu * ISP * SOI.Go / Thrust;
            
            bestMass = MstageFull;
            bestStage = {
                engine: engine.name,
                mcarbu: round(Mcarbu),
                twr: {
                    min: round(TwrFull),
                    max: round(TwrDry)
                },
                totalMass: round(MstageFull,4),
                burn: round(burnduration,1),
            }
        }
    }
    return bestStage;  
}


