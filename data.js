var Fuel = {};
Fuel.LFO = 'Liquid Fuel and Oxydizer';
Fuel.LF = 'Liquid Fuel Only';
Fuel.M = 'MonoPropellant';
Fuel.X = 'Xénon';

var Engines = [
    {name: '24-77 "Twitch" LFE', ISP: {atm: 250, vac: 290}, Thrust: {atm: 13.793, vac: 16}, Mass: {full: 0.09, empty: 0.09}, stackable:false, ressource:Fuel.LFO},
    {name: '48-7S "Spark" LFE', ISP: {atm: 270, vac: 320}, Thrust: {atm: 16.875, vac: 20}, Mass: {full: 0.1, empty: 0.1}, stackable:true, ressource:Fuel.LFO},
    {name: 'CR-7 R.A.P.I.E.R. Engine (close mode)', ISP: {atm: 275, vac: 305}, Thrust: {atm: 162.3, vac: 180}, Mass: {full: 2, empty: 2}, stackable:true, ressource:Fuel.LFO},
    {name: 'IX-6315 "Dawn" Electric Propulsion System', ISP: {atm: 100, vac: 4200}, Thrust: {atm: 0.048, vac: 2}, Mass: {full: 0.25, empty: 0.25}, stackable:true, ressource:Fuel.X},
    {name: 'Kerbodyne KE-1 "Mastodon" LFE (DLC)', ISP: {atm: 280, vac: 290}, Thrust: {atm: 103.448, vac: 1350}, Mass: {full: 5, empty: 5}, stackable:true, ressource:Fuel.LFO},
    {name: 'Kerbodyne KR-2L+ "Rhino" LFE', ISP: {atm: 205, vac: 340}, Thrust: {atm: 1205.882, vac: 2000}, Mass: {full: 9, empty: 9}, stackable:true, ressource:Fuel.LFO},
    {name: 'LFB KR-1x2 "Twin-Boar" LFE', ISP: {atm: 280, vac: 300}, Thrust: {atm: 1866.667, vac: 2000}, Mass: {full: 42.5, empty: 10.5}, stackable:false, ressource:Fuel.LFO},
    {name: 'LV-1 "Ant" LFE', ISP: {atm: 80, vac: 315}, Thrust: {atm: 0.508, vac: 2}, Mass: {full: 0.02, empty: 0.02}, stackable:true, ressource:Fuel.LFO},
    {name: 'LV-1R "Spider" LFE', ISP: {atm: 260, vac: 290}, Thrust: {atm: 1.793, vac: 2.0}, Mass: {full: 0.5, empty: 0.5}, stackable:false, ressource:Fuel.LFO},
    {name: 'LV-909 "Terrier" LFE', ISP: {atm: 85, vac: 345}, Thrust: {atm: 14.783, vac: 60}, Mass: {full: 0.5, empty: 0.5}, stackable:true, ressource:Fuel.LFO},
    {name: 'LV-N "Nerv" Atomic Rocket Motor', ISP: {atm: 185, vac: 800}, Thrust: {atm: 13.875, vac: 60}, Mass: {full: 3, empty: 3}, stackable:true, ressource:Fuel.LF},
    {name: 'LV-T30 "Reliant" LFE', ISP: {atm: 265, vac: 310}, Thrust: {atm: 205.161, vac: 240}, Mass: {full: 1.25, empty: 1.25}, stackable:true, ressource:Fuel.LFO},
    {name: 'LV-T45 "Swivel" LFE', ISP: {atm: 250, vac: 320}, Thrust: {atm: 167.969, vac: 215}, Mass: {full: 1.5, empty: 1.5}, stackable:true, ressource:Fuel.LFO},
    {name: 'LV-T91 "Cheeta" LFE (DLC)', ISP: {atm: 150, vac: 345}, Thrust: {atm: 54.348, vac: 125}, Mass: {full: 1, empty: 1}, stackable:true, ressource:Fuel.LFO},
    {name: 'LV-TX87 "Bobcat" LFE (DLC)', ISP: {atm: 290, vac: 310}, Thrust: {atm: 374.194, vac: 400}, Mass: {full: 2, empty: 2}, stackable:true, ressource:Fuel.LFO},
    {name: 'Mk-55 "Thud" LFE', ISP: {atm: 275, vac: 305}, Thrust: {atm: 108.197, vac: 120}, Mass: {full: 0.9, empty: 0.9}, stackable:false, ressource:Fuel.LFO},
    {name: 'O-10 "Puff" MonoPropellant Fuel Engine', ISP: {atm: 120, vac: 250}, Thrust: {atm: 9.6, vac: 20}, Mass: {full: 0.09, empty: 0.09}, stackable:false, ressource:Fuel.M},
    {name: 'RE-I2 "Skiff" LFE (DLC)', ISP: {atm: 265, vac: 330}, Thrust: {atm: 240.909, vac: 300}, Mass: {full: 1, empty: 1}, stackable:true, ressource:Fuel.LFO},
    {name: 'Rockomax "Skipper" LFE', ISP: {atm: 280, vac: 320}, Thrust: {atm: 568.75, vac: 650}, Mass: {full: 3, empty: 3}, stackable:true, ressource:Fuel.LFO},
    {name: 'RE-J10 "Wholfhound" LFE (DLC)', ISP: {atm: 70, vac: 412}, Thrust: {atm: 63.715, vac: 375}, Mass: {full: 2.5, empty: 2.5}, stackable:true, ressource:Fuel.LFO},
    {name: 'Rockomax "Poodle" LFE', ISP: {atm: 90, vac: 350}, Thrust: {atm: 64.286, vac: 250}, Mass: {full: 1.75, empty: 1.75}, stackable:true, ressource:Fuel.LFO},
    {name: 'Rockomax "Mainsail" LFE', ISP: {atm: 285, vac: 310}, Thrust: {atm: 1379.032, vac: 1500}, Mass: {full: 6, empty: 6}, stackable:true, ressource:Fuel.LFO},
    {name: 'RK-7 "Kodiak" LFE (DLC)', ISP: {atm: 265, vac: 305}, Thrust: {atm: 208.525, vac: 240}, Mass: {full: 1.25, empty: 1.25}, stackable:true, ressource:Fuel.LFO},
    {name: 'RV-1 "Cub" Vernier Engine (DLC)', ISP: {atm: 270, vac: 320}, Thrust: {atm: 33.75, vac: 40}, Mass: {full: 0.18, empty: 0.18}, stackable:false, ressource:Fuel.LFO},
    {name: 'S3 KS-25 "Vector" LFE', ISP: {atm: 295, vac: 315}, Thrust: {atm: 935.508, vac: 1000}, Mass: {full: 4, empty: 4}, stackable:true, ressource:Fuel.LFO},
    {name: 'S3 KS-25x4 "Mammoth" LFE', ISP: {atm: 295, vac: 315}, Thrust: {atm: 3746.032, vac: 4000}, Mass: {full: 15, empty: 15}, stackable:false, ressource:Fuel.LFO},
    {name: 'T-1 Toroidal Aerospike "Dart" LFE', ISP: {atm: 290, vac: 340}, Thrust: {atm: 153.529, vac: 180}, Mass: {full: 1, empty: 1}, stackable:true, ressource:Fuel.LFO},
];

var FuelTank = [
    
];
