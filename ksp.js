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

        var Sizes = [
            { id:'size0', label:'Tiny - 0.625m'},
            { id:'size1', label:'Small - 1.25m'},
            { id:'size1p5', label:'Medium - 1.875m'},
            { id:'size2', label:'Large - 2.5m'},
            { id:'size3', label:'Extra Large - 3.75m'},
            { id:'size4', label:'Huge - 5m'},
            { id:'mk1', label:'Mk1 - 5m'},
            { id:'mk2', label:'Mk2'},
            { id:'mk3', label:'Mk3'},
        ];
        // Populate CU size select
        $.each(Sizes, function (i, item) {
            var data = { 
                value: item.id,
                text : item.label
            };
            if(item.id == 'size1') {
                data.selected = 'selected';
            }
            $('#sizeCU').append($('<option>', data));
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
        };

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
                if(id == 'largeAdapter2') {
                    continue;
                }
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
        $.get('tpl/stages.html.tpl', function (data) {
            stageTPL = data;
        }, 'text');
        var cuTPL = null;
        $.get('tpl/cu.html.tpl', function (data) {
            cuTPL = data;
        }, 'text');

        // Binding Stop button
        $('#stop').click(function () {
            for (var i in masters) {
                if (masters[i] !== undefined) {
                    masters[i].postMessage({channel: "stop"});
                }
            }
            $('#stop').prop('disabled', true);
            $('#start').prop('disabled', false);
        });

        // Binding start Button
        $('#param').submit(function (event) {
            
            var startTime = new Date();
            console.log('Start Calculations at ' + startTime);
            debug.setStart(startTime.getTime());
            debug.send('Worker Id # Message # ', true);
            
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
                    order: [[3, "desc"]],
                    columnDefs: [
                        {width: 50, targets: 0},
                        {width: 100, targets: [1, 2]},
                        {width: 200, targets: [3, 4]}

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
// window.navigator.hardwareConcurrency

            var simu = {};
            simu.nbWorker = nbWorkers;
            simu.step = parseInt(elems.Step.value);
            simu.maxTanks = parseInt(elems.nbTanks.value);
            simu.startTime = startTime.getTime();
            
            var computationData = {
                SOI: SOI,
                rocket: rocket,
                cu: CU,
                simu: simu,
                parts: Parts,
          //      fuelTypes: FuelTypes,
          //      sizes: Sizes
            };

            sessionStorage.setItem('parts', JSON.stringify(Parts));
  //          windows.sessionStorage.setItem('fuelTypes', JSON.stringify(FuelTypes));
  //          windows.sessionStorage.setItem('sizes', JSON.stringify(Sizes));
            
            var cuHTML = makeCuHtml(CU, Sizes);

            //debug.send('###################');
            //debug.send('input data');
            //debug.send(computationData);
            //debug.send('###################');

            var nbStage;
            result_id = 0;
            masters = [];
            // Create workers
            for (nbStage = 0; nbStage < computationData.rocket.stages; nbStage++) {
                var w = new Worker("workers/getRocket.js");
                
                var master_id = "master-" + nbStage;
                masters[master_id] = w;
            }
            // Launch simulation for each stage
            var nbStages = 0;
            for (var id in masters) {
                var nbstages = nbStages + 1;
                var master_data = clone(computationData);
                master_data.rocket.stages = nbstages;

                masters[id].postMessage({channel: "init", id: id, data: master_data});
                masters[id].postMessage({channel: "run"});
                masters[id].addEventListener('message', function (e) {
                    var result = e.data;
                    if (result.channel == 'result') {
                        var dataToTable = e.data.output;
                        dataToTable.cu = computationData.cu;
                        dataToTable.cuHTML = cuHTML;
                        updateDom(dataToTable);
                    }
                    if (result.channel == 'end') {
                        var id_to_kill = result.id;
                        debug.send(id_to_kill + ' # END');
                        masters[id_to_kill] = undefined;
                        var terminated = true;
                        for (var i in masters) {
                            if (masters[i] !== undefined) {
                                terminated = false;
                            }
                        }
                        if (terminated === true) {
                            console.log('END Calculations at ' + new Date());
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
            result_id++;
            var mass = round(data.totalMass + data.cu.mass);
            var nbStages = data.nbStages;
            var dv = round(data.stageDv, 2);
            var Cu_part = round(round(data.cu.mass / mass) * 100, 2);
            
            var StagesHTML = '<div class="stagesDetails">';
            StagesHTML += data.cuHTML;
            StagesHTML += printStages(data.stages, mass, dv, result_id);
            StagesHTML += "</div>";
            //debug.send('###################');
            //debug.send('output to table');
            //debug.send(data);
            //debug.send('###################');
            resultTable.row.add([result_id, nbStages, mass, Cu_part,dv, StagesHTML]).draw();
        }

        function printStages(stages, fullMass, fullDv, result_id) {
            var output = '';
            for (var i in stages) {
                var stage = stages[i];    
                var stageData = {};
                stageData.resultId = result_id;
                stageData.stage_id = parseInt(i)+1;
                stageData.stageDv = round(stage.stageDv);
                stageData.FullDv = round(fullDv);
                stageData.MassLauncher = round(fullMass);
                stageData.burn = round(stage.burn);
                stageData.twrMax = round(stage.twr.max);
                stageData.twrMin = round(stage.twr.min);
                stageData.totalMass = round(stage.totalMass);
                
                stageData.decoupler = stage.decoupler;
                stageData.engine = stage.engine;
                
                stageData.tanks =??[];
                var tanks = stage.tanks;
                for (var j in tanks) {
                    var tank = tanks[j];
                    stageData.tanks.push({tank_name: tank.name});
                }
                stageData.command =??[];
                var command = stage.commandModule;
                for (var k in command) {
                    var part = command[k];
                    stageData.command.push({part_name: part.name});
                }
                var rendered = Mustache.render(stageTPL, stageData);
                output += rendered;
            }

            return output;
        }
        
        function makeCuHtml(cu, sizes) {
            var output = '';
            
            var cuData = {};
            cuData.mass = cu.mass;
            cuData.size = '';
            for( var i in sizes) {
                if(sizes[i].id == cu.size) {
                    cuData.size = sizes[i].label;
                }
            }
            
            var rendered = Mustache.render(cuTPL, cuData);
            output += rendered;
            
            return output;
        }

        // See Details
        $('#results').on('click', 'tbody td', function () {
            $(this).parent().find("td:last-child").toggleClass("show");
        });

    });
})(jQuery);
