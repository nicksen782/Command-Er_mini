// Packages for THIS module.
const fs   = require('fs');
const path = require('path'); 

// Modules saved within THIS module.
const m_config      = require('./m_config.js');
const m_gpio        = require('./m_gpio.js');
const m_lcd         = require('./m_lcd.js');
const m_screenLogic = require('./m_screenLogic.js');
const m_battery     = require('./m_battery.js');

// Main app.
let _APP = {
	// Express variables.
	app    : null,
	express: null,
	wss    : null,

	// Manual route list. (Emulates something like route annotations.)
	routeList: {}, 

	// MODULES (_APP will have access to all the modules.)
	m_config      : m_config ,
	m_gpio        : m_gpio ,
	m_lcd         : m_lcd  ,
	m_screenLogic : m_screenLogic ,
	m_battery     : m_battery ,

	// Can be: [ "main" ]
	currentScreen : "main",

	// This is added to by the other modules.
	logic: {},

	// Init this module.
	module_init: function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to _APP.
			// _APP = parent;
			
			// Add routes.
			_APP.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		// Outputs a list of registered routes.
		_APP.addToRouteList({ path: "/getRoutePaths", method: "get", args: ['type'], file: __filename, desc: "Outputs a list of manually registered routes." });
		app.get('/getRoutePaths'    ,express.json(), async (req, res) => {
			let resp = _APP.getRoutePaths(req.query.type, app); 
			res.json(resp);
		});
	},
	
	// Add the _APP object to each required object.
	module_inits: function(){
		return new Promise(async function(resolve,reject){
			await _APP         .module_init(_APP);
			
			await _APP.m_config.module_init(_APP);
			await _APP.m_gpio.module_init(_APP);
			await _APP.m_lcd.module_init(_APP);
			await _APP.m_battery.module_init(_APP);
			await _APP.m_screenLogic.module_init(_APP);

			resolve();
		});
	},

	// ROUTED: Outputs a list of registered routes.
	getRoutePaths : function(type="manual", app){
		let routes = app._router.stack.filter(r => r.route).map(r => r.route).map(function(r){
			let methods = [];
			for(let m in r.methods){
				methods.push(m);
			}
			return {
				method: methods.join(" "),
				path: r.path,
			};
		});

		switch(type){
			case "manual" : 
				return {
					manual: _APP.routeList,
				};
				break; 

			case "express": 
				return {
					express: routes,
				};
				break; 

			case "both"   : 
				// TODO: unmatched
				return {
					manual   : _APP.routeList,
					express : routes,
					unmatched: [],
				};
				break; 

			default: break; 
		}

		if(type=="manual"){
		}
	},

	// Adds a manual route entry to the routeList.
	addToRouteList : function(obj){
		let file = path.basename(obj.file);
		if(!_APP.routeList[file]){ _APP.routeList[file] = []; }
		_APP.routeList[file].push({
			path  : obj.path, 
			method: obj.method, 
			args  : obj.args,
			desc  : obj.desc,
		});
	},

	// DEBUG: Used to measure how long something takes.
	timeIt_timings : {},
	timeIt: function(key, type, toConsole=false){
		if(type == "s"){
			_APP.timeIt_timings[key] = {
				s: performance.now(),
				e: 0,
				t: 0,
			};
			if(toConsole){ console.log(key, "START"); }
		}
		else if(type == "e"){
			_APP.timeIt_timings[key].e = performance.now();
			_APP.timeIt_timings[key].t = _APP.timeIt_timings[key].e - _APP.timeIt_timings[key].s;
			if(toConsole){ console.log(key, "END", _APP.timeIt_timings[key].t); }
		}
		else if(type == "t"){
			return _APP.timeIt_timings[key].t;
		}
	},
};

// Save app and express to _APP and then return _APP.
module.exports = function(app, express, wss){
	_APP.app     = app;
	_APP.express = express;
	_APP.wss     = wss;
	return _APP;
};