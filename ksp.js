
var computationData = {};
var PartToCalculation = {};
var collection = {};
var ProcessedParts = {};
(function ($) {

    $(document).ready(function () {

        // Initialize variables
        var config_count = 0;
        var valid_count = 0;
        var result_id = 0;
        var GeneratedStackCollection = 'all';
        var GeneratedStackSize = 0;

        // Init worker variable
        var master;

        /**************************/
        /* Manage actions on page */
        /**************************/

        // toggle information block
        $("#readme_button").click(function () {
            $("#readme").toggle("slow", function () { });
        });

        // toggle advanced configuration
        $("#advanced_button").click(function (event) {
            event.preventDefault();
            $("#advanced").toggle("slow", function () { });
            return false;
        });

        // Toggle part Mode
        $('input[type=radio][name=part_mode]').change(function () {
            $('.part-collection').hide();
            $('#' + $(this).val()).show();
        });

        // See Details of a stage
        $('#results table').on('click', 'tbody td', function () {
            $(this).parent().find("td:last-child").toggleClass("show");
        });

        // Binding Stop button
        $('#stop').click(function () {
            // Kill Calculation
            master.terminate();
            console.log('END Calculations at ' + new Date());
            $('#stop').prop('disabled', true);
            $('#start').prop('disabled', false);
        });


    // Set Sizes
    Sizes = [
        { id: '0', label: 'Tiny - 0.625m' },
        { id: '1', label: 'Small - 1.25m' },
        { id: '1p5', label: 'Medium - 1.875m' },
        { id: '2', label: 'Large - 2.5m' },
        { id: '3', label: 'Extra Large - 3.75m' },
        { id: '4', label: 'Huge - 5m' },
        { id: 'mk1', label: 'Mk1 - 5m' },
        { id: 'mk2', label: 'Mk2' },
        { id: 'mk3', label: 'Mk3' }
    ];
    // Populate CU size select
    $.each(Sizes, function (i, item) {
        var data = {
            value: item.id,
            text: item.label
        };
        if (item.id === '1') {
            data.selected = 'selected';
        }
        $('#sizeCU').append($('<option>', data));
    });


        /*******************************/
        /* End Manage actions on page */
        /*****************************/

        // Table initialisation
        var resultTable = null;
        result_id = 0;

        // Prepare stage templating
        var stageTPL = null;
        $.get('tpl/stages.mst', function (data) {
            stageTPL = data;
        }, 'text');
        var cuTPL = null;
        $.get('tpl/cu.mst', function (data) {
            cuTPL = data;
        }, 'text');
        var cuHTML = null;

        /******************************/
        /******************************/
        /** 
        /** Start Processing on submit
        /** 
        /******************************/
        /******************************/
        $('#param').submit(function (event) {
            // Prevent default
            event.preventDefault();

            // Counters
            config_count = 0;
            valid_count = 0;
            result_id = 0;

            // Set Start Time
            var startTime = new Date();

            // Manage Start / Stop buttons
            $('#start').prop('disabled', true);
            $('#stop').prop('disabled', false);

            // If table not prepared, init it
            if (resultTable === null) {
                $('#results').show();
                resultTable = $('#results table').DataTable({
                    searching: false,
                    language: {
                        emptyTable: "No configuration found from your specifications"
                    },
                    order: [[3, "desc"]],
                    columnDefs: [
                        { width: 50, targets: 0 },
                        { width: 100, targets: [1, 2] },
                        { width: 200, targets: [3, 4] }

                    ],
                    fixedColumns: true
                });
            }
            resultTable.clear().draw();

            // Get form values
            var elems = event.currentTarget.elements;
            var collection_name = '';
            // Filtre part
            var part_mode = elems.part_mode.value;
            ProcessedParts = {};
            if(part_mode == 'part_collection_simple') {
                collection_name = elems.parts_collection.value;
                if(collection_name != 'all') {
                    for(var part_group in Parts) {
                        ProcessedParts[part_group] = [];
                        for(var part_id in Parts[part_group]) {
                            if(getKeys(Parts[part_group][part_id].provider)[0] == collection_name){
                                ProcessedParts[part_group].push(clone(Parts[part_group][part_id]));
                            }
                        }
                    }
                }
                else {
                    ProcessedParts = clone(Parts);
                }
            }
            else {
                collection_name = 'custom';
                $.each(elems.partList, function(i, item){
                    if($(item).prop('checked')) {
                        var box = $(this).val().split('--');
                        if(!collection[box[0]]) {
                            collection[box[0]] = {};
                        }
                        collection[box[0]][box[1]] = box[1];
                    }
                });
                for(var part_category in Parts) {
                    ProcessedParts[part_category] = [];
                    for(var key in Parts[part_category]) {
                        var part = Parts[part_category][key];
                        if(collection[part_category] && collection[part_category][part.id]){
                            ProcessedParts[partpart_category_group].push(clone(Parts[part_category][key]));
                        }
                    }
                }
            }

            /******************************/
            /* Init calculation variables */
            /******************************/

            var SOI = {};
            SOI.kerbin = { Go: 9.81 };

            var CU = {};
            CU.mass = parseFloat(elems.Mu.value);
            CU.size = elems.sizeCU.value;

            var rocket = {};
            rocket.dv = parseFloat(elems.DvCible.value);
            rocket.type = elems.type.value;
            rocket.stages = parseInt(elems.nbStage.value);
            rocket.twr = {
                min: parseFloat(elems.Tmin.value),
                max: (elems.Tmax.value != '') ? parseFloat(elems.Tmax.value) : undefined
            };

            var debug_status = elems.debug.checked;
            var nbWorkers = parseInt(elems.nbworker.value);

            var simu = {};
            simu.nbWorker = nbWorkers;
            simu.step = parseInt(elems.Step.value);
            simu.maxTanks = parseInt(elems.nbTanks.value);
            simu.debug = {};
            simu.debug.status = debug_status;
            simu.debug.startTime = startTime.getTime();

            computationData = {
                SOI: SOI,
                rocket: rocket,
                cu: CU,
                simu: simu,
            };

            PartToCalculation.adapters = ProcessedParts.adapters;
            

            /**********************************/
            /* End Init calculation variables */
            /**********************************/

            // Init HTML of CU
            cuHTML = makeCuHtml(CU, Sizes);

            // Log Starting
            console.log('Start Calculations at ' + startTime);
            /*
             console.log('###################');
             console.log('input data');
             console.log(computationData);
             console.log('###################');
             */

            /**********************/
            // Create FuelTanksStack
            // Which launch calculation when finished
            makePartStacks(simu.maxTanks, collection_name, simu.debug);

            // Prevent default
            return false;
        });

        /**********************/
        /* Running Operations */
        /**********************/
        
        // Make part Stacks (Fuel Tank / Engine couplers)
        function makePartStacks(nbTanks, collection_name, debug) {
            // Init Stack Flag
            stacksGenerated = [];

            // Generate Engine Stacks (no need workers)
            generateEnginesStacks();

            // Show table
            $('html, body').animate({
                scrollTop: $("#results").offset().top
            }, 1000);

            // If collection not changed
            if (nbTanks == GeneratedStackSize && GeneratedStackCollection == collection) {
                console.log('FuelTank stacks with ' + nbTanks + ' parts Allready generated (' + collection_name + ')');
                stackGenerated('fuelTanks');
            } else {
                // Need to rebuild stacks
                console.log('Generate FuelTank stacks with ' + nbTanks + ' parts (' + collection_name + ')');
                var tanksMaker = new Worker("workers/makeFuelTanksStack.js");
                tanksMaker.postMessage({
                    channel: 'create', 
                    parts: ProcessedParts.fuelTanks.concat(ProcessedParts.adapters), 
                    nbTanks: nbTanks, 
                    id: 'tankMaker', 
                    debug: debug
                });
                tanksMaker.addEventListener('message', function (e) {
                    var result = e.data;
                    var channel = result.channel;
                    if (channel === 'result') {
                        PartToCalculation.fuelTanksStacks = result.stacks;
                        GeneratedStackSize = nbTanks;
                        GeneratedStackCollection = collection;

                        tanksMaker.terminate();
                        tanksMaker = undefined;
                        stackGenerated('fuelTanks');
                    }
                });
                var message = "Contacting Werner Von Kerman for tanks stack with " + nbTanks + " parts (" + collection_name + ').';
                $('#message').html(message);
                tanksMaker.postMessage({ channel: "run" });
            }
        }

        // Generate Engine Stacks
        PartToCalculation.engines = [];
        function generateEnginesStacks() {

            for (var engine_id in ProcessedParts.engines) {

                var engine = ProcessedParts.engines[engine_id];

                // Add Engine
                PartToCalculation.engines.push(clone(engine));

                // Try put engine on a coupler
                for (var coupler_id in ProcessedParts.couplers) {
                    var coupler = ProcessedParts.couplers[coupler_id];


                    // only If Engine mount on coupler
                    if (engine.stackable.top != coupler.stackable.bottom) {
                        continue;
                    }

                    // Create new Engine
                    var nb_engines = coupler.stackable.bottom_number;
                    var new_engine = clone(engine);
                    new_engine.id = coupler_id + '_' + nb_engines + '_' + engine_id;
                    new_engine.mass.full = coupler.mass.full + nb_engines * engine.mass.full;
                    new_engine.mass.empty = coupler.mass.empty + nb_engines * engine.mass.empty;
                    new_engine.name = coupler.name + ' + ' + nb_engines + 'x' + engine.name;
                    new_engine.caract.MaxThrust = nb_engines * engine.caract.MaxThrust;
                    for (var curve_id in new_engine.caract.curve) {
                        new_engine.caract.curve[curve_id].Thrust = nb_engines * engine.caract.curve[curve_id].Thrust;
                    }
                    new_engine.stackable.bottom = false;
                    new_engine.cost = coupler.cost + nb_engines * engine.cost;
                    for (var fuel_type in new_engine.caract.conso.proportions) {
                        new_engine.caract.conso.proportions[fuel_type] = nb_engines * engine.caract.conso.proportions[fuel_type];
                    }
                    new_engine.provider[coupler.provider] = coupler.provider;

                    // push new Engine
                    PartToCalculation.engines.push(clone(new_engine));
                }
            }
            stackGenerated('engines');
        }

        // Control if all stacks are generated
        var stacksGenerated = [];
        function stackGenerated(stack_name) {
            stacksGenerated.push(stack_name);
            if (stacksGenerated.length == 2) {
                // if ok, starting rocket creation
                makeRockets();
            }
        }

        // Launch making rockets
        function makeRockets() {
            console.log('Search Rockets');
            // Launch workers !
            searchRockets(1);

            $('#message').html("Recruiting Kerbals Ingineer");
        }

        // Search all rockets
        function searchRockets(nbStages) {
            master = new Worker("workers/getRocket.js");
            var master_id = "master-" + nbStages;

            var master_data = clone(computationData);
            master_data.rocket.stages = nbStages;
            master.postMessage({ 
                channel: 'create', 
                parts: PartToCalculation, 
                id: master_id, 
                debug: computationData.simu.debug 
            });
            master.postMessage({ channel: "init", data: master_data });
            master.addEventListener('message', function (e) {
                var result = e.data;
                var channel = result.channel;
                if (channel === 'result') {
                    //console.log(e.data.output);
                    var dataToTable = e.data.output;
                    dataToTable.cu = computationData.cu;
                    dataToTable.cuHTML = cuHTML;
                    valid_count++;
                    updateDom(dataToTable);
                }
                if (channel === 'wait') {
                    var master_id = result.id;
                    // If Master end all is processing, kill it
                    DEBUG.send(master_id + ' # Send wait');
                    master.postMessage({ channel: 'stop' });
                }
                if (channel === 'badDesign') {
                    updateCounter();
                }
                if (channel === 'killMe') {
                    var id_to_kill = result.id;
                    DEBUG.send(id_to_kill + ' # END');
                    master = undefined;
                    if (computationData.rocket.stages >= nbStages + 1) {
                        searchRockets(nbStages + 1, computationData);
                    } else {
                        console.log('END Calculations at ' + new Date());
                        $('#stop').prop('disabled', true);
                        $('#start').prop('disabled', false);
                    }
                }
            });
            master.postMessage({ channel: "run" });
        }


        // Add a row in table
        function updateDom(data) {
            result_id++;
            var mass = round(data.totalMass + data.cu.mass);
            var nbStages = data.nbStages;
            var dv = round(data.stageDv, 2);
            var Cu_part = round(round(data.cu.mass / mass, 4) * 100, 2);

            var StagesHTML = '<div class="stagesDetails">';
            StagesHTML += data.cuHTML;
            StagesHTML += printStages(data.stages, mass, dv, result_id);
            StagesHTML += "</div>";

            resultTable.row.add([result_id, nbStages, mass, Cu_part, dv, StagesHTML]).draw();
            updateCounter();
        }

        // Render stage to table
        function printStages(stages, fullMass, fullDv, result_id) {
            var output = '';
            for (var i in stages) {
                var stage = stages[i];
                var stageData = {};
                stageData.resultId = result_id;
                stageData.stage_id = parseInt(i) + 1;
                stageData.stageDv = round(stage.stageDv);
                stageData.FullDv = round(fullDv);
                stageData.MassLauncher = round(fullMass);
                stageData.burn = round(stage.burn);
                stageData.twrMax = round(stage.twr.max);
                stageData.twrMin = round(stage.twr.min);
                stageData.totalMass = round(stage.totalMass);

                stageData.decoupler = stage.decoupler;
                stageData.engine = stage.engine;

                stageData.tanks = [];
                var tanks = stage.tanks;
                for (var j in tanks) {
                    var tank = tanks[j];
                    stageData.tanks.push({ tank_name: tank.name });
                }
                stageData.command = [];
                var command = stage.commandModule;
                for (var k in command) {
                    var part = command[k];
                    stageData.command.push({ part_name: part.name });
                }
                var rendered = Mustache.render(stageTPL, stageData);
                output += rendered;
            }

            return output;
        }

        // Render CU stage
        function makeCuHtml(cu, sizes) {
            var output = '';

            var cuData = {};
            cuData.mass = cu.mass;
            cuData.size = '';
            for (var i in sizes) {
                if (sizes[i].id === cu.size) {
                    cuData.size = sizes[i].label;
                }
            }

            var rendered = Mustache.render(cuTPL, cuData);
            output += rendered;

            return output;
        }

        function updateCounter() {
            config_count++;
            var message = valid_count + " valid configrations among " + config_count + " tested.";
            $('#message').html(message);
        }

    });
})(jQuery);
