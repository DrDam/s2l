var Parts = {};
Parts.engines = [];
Parts.fuelTanks = [];
Parts.decouplers = [];
Parts.adapters = [];
var validationData = [];
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
                $('.action_button').each(function () {
                    $(this).prop('disabled', false);
                });
            }
        };

        // Load fuelTanks
        $.ajax({
            url: "http://kspapi.drdamlab.net/collection/fuelTanks"
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
            url: "http://kspapi.drdamlab.net/collection/decouplers"
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
            url: "http://kspapi.drdamlab.net/collection/adapters"
        }).done(function (data) {
            for (var id in data.adapters) {
                if (id === 'largeAdapter2') {
                    continue;
                }
                var adapter = data.adapters[id];
                adapter.id = id;
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
                var couplers = data.couplers

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
                // If Engine are a mode
                if (Object.keys(modes).length > 0) {
                    // Add single Engine
                    engine.id = engine_id;
                    for (var mode_id in engine.modes) {
                        engine.caract = engine.modes[mode_id][0];
                    }
                    // Clean Data
                    delete engine.tech;
                    delete engine.modes;
                    delete engine.provider;
                    delete engine.caract.conso.total;
                    
                    // Push engine
                    Parts.engines.push(clone(engine));

                    for (var coupler_id in couplers) {
                        var coupler = couplers[coupler_id];
                        
                        // only If Engine mount on coupler
                        if(engine.stackable.top != coupler.stackable.bottom) {
                            continue;
                        }
                        // No stack of boosters
                        if(engine.caract.type == 'SolidBooster') {
                            continue;
                        }
                        
                        // Create new Engine
                        var nb_engines = coupler.stackable.bottom_number;
                        var new_engine = clone(engine);
                        new_engine.id = coupler_id+'_'+nb_engines+'_'+engine_id;
                        new_engine.mass.full = coupler.mass.full + nb_engines*engine.mass.full;
                        new_engine.mass.empty = coupler.mass.empty + nb_engines*engine.mass.empty;
                        new_engine.name = coupler.name + ' + ' + nb_engines + 'x' + engine.name;
                        new_engine.caract.MaxThrust = nb_engines*engine.caract.MaxThrust;
                        for(var curve_id in new_engine.caract.curve) {
                            new_engine.caract.curve[curve_id].Thrust = nb_engines*engine.caract.curve[curve_id].Thrust;
                        }
                        new_engine.stackable.bottom = false;
                        new_engine.cost = coupler.cost + nb_engines*engine.cost;
                        for(var fuel_type in new_engine.caract.conso.proportions) {
                            new_engine.caract.conso.proportions[fuel_type] = nb_engines * engine.caract.conso.proportions[fuel_type]
                        }
                        // push new Engine
                        Parts.engines.push(clone(new_engine));
                    }
                }
            }
            loadCollectionValidation('engines');
        }

})(jQuery);