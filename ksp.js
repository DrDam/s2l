// Déclaration des fonctions

// Jquery
$(function() {

	// variable des workers
    var Workers = [];
    var NbWorkers = 4;
    var WokerCreated = false;

    
    $('#stop').click(function() {
		for(var i in Workers) {
			Workers[i].postMessage({channel:"stop"});
		}
	}) 
	
    
    $('#param').submit(function(event) {
        event.preventDefault();

		// récupération des valeurs
		var elems = event.currentTarget.elements;

		var CU = {};
		CU.mass = elems.Mu.value;
		CU.taille = elems.tailleCU.value;

		var rocket = {}
		rocket.dv = elems.DvCible.value;
		rocket.type = elems.type.value;
		rocket.desorbit = elems.retour.value;
		rocket.twr = [elems.Tmin.value, elems.Tmax.value];
		console.log(rocket);

		// create workers
		if(WokerCreated == false) {
			var i = 0;
			while(i < NbWorkers) {
				w = new Worker("worker.js");
				Workers.push(w);
				i++
			}
			WorkerCreated = true;
		}		
		
		// Run workers
		for(var i in Workers) {
			Workers[i].postMessage({channel:"init", id:i, start:10*i});
			Workers[i].postMessage({channel:"run"});
			Workers[i].onmessage = function(e) {
				document.getElementById("resultcount" + e.data.id).innerHTML = e.data.result;
			}
		}


        return false;
    });

});
