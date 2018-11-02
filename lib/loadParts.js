// Global Variables
var Parts = {};
Parts.engines = [];
Parts.fuelTanks = [];
Parts.decouplers = [];
Parts.adapters = [];
Parts.couplers = [];
var Sizes = {};
//var FuelTypes = {};

(function ($) {
    // local variables
    var validationData = [];
    var providers = {};

    // Fuel Classification
    /*
     var FuelTypes = {};
     FuelTypes.LFO = 'Liquid Fuel and Oxydizer';
     FuelTypes.LF = 'LiquidFuel';
     FuelTypes.SF = 'SolidFuel';
     FuelTypes.O = 'Oxydizer';
     FuelTypes.M = 'MonoPropellant';
     FuelTypes.X = 'XenonGas';
     */
    // Reactivate action button when the two collection are loaded
    var loadCollectionValidation = function (type) {
        validationData.push(type);
        if (validationData.length === 5) {

            generateHtmlSelectors();

            $('.action_button').each(function () {
                $(this).prop('disabled', false);
            });


        }
    };

    var addProvider = function (provider) {
        if (providers[provider] == undefined) {
            providers[provider] = provider;
        }
    };

    // Load fuelTanks
    $.ajax({
        url: "http://kspapi.drdamlab.net/collection/fuelTanks"
    }).done(function (data) {
        for (var id in data.fuelTanks) {
            var tank = data.fuelTanks[id];
            tank.id = id;

            // Add some corrections
            if (id == 'Size1p5_Size0_Adapter_01')
                tank.stackable.bottom = "1p5";

            if (id == 'Size1p5_Size1_Adapter_02')
                tank.stackable.bottom = "1p5";
            if (id == 'Size1p5_Size2_Adapter_01')
                tank.stackable.top = "1p5";
            if (id.indexOf('Size1p5_Tank') !== -1) {
                tank.stackable.top = "1p5";
                tank.stackable.bottom = "1p5";
            }
            if (id == 'Size1p5_Size1_Adapter_01') {
                tank.stackable.top = "1p5";
                tank.stackable.bottom = "2";
            }
            if (id == 'Size1p5_Monoprop') {
                tank.stackable.top = "1p5";
                tank.stackable.bottom = "1p5";
            }
            if (id.indexOf('mk3Fuselage') !== -1) {
                tank.stackable.top = "mk3";
                tank.stackable.bottom = "mk3";
            }
            if (id == 'adapterMk3-Mk2') {
                tank.stackable.top = "mk2";
                tank.stackable.bottom = "mk3";
            }
            if (id.indexOf('adapterMk3-Size2') !== -1) {
                tank.stackable.top = "2";
                tank.stackable.bottom = "mk3";
            }
            if (id == 'adapterSize2-Mk2') {
                tank.stackable.top = "mk2";
                tank.stackable.bottom = "2";
            }
            if (id == 'adapterSize3-Mk3')
                tank.stackable.top = "mk3";
            addProvider(tank.provider);
            var old = tank.provider;
            tank.provider = [];
            tank.provider[old] = old;
            Parts.fuelTanks.push(tank);
        }
        loadCollectionValidation('fuelTanks');
    });

    // Load Decouplers
    $.ajax({
        url: "http://kspapi.drdamlab.net/collection/decouplers"
    }).done(function (data) {
        for (var id in data.decouplers) {
            var decoupler = data.decouplers[id];
            decoupler.id = id;
            var old = decoupler.provider;
            decoupler.provider = {};
            decoupler.provider[old] = old;
            addProvider(old);
            Parts.decouplers.push(decoupler);
        }
        loadCollectionValidation('decouplers');
    });

    // Load Adapters
    $.ajax({
        url: "http://kspapi.drdamlab.net/collection/adapters"
    }).done(function (data) {
        for (var id in data.adapters) {
            var adapter = data.adapters[id];
            adapter.id = id;

            // Add some corrections
            if (id === 'largeAdapter2') {
                adapter.stackable.bottom = '2';
                adapter.stackable.top = '1';
            }
            var old = adapter.provider;
            addProvider(old);
            adapter.provider = {};
            adapter.provider[old] = old;
            Parts.adapters.push(adapter);
        }
        loadCollectionValidation('adapters');
    });

    // Load Couplers
    $.ajax({
        url: "http://kspapi.drdamlab.net/collection/couplers"
    }).done(function (data) {
        for (var coupler_id in data.couplers) {
            var coupler = data.couplers[coupler_id];
            coupler.id = coupler_id;

            // Add correction
            if (coupler_id == 'mk2_1m_Bicoupler') {
                coupler.stackable.top = 'mk2';
                coupler.stackable.bottom = '1';
            }

            var old = coupler.provider;
            addProvider(old);
            coupler.provider = {};
            coupler.provider[old] = old;
            Parts.couplers.push(coupler);
        }
        loadCollectionValidation('couplers');
    });


    // Load Engines
    $.ajax({
        url: "http://kspapi.drdamlab.net/collection/engines"
    }).done(function (data) {
        var engines = data.engines;

        for (var engine_id in engines) {
            var engine = engines[engine_id];
            var modes = engine.modes;
            for (var mode_id in modes) {
                // delete all Jet engines & modes
                if (mode_id === 'Turbine') {
                    delete modes[mode_id];
                }
            }
            // Delete radial Engines
            if (engine.is_radial === true) {
                continue;
            }
            // out ejection tower
            if (engine.stackable.top === false) {
                continue;
            }
            // If Engine are a mode
            if (Object.keys(modes).length > 0) {
                // Add single Engine
                engine.id = engine_id;
                for (var rest_mode_id in engine.modes) {
                    engine.caract = engine.modes[rest_mode_id][0];
                }

                // Add some corrections
                if (engine_id == 'LiquidEngineLV-T91') {
                    engine.stackable.top = '1p5';
                    engine.stackable.bottom = '1p5';
                }
                if (engine_id == 'LiquidEngineLV-TX87') {
                    engine.stackable.top = '1p5';
                    engine.stackable.bottom = '1p5';
                }

                // Clean Data
                delete engine.tech;
                delete engine.modes;
                delete engine.caract.conso.total;
                var old = engine.provider;
                addProvider(old);
                engine.provider = {};
                engine.provider[old] = old;
                // Push engine
                Parts.engines.push(clone(engine));
            }
        }
        loadCollectionValidation('engines');
    });

    function generateHtmlSelectors() {
        // Populate "simple" part selector
        $('#parts').append($('<option>', { value: 'all', text: 'all', selected: 'selected' }));
        $.each(providers, function (i, item) {
            var data = {
                value: item,
                text: item
            };

            $('#parts').append($('<option>', data));
        });

        // Populate "advanced" part selector
        var domParent = '#advanced_part_list';
        $.get('../tpl/partList.mst', function (data) {
            var partListTpl = data;

            var Data = {};
            for (var category in Parts) {
                part_category = [];
                for (var part_item in Parts[category]) {
                    var part = Parts[category][part_item];
                    part_category.push({ name: part.name, id: part.id, provider: getKeys(part.provider) });
                }

                var html = Mustache.render(partListTpl, { category: category, parts: part_category });
                $(domParent).append(html);

            }
        }, 'text');
    }

})(jQuery);