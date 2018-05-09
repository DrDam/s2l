// Jquery
$(function () {

    //  Workers configuration
    var NbWorkers = 4;
    var Workers = [];

    // Binding Stop button
    $('#stop').click(function () {
        for (var i in Workers) {
            Workers[i].postMessage({channel: "stop"});
        }
    });

    // Binding start Button
    $('#param').submit(function (event) {
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

        // create workers
        if (Workers.length == 0) {
            var i = 0;
            while (i < NbWorkers) {
                w = new Worker("worker.js");
                Workers.push(w);
                i++;
            }
        }

        // Run workers
        for (var i in Workers) {
            Workers[i].postMessage({channel: "init", id: i, start: 10 * i});
            Workers[i].postMessage({channel: "run"});
            Workers[i].onmessage = function (e) {
                updateDom(e.data);
            };
        }
        return false;
    });
    
    // Worker effects
    function updateDom(data) {
        $("#resultcount" + data.id).html(data.result);
    }

});
