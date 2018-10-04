// Jquery
(function ($) {
    $(document).ready(function () {
        if(DEBUG === undefined) {DEBUG = {};}

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
            {id: 'size0', label: 'Tiny - 0.625m'},
            {id: 'size1', label: 'Small - 1.25m'},
            {id: 'size1p5', label: 'Medium - 1.875m'},
            {id: 'size2', label: 'Large - 2.5m'},
            {id: 'size3', label: 'Extra Large - 3.75m'},
            {id: 'size4', label: 'Huge - 5m'},
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
            if (item.id === 'size1') {
                data.selected = 'selected';
            }
            $('#sizeCU').append($('<option>', data));
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

            event.preventDefault();
            $('#start').prop('disabled', true);
            $('#stop').prop('disabled', false);

            if (resultTable === null) {
                $('#results').show();
                resultTable = $('#results').DataTable({
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

            var debug_status = elems.debug.checked;
            var nbWorkers = parseInt(elems.nbworker.value);

            var simu = {};
            simu.nbWorker = nbWorkers;
            simu.step = parseInt(elems.Step.value);
            simu.maxTanks = parseInt(elems.nbTanks.value);
            simu.debug = {};
            simu.debug.status = debug_status;
            simu.debug.startTime = startTime.getTime();

            var computationData = {
                SOI: SOI,
                rocket: rocket,
                cu: CU,
                simu: simu,
                //parts: Parts
                // fuelTypes: FuelTypes,
                // sizes: Sizes
            };

            var cuHTML = makeCuHtml(CU, Sizes);
            
            // Start Debug
            console.log('Start Calculations at ' + startTime);
            DEBUG.setStatus(debug_status)
            DEBUG.setStart(startTime.getTime());
            DEBUG.send('Worker Id # Message # ', true);
            
            /*
             console.log('###################');
             console.log('input data');
             console.log(computationData);
             console.log('###################');
             */
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
                masters[id].postMessage({channel: 'create', parts: Parts, id: id, debug: simu.debug});
                masters[id].postMessage({channel: "init", data: master_data});
                masters[id].postMessage({channel: "run"});
                masters[id].addEventListener('message', function (e) {
                    var result = e.data;
                    var channel = result.channel;
                    if (channel === 'result') {
                        //console.log(e.data.output);
                        var dataToTable = e.data.output;
                        dataToTable.cu = computationData.cu;
                        dataToTable.cuHTML = cuHTML;
                        updateDom(dataToTable);
                    }
                    if (channel === 'wait') {
                        var master_id = result.id;
                        // If Master end all is processing, kill it
                        DEBUG.send(master_id + ' # Send wait');
                        masters[master_id].postMessage({channel: 'stop'});
                    }
                    if (channel === 'killMe') {
                        var id_to_kill = result.id;
                        DEBUG.send(id_to_kill + ' # END');
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
            var Cu_part = round(round(data.cu.mass / mass, 4) * 100,2);

            var StagesHTML = '<div class="stagesDetails">';
            StagesHTML += data.cuHTML;
            StagesHTML += printStages(data.stages, mass, dv, result_id);
            StagesHTML += "</div>";

            resultTable.row.add([result_id, nbStages, mass, Cu_part, dv, StagesHTML]).draw();
        }

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

        // See Details
        $('#results').on('click', 'tbody td', function () {
            $(this).parent().find("td:last-child").toggleClass("show");
        });

    });
})(jQuery);
