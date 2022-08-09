// Packages for THIS module.
const fs   = require('fs');
const path = require('path'); 

// Modules saved within THIS module.
const m_config           = require('./m_config.js');
const m_draw             = require('./m_draw.js');
const m_websocket_node   = require('./m_websocket_node.js');
const m_websocket_python = require('./m_websocket_python.js');
const m_gpio             = require('./m_gpio.js');
const m_s_title          = require('./m_s_title.js');
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
	m_s_title         : m_s_title ,
	// m_battery     : m_battery ,
	// m_s_timing    : m_s_timing ,
	rpbp         : rpbp ,

	// Init this module.
	module_init: function(parent){
		return new Promise(async function(resolve,reject){
			// Add routes.
			_APP.consolelog("addRoutes", 2);
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
			_APP.consolelog("START: module_init: M_main :", 0);        
			_APP.timeIt("M_main", "s");   await _APP         .module_init(_APP); _APP.timeIt("M_main", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("M_main", "t").toFixed(3).padStart(9, " ")} ms\n`, 0);
			
			_APP.consolelog("START: module_init: draw :", 0);        
			_APP.timeIt("m_draw", "s"); await _APP.m_draw.module_init(_APP); _APP.timeIt("m_draw", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_draw", "t").toFixed(3).padStart(9, " ")} ms\n`, 0);
			
			_APP.consolelog("START: module_init: websocket_node :", 0);        
			_APP.timeIt("m_websocket_node", "s"); await _APP.m_websocket_node.module_init(_APP); _APP.timeIt("m_websocket_node", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_websocket_node", "t").toFixed(3).padStart(9, " ")} ms\n`, 0);
			
			_APP.consolelog("START: module_init: websocket_python :", 0);
			_APP.timeIt("m_websocket_python", "s"); await _APP.m_websocket_python.module_init(_APP); _APP.timeIt("m_websocket_python", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_websocket_python", "t").toFixed(3).padStart(9, " ")} ms\n`, 0);
			
			_APP.consolelog("START: module_init: gpio :", 0);        
			_APP.timeIt("m_gpio", "s"); await _APP.m_gpio.module_init(_APP); _APP.timeIt("m_gpio", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_gpio", "t").toFixed(3).padStart(9, " ")} ms\n`, 0);
			
			_APP.consolelog("START: module_init: s_title :", 0);        
			_APP.timeIt("m_s_title", "s"); await _APP.m_s_title.module_init(_APP); _APP.timeIt("m_s_title", "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt("m_s_title", "t").toFixed(3).padStart(9, " ")} ms\n`, 0);

			resolve();
		});
	},

	// *****************

	screens: [
		"screen_title", 
	],
	screenLogic: {
		shared: {
			goToPrevScreen : function(){
				// Find the index of the current screen.
				let index = _APP.screens.indexOf(_APP.currentScreen);
				let canMove = index > 0;
				if(canMove){ 
					_APP.currentScreen = _APP.screens[index -1];
					_APP.screenLogic.screens[_APP.currentScreen].init();
					// console.log("Switching to:", _APP.currentScreen);
				}
				// console.log(`PREV: ${index}/${_APP.screens.length} total. canMove: ${canMove}, newScreen: ${_APP.currentScreen}`);
			},
			goToNextScreen : function(){
				// Find the index of the current screen.
				let index = _APP.screens.indexOf(_APP.currentScreen);
				let canMove = index < _APP.screens.length-1;
				let newScreen = false;
				if(canMove){ 
					_APP.currentScreen = _APP.screens[index +1];
					_APP.screenLogic.screens[_APP.currentScreen].init();
					// console.log("Switching to:", _APP.currentScreen);
				}
				// console.log(`NEXT: ${index+1}/${_APP.screens.length} total. canMove: ${canMove}, newScreen: ${_APP.currentScreen}`, _APP.screens);
			},
		},
		screens: {},
	},
	currentScreen : "screen_title",
	// currentScreen : "timings_test",
	// currentScreen : "drawingTest",

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
	
		_APP.consolelog(`Removing processes using ports: ${ports}`, 2);
	
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
							resp = _APP.rpbp(port).catch( (e)=>{throw e;});
							resp.then(function(data){
								// Add to the removed ports.
								if(data.removed){ closed.push(port); }

								// Normal run? 
								if(data.success){
									if(data.removed){ 
										if(closed.length){
											if(display){ _APP.consolelog(`${data.text}`, 2); } 
										}
									}
								}
								
								// Error.
								else{ _APP.consolelog(`ERROR: ${data}`, 2); }
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
				_APP.consolelog(`Processes were removed on these ports: ${closed}`, 2);
			}
			else{
				_APP.consolelog(`No matching processes were found.`, 2);
			}

			resolve();
		})
	},

	consolelog: function(str, indent=2, ){
		// str=str.replace(/ /g, "*");
		try{
			if(!_APP.m_config.config.toggles.hide_APP_consolelog){
				console.log(`(LOG) ${" ".repeat(indent)}${str}`);
			}
		}
		catch(e){
			console.log(`{LOG} ${" ".repeat(indent)}${str}`);
		}
	},

	// Calculates the average frames per second.
	fps : {
		// colxi: https://stackoverflow.com/a/55644176/2731377
		sampleSize : 60,    
		value   : 0, // Value and average are the same value.
		average : 0, // Value and average are the same value.
		_sample_ : [],
		_index_ : 0,
		_lastTick_: false,
		tick : function(){
			// if is first tick, just set tick timestamp and return
			if( !this._lastTick_ ){
				this._lastTick_ = performance.now();
				return 0;
			}
			// calculate necessary values to obtain current tick FPS
			let now = performance.now();
			let delta = (now - this._lastTick_)/1000;
			let fps = 1/delta;
			// add to fps samples, current tick fps value 
			this._sample_[ this._index_ ] = Math.round(fps);
			
			// iterate samples to obtain the average
			let average = 0;
			for(i=0; i<this._sample_.length; i++) average += this._sample_[ i ];
			average = Math.round( average / this._sample_.length);
	
			// set new FPS
			this.value = average;
			this.average = average;

			// store current timestamp
			this._lastTick_ = now;

			// increase sample index counter, and reset it
			// to 0 if exceded maximum sampleSize limit
			this._index_++;
			if( this._index_ === this.sampleSize) this._index_ = 0;
			
			return this.value;
		},
		init: function(){
			// Set the values. 
			this._sample_   = []   ;
			this._index_    = 0    ;
			this._lastTick_ = false;
		},
	},	
	// APP LOOP.
	stats : {
		now      : performance.now(),
		_then    : performance.now(),
		delta    : 0,
		fps      : 0,
		interval : 0,
	
		setFps: function(newFPS){
			if(!newFPS){ 
				console.log("setFps: Invalid newFPS. Assigning it to 1");
				newFPS = 1; 
			}

			// Ensure only integers will be used.
			newFPS = Math.floor(newFPS);

			// If FPS is 60 (max) then there is no time between frames which will block anything that is outside of the main game loop such as debug.)
			// if(newFPS >= 60){ newFPS=59; }
			
			// Make sure at least 1 fps is set. 
			if(newFPS <= 0){ newFPS=1; }

			// Set the values
			_APP.stats.fps      = newFPS;
			_APP.stats.interval = 1000/newFPS;
		},
	},

	schedule_appLoop: function(){
		// setTimeout -- Gives a little "breathing room" for the CPU.
		// setTimeout(function(){ _APP.appLoop(  performance.now() ); }, 10);

		// setImmediate. Frees up whatever remains of the current event loop. (breathing room?)
		setImmediate(function(){ _APP.appLoop(  performance.now() ); });
	},

	// timestamp should be performance.now().
	appLoop : async function(timestamp){
		// How long has it been since a full loop has been completed?
		_APP.stats.now = timestamp;
		_APP.stats.delta = _APP.stats.now - _APP.stats._then;
		
		// Should the full loop run?
		let runLoop = _APP.stats.delta >= _APP.stats.interval ? true : false;
	
		// YES
		if(runLoop && !_APP.m_draw.updatingLCD){
			_APP.timeIt("FULLLOOP", "s");
			_APP.fps.tick();
			_APP.stats._then = performance.now(); // _APP.stats.now - (_APP.stats.delta % _APP.stats.interval);
	
			// BUTTONS
			_APP.timeIt("GPIO", "s");
			// _APP.m_gpio.readAll();
			_APP.timeIt("GPIO", "e");
			
			// BUTTON ACTIONS.
			_APP.timeIt("GPIO_ACTIONS", "s");
			// _APP.m_gpio.buttonActions();
			_APP.timeIt("GPIO_ACTIONS", "e");
			
			// STATE
			_APP.timeIt("LOGIC", "s");
			await _APP.screenLogic.screens[_APP.currentScreen].func();
			_APP.timeIt("LOGIC", "e");
			
			// UPDATE DISPLAY(S)
			if(_APP.m_draw.lcdUpdateNeeded && !_APP.m_draw.updatingLCD){ 
				// Start the timeIt.
				_APP.timeIt("WS_DISPLAYUPDATE", "s");
				
				// Update the web clients. (ArrayBuffer)
				if(_APP.m_websocket_node.ws_utilities.getClientCount()){
					_APP.m_websocket_node.ws_utilities.sendToAll(_APP.m_draw._VRAM);
				}
				
				// Update the Python server. (ArrayBuffer)
				_APP.m_websocket_python.wsClient.send(_APP.m_draw._VRAM);
			}
			
			_APP.timeIt("FULLLOOP", "e");
	
			// _APP.schedule_appLoop();
		}
		// NO
		else{
			_APP.schedule_appLoop();
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