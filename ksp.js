// Jquery
(function ($) {
    $(document).ready(function () {

        // toggle information block
        $("#readme_button").click(function () {
            $("#readme").toggle("slow", function () {});
        });

        // toggle advanced configuration
        $("#advanced_button").click(function (event) {
            event.preventDefault();
            $("#advanced").toggle("slow", function () {});
            return false;
        });

        // Desactivate action button if Engine & FuelTanks are no loaded
        $('.action_button').each(function () {
            $(this).prop('disabled', true);
        });

        // Data from collections
        var Parts = {};
        Parts.engines = [];
        Parts.fuelTanks = [];
        Parts.decouplers = [];
        Parts.adapters = [];
        var validationData = [];

        // Fuel Classification
        var FuelTypes = {};
        FuelTypes.LFO = 'Liquid Fuel and Oxydizer';
        FuelTypes.LF = 'LiquidFuel';
        FuelTypes.SF = 'SolidFuel';
        FuelTypes.O = 'Oxydizer';
        FuelTypes.M = 'MonoPropellant';
        FuelTypes.X = 'XenonGas';

        // Reactivate action button when the two collection are loaded
        var loadCollectionValidation = function (type) {
            validationData.push(type);
            if (validationData.length == 4) {
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
                if (engine.is_radial === true) {
                    continue;
                }
                if (Object.keys(modes).length > 0) {
                    engine.id = id;
                    Parts.engines.push(engine);
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
                Parts.fuelTanks.push(tank);
            }
            loadCollectionValidation('fuelTanks');
        });
        
        // Load Decouplers
        $.ajax({
            url: "http://kspapi.drdamlab.net/collection/decouplers",
        }).done(function (data) {
            for (var id in data.decouplers) {
                var decoupler = data.decouplers[id];
                decoupler.id = id;
                Parts.decouplers.push(decoupler);
            }
            loadCollectionValidation('decouplers');
        });
        
        // Load Adapters
        $.ajax({
            url: "http://kspapi.drdamlab.net/collection/adapters",
        }).done(function (data) {
            for (var id in data.adapters) {
                var adapter = data.adapters[id];
                adapter.id = id;
                Parts.adapters.push(adapter);
            }
            loadCollectionValidation('adapters');
        });


        //  Workers configuration
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
            event.preventDefault();
            $('#start').prop('disabled', true);
            $('#stop').prop('disabled', false);

            if (resultTable === null) {
                $('#results').show();
                resultTable = $('#results').DataTable({
                    paging: false,
                    searching: false,
                    language: {
                        emptyTable: "No configuration found from your specifications"
                    },
                    order: [[2, "asc"]],
                    columnDefs: [
                        { width: 50, targets: 0 },
                        { width: 100, targets: [1] }    ,
                        { width: 200, targets: [2,3] }                       
                          
                    ],
        fixedColumns: true
                });
            }
            resultTable.clear().draw();

            // Get form values
            var elems = event.currentTarget.elements;

            var SOI = {};
            SOI.kerbin = {Go: 9.81};

            var CU = {};
            CU.mass = parseFloat(elems.Mu.value);
            CU.size = elems.sizeCU.value;

            var rocket = {};
            rocket.dv = parseFloat(elems.DvCible.value);
            rocket.type = elems.type.value;
            rocket.stages = parseInt(elems.nbStage.value);
            rocket.twr = {
                min: parseFloat(elems.Tmin.value),
                max: parseFloat(elems.Tmax.value)
            };

            var nbWorkers = parseInt(elems.nbworker.value);

            var simu = {};
            simu.nbWorker = nbWorkers;
            simu.step = parseInt(elems.Step.value);
            simu.maxTanks = parseInt(elems.nbTanks.value);

            var data = {
                SOI: SOI,
                rocket: rocket,
                cu: CU,
                simu: simu,
                parts: Parts,
                fuelTypes: FuelTypes,
            };

            debug('###################');
            debug('input data');
            debug(data);
            debug('###################');

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
                masters[id].addEventListener('message',function(e){		
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
                        for (var i in masters) {
                            if (masters[i] != null) {
                                terminated = false;
                            }
                        }
                        if (terminated == true) {
                            console.log('END Calculations');
                            $('#stop').prop('disabled', true);
                            $('#start').prop('disabled', false);
                        }

                    }
                });
                nbStages++;
            }
            $('html, body').animate({
                scrollTop: $("#results").offset().top
            }, 1000);
            return false;
        });

        // Add a row in table
        function updateDom(data) {
            debug('###################');
            debug('output to table');
            debug(data);
            debug('###################');
            result_id++;
            var mass = data.totalMass;
            var nbStages = data.nbStages;
            var dv = round(data.stageDv, 2);
            var stages = printStages(data.stages, mass, dv);
            resultTable.row.add([result_id, nbStages, mass, dv, stages]).draw();
            
            
            
        }

        function printStages(stages, fullMass, fullDv) {
            var output = '';
            for (var i in stages) {
                var stage = stages[i];
                stage.stage_id = i;
                stage.Dv = round(stage.stageDv, 2);
                stage.FullDv = fullDv;
                stage.MassLauncher = fullMass;
                var tanks = stage.tanks;
                var tanksNames = [];
                for (var j in tanks) {
                    var tank = tanks[j];
                    tanksNames.push({tank_name: tank.name});
                }
                stage.tanks = tanksNames;
                var rendered = Mustache.render(stageTPL, stage);
                output += rendered;
            }

            return output;
        }
        
        // See Details
        $('#results').on('click', 'tbody td', function() {
            $(this).parent().find("td:last-child").toggleClass("show");
        })
        
    });
})(jQuery);
