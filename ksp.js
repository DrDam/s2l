// Jquery
$(function () {

    //  Workers configuration
    var NbWorkers = 4;
    var Workers = [];
    var resultTable = null;

    // Binding Stop button
    $('#stop').click(function () {
        for (var i in Workers) {
            Workers[i].postMessage({channel: "stop"});
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


        event.preventDefault();

        // Get form values
        var elems = event.currentTarget.elements;

        var CU = {};
        CU.mass = elems.Mu.value;
        //CU.taille = elems.tailleCU.value;

        var rocket = {};
        rocket.dv = elems.DvCible.value;
        //rocket.type = elems.type.value;
        //rocket.desorbit = elems.retour.value;
        rocket.twr = [elems.Tmin.value, elems.Tmax.value];

        var data = {
            rocket: rocket,
            cu: CU
        };

        // create workers
        if (Workers.length === 0) {
            var i = 0;
            while (i < NbWorkers) {
                w = new Worker("worker.js");
                Workers.push(w);
                i++;
            }
        }

        // Run workers
        var fragment_length = Math.ceil(Engines.length / NbWorkers);
        for (var i in Workers) {
            var start = i * fragment_length;
            var localengines = Engines.slice(start, start + fragment_length);
            data.engines = localengines;
            Workers[i].postMessage({channel: "init", id: i, data: data});
            Workers[i].postMessage({channel: "run"});
            Workers[i].onmessage = function (e) {
                updateDom(e.data);
            };
        }
        return false;
    });

    // Add a row in table
    function updateDom(data) {
        resultTable.row.add([data.id, data.output]).draw();
    }

});
