// Packages for THIS module.
const fs   = require('fs');
const path = require('path'); 

// Modules saved within THIS module.
const m_config           = require('./m_config.js');
const m_draw             = require('./m_draw.js');
const m_websocket_node   = require('./m_websocket_node.js');
const m_websocket_python = require('./m_websocket_python.js');
const m_gpio             = require('./m_gpio.js');
// const m_screenLogic = require('./m_screenLogic.js');
// const m_battery     = require('./m_battery.js');
// const m_s_timing    = require('./m_s_timing.js');

// 
const rpbp = require( './removeprocess.js' ).run;

// Main app.
let _APP = {
	// Express variables.
	app      : null,
	express  : null,
	wss      : null,

	// Manual route list. (Emulates something like route annotations.)
	routeList: {}, 

	// MODULES (_APP will have access to all the modules.)
	m_config          : m_config ,
	m_draw            : m_draw  ,
	m_websocket_node  : m_websocket_node ,
	m_websocket_python: m_websocket_python ,
	m_gpio            : m_gpio ,
	// m_screenLogic : m_screenLogic ,
	// m_battery     : m_battery ,
	// m_s_timing    : m_s_timing ,
	rpbp         : rpbp ,

	// Init this module.
	module_init: function(parent){
		return new Promise(async function(resolve,reject){
			// Add routes.
			_APP.consolelog("  addRoutes");
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

	// Add the _APP object to each required object.
	module_inits: function(){
		return new Promise(async function(resolve,reject){
			_APP.consolelog("START: module_init: M_main :");        
			_APP.timeIt("M_main", "s");   await _APP         .module_init(_APP); _APP.timeIt("M_main", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("M_main", "t").toFixed(3).padStart(9, " ")} ms\n`);
			
			_APP.consolelog("START: module_init: m_config :");        
			_APP.timeIt("m_config", "s"); await _APP.m_config.module_init(_APP); _APP.timeIt("m_config", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_config", "t").toFixed(3).padStart(9, " ")} ms\n`);
			
			_APP.consolelog("START: module_init: draw :");        
			_APP.timeIt("m_draw", "s"); await _APP.m_draw.module_init(_APP); _APP.timeIt("m_draw", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_draw", "t").toFixed(3).padStart(9, " ")} ms\n`);
			
			_APP.consolelog("START: module_init: websocket_node :");        
			_APP.timeIt("m_websocket_node", "s"); await _APP.m_websocket_node.module_init(_APP); _APP.timeIt("m_websocket_node", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_websocket_node", "t").toFixed(3).padStart(9, " ")} ms\n`);
			
			_APP.consolelog("START: module_init: websocket_python :");        
			_APP.timeIt("m_websocket_python", "s"); await _APP.m_websocket_python.module_init(_APP); _APP.timeIt("m_websocket_python", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_websocket_python", "t").toFixed(3).padStart(9, " ")} ms\n`);
			
			_APP.consolelog("START: module_init: gpio :");        
			_APP.timeIt("m_gpio", "s"); await _APP.m_gpio.module_init(_APP); _APP.timeIt("m_gpio", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_gpio", "t").toFixed(3).padStart(9, " ")} ms\n`);

			resolve();
		});
	},

	// *****************

	// DEBUG: Used to measure how long something takes.
	timeIt_timings : { },
	timeIt_timings_prev : { },
	timeIt: function(key, type){
		if(type == "s"){
			_APP.timeIt_timings[key] = { s: performance.now(), e: 0, t: 0, };
		}
		else if(type == "e"){
			if(_APP.timeIt_timings[key]){
				_APP.timeIt_timings[key].e = performance.now();
				_APP.timeIt_timings[key].t = _APP.timeIt_timings[key].e - _APP.timeIt_timings[key].s;

				// Add to prev
				_APP.timeIt_timings_prev[key] = {
					s: _APP.timeIt_timings[key].s,
					e: _APP.timeIt_timings[key].e,
					t: _APP.timeIt_timings[key].t,
				}
			}
		}
		else if(type == "t"){
			if(_APP.timeIt_timings[key]){
				return _APP.timeIt_timings[key].t;
			}
			return -1;
		}
	},

	removeProcessByPort : function(ports, display=false){
		// Remove any potential duplicates in the ports list. 
		ports = [...new Set(ports)] ;
	
		_APP.consolelog(`  Removing processes using ports: ${ports}`);
	
		//
		let closed = [];
		return new Promise(async function(resolve,reject){
			// Add promises for each removal.
			let proms = [];
			for(let i=0; i<ports.length; i+=1){
				proms.push(
					new Promise(function(res,rej){
						let resp; 
						let port = ports[i];
						try{ 
							resp = _APP.rpbp(port).catch( (e)=>{throw e;}) 
							resp.then(function(data){
								// Add to the removed ports.
								if(data.removed){ closed.push(port); }

								// Normal run? 
								if(data.success){
									if(data.removed){ 
										if(closed.length){
											if(display){ _APP.consolelog(`    ${data.text}`); } 
										}
									}
								}
								
								// Error.
								else{ _APP.consolelog(`    ERROR: ${data}`); }
								res(data);
							});
						} 
						catch(e){ 
							resp = e; 
							console.log("   ERROR:", e);
							rej(resp);
						} 
					})
				);
			}

			// Wait for all promises to resolve.
			await Promise.all(proms);

			// Output the results. 
			if(closed.length){
				_APP.consolelog(`  Processes were removed on these ports: ${closed}`);
			}
			else{
				_APP.consolelog(`  No matching processes were found.`);
			}

			resolve();
		})
	},

	consolelog: function(args){
		try{
			if(!_APP.m_config.config.toggles.hide_APP_consolelog){
				console.log("(LOG)", args);
			}
		}
		catch(e){
			console.log("{LOG}", args);
		}
	},
};

// Save app and express to _APP and then return _APP.
module.exports = function(app, express, server){
	_APP.app     = app;
	_APP.express = express;
	_APP.server  = server;
	return _APP;
};