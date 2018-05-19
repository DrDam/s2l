// Jquery
(function ($) {
    $(document).ready(function () {

        // Desactivate action button if Engine & FuelTanks are no loaded
        $('.action_button').each(function () {
            $(this).prop('disabled', true);
        });

        // Fuel Classification
        var FuelTypes = {};
        FuelTypes.LFO = 'Liquid Fuel and Oxydizer';
        FuelTypes.LF = 'LiquidFuel';
        FuelTypes.SF = 'SolidFuel';
        FuelTypes.O = 'Oxydizer';
        FuelTypes.M = 'MonoPropellant';
        FuelTypes.X = 'XenonGas';

        // Data from collections
        var Engines = [];
        var FuelTank = [];
        var validationData = [];

        // Reactivate action button when the two collection are loaded
        var loadCollectionValidation = function (type) {
            validationData.push(type);
            if (validationData.length == 2) {
                $('.action_button').each(function () {
                    $(this).prop('disabled', false);
                });
            }
        }

        // Load Engines
        $.ajax({
            url: "http://kspapi.drdamlab.net/collection/engines",
        }).done(function (data) {
            for (var id in data.engines) {
                var engine = data.engines[id];
                var modes = engine.modes;
                for (var mode_id in modes) {
                    // delete all Jet engines & modes
                    if (mode_id == 'Turbine') {
                        delete modes[mode_id];
                    }
                }
                if (Object.keys(modes).length > 0) {
                    engine.id = id;
                    Engines.push(engine);
                }
            }
            loadCollectionValidation('engines');
        });

        // Load fuelTanks
        $.ajax({
            url: "http://kspapi.drdamlab.net/collection/fuelTanks",
        }).done(function (data) {
            for (var id in data.fuelTanks) {
                var tank = data.fuelTanks[id];
                tank.id = id;
                FuelTank.push(tank);
            }
            loadCollectionValidation('fuelTanks');
        });


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
                if (masters[i] != null) {
                    masters[i].postMessage({channel: "stop"});
                }
            }
            $('#stop').prop('disabled', true);
            $('#start').prop('disabled', false);
        });

        // Binding start Button
        $('#param').submit(function (event) {

            $('#start').prop('disabled', true);
            $('#stop').prop('disabled', false);

            if (resultTable === null) {
                $('#results').show();
                resultTable = $('#results').DataTable({
                    paging: false,
                    searching: false,
                    "language": {
                        "emptyTable": "No configuration found from your specifications"
                    },
                    "order": [[2, "asc"]]
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
                engines: Engines,
                fuelTanks: FuelTank,
                FuelTypes: FuelTypes,
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
                        var terminated = true;
                        for(var i in masters) {
                            if(masters[i] != null) {
                                terminated = false;
                            }
                        }
                        if(terminated == true){
                            console.log('END Calculations');
                            $('#stop').prop('disabled', true);
                            $('#start').prop('disabled', false);
                        }
                        
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
})(jQuery);
