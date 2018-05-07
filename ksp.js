var Global = {}
Global.stop = false;
// Déclaration des fonctions

// Jquery
$(function() {
    // submit des valeurs
    var w;
    
    $('#stop').click(function() {
		w.postMessage({stop:true});
		w.terminate();
		w = undefined;
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

		if(typeof(Worker) !== "undefined") {
			if(typeof(w) == "undefined") {
				w = new Worker("worker.js");
				w.postMessage({id:1, start:10});
				console.log('message send to worker');
				w.onmessage = function(e) {
					document.getElementById("resultcount" + e.data.id).innerHTML = e.data.result;
				};
			}

		} else {
			document.getElementById("resultcount").innerHTML = "Sorry! No Web Worker support.";
		}

        return false;
    });

});
