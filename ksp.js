// Jquery
var computationData = {};
(function ($) {
    $(document).ready(function () {
        var config_count = 0;
        var valid_count = 0;
        var result_id = 0;
        var GeneratedStackCollection = 'all';
        var GeneratedStackSize = 0;
        
        var master;
        if (DEBUG === undefined) {
            DEBUG = {};
        }

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
            {id: '0', label: 'Tiny - 0.625m'},
            {id: '1', label: 'Small - 1.25m'},
            {id: '1p5', label: 'Medium - 1.875m'},
            {id: '2', label: 'Large - 2.5m'},
            {id: '3', label: 'Extra Large - 3.75m'},
            {id: '4', label: 'Huge - 5m'},
            {id: 'mk1', label: 'Mk1 - 5m'},
            {id: 'mk2', label: 'Mk2'},
            {id: 'mk3', label: 'Mk3'}
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

        // Table initialisation
        var resultTable = null;
        var result_id = 0;

        // See Details of a stage
        $('#results table').on('click', 'tbody td', function () {
            $(this).parent().find("td:last-child").toggleClass("show");
        });

        // Prepare stage templating
        var stageTPL = null;
        $.get('tpl/stages.html.tpl', function (data) {
            stageTPL = data;
        }, 'text');
        var cuTPL = null;
        $.get('tpl/cu.html.tpl', function (data) {
            cuTPL = data;
        }, 'text');
        var cuHTML = null;
        // Binding Stop button
        $('#stop').click(function () {
            // Kill Calculation
            master.terminate();
            console.log('END Calculations at ' + new Date());
            $('#stop').prop('disabled', true);
            $('#start').prop('disabled', false);
        });

        /**
         * 
         * 
         * Submit FORM => Start
         * 
         * 
         */
        $('#param').submit(function (event) {
            config_count = 0;
            valid_count = 0;
            result_id = 0;
            // Prevent default
            event.preventDefault();

            // Set Start Time
            var startTime = new Date();
            $('#start').prop('disabled', true);
            $('#stop').prop('disabled', false);

            if (resultTable === null) {
                $('#results').show();
                resultTable = $('#results table').DataTable({
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
                max: (elems.Tmax.value != '') ? parseFloat(elems.Tmax.value) : undefined
            };

            var debug_status = elems.debug.checked;
            var nbWorkers = parseInt(elems.nbworker.value);

            var simu = {};
            simu.nbWorker = nbWorkers;
            simu.step = parseInt(elems.Step.value);
            simu.maxTanks = parseInt(elems.nbTanks.value);
            simu.partCollection = elems.parts_collection.value;
            simu.debug = {};
            simu.debug.status = debug_status;
            simu.debug.startTime = startTime.getTime();

            computationData = {
                SOI: SOI,
                rocket: rocket,
                cu: CU,
                simu: simu,
            };

            cuHTML = makeCuHtml(CU, Sizes);
            console.log('Start Calculations at ' + startTime);

            /*
             console.log('###################');
             console.log('input data');
             console.log(computationData);
             console.log('###################');
             */

            // Create FuelTanksStack
            // Which launch calculation when finished
            makeFuelTanksStack(simu.maxTanks, simu.partCollection, simu.debug);
            // Prevent default
            return false;
        });

        // Make fuelTanks Stacks
        function makeFuelTanksStack(nbTanks, collection, debug) {
            if (nbTanks == GeneratedStackSize && GeneratedStackCollection == collection) {
                console.log('FuelTank stacks with '+nbTanks+' parts Allready generated (' +collection+ ')');
                makeRockets();
            } else {
                console.log('Generate FuelTank stacks with ' + nbTanks + ' parts (' +collection+ ')');
                var tanksMaker = new Worker("workers/makeFuelTanksStack.js");
                tanksMaker.postMessage({channel: 'create', parts: Parts.fuelTanks.concat(Parts.adapters), nbTanks: nbTanks, collection: collection, id: 'tankMaker', debug: debug});
                tanksMaker.addEventListener('message', function (e) {
                    var result = e.data;
                    var channel = result.channel;
                    if (channel === 'info') {
                        var message = "Contacting Werner Von Kermal for tanks stack with " + result.nb + " parts (" +collection+ ').';
                        $('#message').html(message);
                    }
                    if (channel === 'result') {
                        Parts.fuelTanksStacks = result.stacks;
                        GeneratedStackSize = nbTanks;
                        GeneratedStackCollection = collection;
                        //delete Parts.fuelTanks;
                        //console.log(result.stacks.length);
                        tanksMaker.terminate();
                        tanksMaker = undefined;
                        makeRockets();
                    }
                });
                tanksMaker.postMessage({channel: "run"});
            }
        }

        // Launch making rockets
        function makeRockets() {
            console.log('Search Rockets');
            searchRockets(1);

            $('#message').html("Recruiting Kerbals Ingineer");

            // Show table
            $('html, body').animate({
                scrollTop: $("#results").offset().top
            }, 1000);
        }

        // Search all rockets
        function searchRockets(nbStages) {
            master = new Worker("workers/getRocket.js");
            var master_id = "master-" + nbStages;

            var master_data = clone(computationData);
            master_data.rocket.stages = nbStages;
            master.postMessage({channel: 'create', parts: Parts, id: master_id, debug: computationData.simu.debug});
            master.postMessage({channel: "init", data: master_data});
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
                    master.postMessage({channel: 'stop'});
                }
                if (channel === 'badDesign') {
                    updateCounter();
                }
                if (channel === 'killMe') {
                    var id_to_kill = result.id;
                    DEBUG.send(id_to_kill + ' # END');
                    master = undefined;
                    if (computationData.rocket.stages >= nbStages + 1) {
                        searchRockets(nbStages + 1, computationData)
                    } else {
                        console.log('END Calculations at ' + new Date());
                        $('#stop').prop('disabled', true);
                        $('#start').prop('disabled', false);
                    }
                }
            });
            master.postMessage({channel: "run"});
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

                stageData.tanks = [];
                var tanks = stage.tanks;
                for (var j in tanks) {
                    var tank = tanks[j];
                    stageData.tanks.push({tank_name: tank.name});
                }
                stageData.command = [];
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
