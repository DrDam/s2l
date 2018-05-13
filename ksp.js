// Jquery
$(function () {

    //  Workers configuration
    var nbWorkers = 2;
    var master;
    
    // Table initialisation
    var resultTable = null;
    var result_id = 0;
    
    // Prepare stage templating
    var stageTPL = null;
    $.get('stages.html.tpl', function (data) {
        stageTPL = data;
    }, 'text');

    // Binding Stop button
    $('#stop').click(function () {
        master.postMessage({channel: "stop"});
    });

    // Binding start Button
    $('#param').submit(function (event) {

        if (resultTable === null) {
            $('#results').show();
            resultTable = $('#results').DataTable({
                paging: false,
                searching: false,
                "language": {
                    "emptyTable": "No configuration found from your specifications"
                },
                "order": [[ 1, "asc" ]]
                
            });
        }
        resultTable.clear().draw();
        event.preventDefault();

        // Get form values
        var elems = event.currentTarget.elements;

        var SOI = {};
        SOI.kerbin = {Go: 9.81};

        var CU = {};
        CU.mass = parseFloat(elems.Mu.value);
        //CU.taille = elems.tailleCU.value;

        var rocket = {};
        rocket.dv = parseFloat(elems.DvCible.value);
        rocket.type = elems.type.value;
        rocket.stages = parseInt(elems.nbStage.value);
        //rocket.desorbit = elems.retour.value;
        rocket.twr = {
            min: parseFloat(elems.Tmin.value),
            max: parseFloat(elems.Tmax.value)
        };

        var simu = {};
        simu.nbWorker = nbWorkers;
        simu.step = 10;

        var data = {
            SOI: SOI,
            rocket: rocket,
            cu: CU,
            simu: simu,
            engines: Engines
        };

        // Run Calculation
        result_id = 0;
        master = new Worker('getRocket.js');
        master.postMessage({channel: "init", id: "master", data: data});
        master.postMessage({channel: "run"});
        master.onmessage = function (e) {
            var result = e.data;
            if(result.channel == 'result') {
                updateDom(e.data.output);
            }
            if(result.channel == 'end') {
                master.terminate();
                master = null;
            }
        };
        return false;
    });

    // Add a row in table
    function updateDom(data) {
        result_id++;
        var mass = data.totalMass;
        var dv = "xxx";
        var stages = printStages(data.stages);
        resultTable.row.add([result_id, mass, dv, stages]).draw();
    }

    function printStages(stages) {
        var output = '';
        for (var i in stages) {
            var stage = stages[i];
            stage.stage_id = i;
            var rendered = Mustache.render(stageTPL, stage);
            output += rendered;
        }

        return output;
    }
});
