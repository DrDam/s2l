// Jquery
$(function () {
    //  Workers configuration
    var nbWorkers = 2;
    var masters = [];
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
        for (var i in masters) {
            if(masters[i] != null) {
                masters[i].postMessage({channel: "stop"});
            }
        }
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

        var nbStage;
        result_id = 0;
        masters = [];
        // Create workers
        for (nbStage = 0; nbStage < data.rocket.stages; nbStage++) {
            var w = new Worker("getRocket.js");
            var master_id = "master-" + nbStage;
            masters[master_id] = w;
        }
        // Launch simulation for each stage
        var nbStages = 0;
        for (var id in masters) {
            var nbstages = nbStages + 1;
            var master_data = clone(data);
            master_data.rocket.stages = nbstages;

            masters[id].postMessage({channel: "init", id: id, data: master_data});
            masters[id].postMessage({channel: "run"});
            masters[id].onmessage = function (e) {
                var result = e.data;
                if (result.channel == 'result') {
                    updateDom(e.data.output);
                }
                if (result.channel == 'end') {
                    var id_to_kill = result.id;
                    debug('kill ' + id_to_kill);
                    masters[id_to_kill].terminate();
                    masters[id_to_kill] = null;
                }
            };
            nbStages++;
        }
        return false;
    });

    // Add a row in table
    function updateDom(data) {
      /* debug('###################');
       debug(data);
       debug('###################');*/
        result_id++;
        var mass = data.totalMass;
        var nbStages = data.nbStages;
        var dv = "xxx";
        var stages = printStages(data.stages);
        resultTable.row.add([result_id, nbStages, mass, dv, stages]).draw();
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
