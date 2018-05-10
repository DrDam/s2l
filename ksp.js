// Jquery
$(function () {

    //  Workers configuration
    var nbWorkers = 2;
    var workers = [];
    
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
        for (var i in workers) {
            workers[i].postMessage({channel: "stop"});
        }
    });

    // Binding start Button
    $('#param').submit(function (event) {

        if (resultTable === null) {
            $('#results').show();
            resultTable = $('#results').DataTable({
                paging: false,
                searching: false
            });
        }
        resultTable.clear();
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
        //rocket.desorbit = elems.retour.value;
        rocket.twr = {
            min: parseFloat(elems.Tmin.value),
            max: parseFloat(elems.Tmax.value)
        };

        var simu = {};
        simu.nbWorker = nbWorkers;

        var data = {
            SOI: SOI,
            rocket: rocket,
            cu: CU,
            simu: simu,
            engines: Engines
        };

        // create workers
        if (workers.length === 0) {
            var i = 0;
            while (i < nbWorkers) {
                w = new Worker("worker.js");
                workers.push(w);
                i++;
            }
        }

        // Run workers
        result_id = 0;
        for (var i in workers) {
            workers[i].postMessage({channel: "init", id: i, data: data});
            workers[i].postMessage({channel: "run"});
            workers[i].onmessage = function (e) {
                updateDom(e.data);
            };
        }
        return false;
    });

    // Add a row in table
    function updateDom(data) {
        result_id++;
        var mass = data.output.totalMass + 't';
        var stages = printStages(data.output.stages);
        resultTable.row.add([result_id, mass, stages]).draw();
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
