var Parts = {};
Parts.engines = [];
Parts.fuelTanks = [];
Parts.decouplers = [];
Parts.adapters = [];
var validationData = [];
var providers = {};
(function ($) {

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
        if (validationData.length === 4) {
            // Populate part collection
            $('#parts').append($('<option>', {value: 'all', text: 'all', selected:'selected'}));
            $.each(providers, function (i, item) {
            var data = {
                value: item,
                text: item
            };
            
                $('#parts').append($('<option>', data));
            });
            
            $('.action_button').each(function () {
                $(this).prop('disabled', false);
            });
            
            
        }
    };
    
    var addProvider = function(provider) {
        if(providers[provider] == undefined) {
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

    // Make engines Stack
    // => single Engine
    // => Coupler + X*Engine
    $.ajax({
        url: "http://kspapi.drdamlab.net/collection/engines"
    }).done(function (data) {
        var engines = data.engines;
        // Load Couplers
        $.ajax({
            url: "http://kspapi.drdamlab.net/collection/couplers"
        }).done(function (data) {
            var couplers = data.couplers;

            setEngineStack(engines, couplers);
        });


    });


    function setEngineStack(engines, couplers) {
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

                for (var coupler_id in couplers) {
                    var coupler = couplers[coupler_id];

                    // Add some corrections
                    if (coupler_id == 'mk2_1m_Bicoupler') {
                        coupler.stackable.top = 'mk2';
                        coupler.stackable.bottom = '1';
                    }

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
                    addProvider(coupler.provider);
                    new_engine.provider[coupler.provider] = coupler.provider;

                    // push new Engine
                    Parts.engines.push(clone(new_engine));
                }
            }
        }
        loadCollectionValidation('engines');
    }

})(jQuery);