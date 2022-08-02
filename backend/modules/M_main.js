// Packages for THIS module.
const fs   = require('fs');
const path = require('path'); 

// WWS server start
const WSServer = require('ws').WebSocketServer;
// console.log(WSServer.);
// Modules saved within THIS module.
const m_config      = require('./m_config.js');
const m_gpio        = require('./m_gpio.js');
const m_lcd         = require('./m_lcd.js');
const m_screenLogic = require('./m_screenLogic.js');
const m_battery     = require('./m_battery.js');
const m_s_timing    = require('./m_s_timing.js');

// Main app.
let _APP = {
	// Express variables.
	app      : null,
	express  : null,
	wss      : null,

	// Manual route list. (Emulates something like route annotations.)
	routeList: {}, 

	// MODULES (_APP will have access to all the modules.)
	m_config      : m_config ,
	m_gpio        : m_gpio ,
	m_lcd         : m_lcd  ,
	m_screenLogic : m_screenLogic ,
	m_battery     : m_battery ,
	m_s_timing    : m_s_timing ,

	screens: [
		"main", 
		"timings_test",
		"drawingTest"
	],
	// currentScreen : "main",
	// currentScreen : "timings_test",
	currentScreen : "drawingTest",

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
			_APP.timeIt("M_main", "s");   await _APP         .module_init(_APP); _APP.timeIt("M_main", "e");
			_APP.timeIt("m_config", "s"); await _APP.m_config.module_init(_APP); _APP.timeIt("m_config", "e");
			
			if(_APP.m_config.config.ws.active){
				_APP.timeIt("WSServer", "s"); 
				_APP.wss = new WSServer({ server: _APP.server }); 
				_APP.server.on('request', _APP.app); 
				_APP.timeIt("WSServer", "e");
			}
			else{
				_APP.timeIt("WSServer", "s"); 
				_APP.wss = null;
				_APP.timeIt("WSServer", "e");
			}
			
			_APP.timeIt("m_gpio", "s");        await _APP.m_gpio       .module_init(_APP);_APP.timeIt("m_gpio", "e");
			_APP.timeIt("m_battery", "s");     await _APP.m_battery    .module_init(_APP);_APP.timeIt("m_battery", "e");
			_APP.timeIt("m_lcd", "s");         await _APP.m_lcd        .module_init(_APP);_APP.timeIt("m_lcd", "e");
			_APP.timeIt("m_screenLogic", "s"); await _APP.m_screenLogic.module_init(_APP);_APP.timeIt("m_screenLogic", "e");
			_APP.timeIt("m_s_timing", "s");    await _APP.m_s_timing   .module_init(_APP);_APP.timeIt("m_s_timing", "e");

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
			// Ensure only integers will be used.
			newFPS = Math.floor(newFPS);

			// If FPS is 60 (max) then there is no time between frames which will block anything that is outside of the main game loop such as debug.)
			if(newFPS >= 60){ newFPS=59; }
			
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
		if(runLoop){
			_APP.timeIt("FULLLOOP", "s");
			_APP.stats._then = _APP.stats.now - (_APP.stats.delta % _APP.stats.interval);
			_APP.fps.tick();
	
			// BUTTONS
			_APP.timeIt("GPIO", "s");
			_APP.m_gpio.readAll();
			_APP.timeIt("GPIO", "e");
			
			// BUTTON ACTIONS.
			_APP.timeIt("GPIO_ACTIONS", "s");
			_APP.m_gpio.buttonActions();
			_APP.timeIt("GPIO_ACTIONS", "e");
			
			// STATE
			_APP.timeIt("LOGIC", "s");
			await _APP.m_screenLogic.screens[_APP.currentScreen].func();
			_APP.timeIt("LOGIC", "e");
			
			// UPDATE DISPLAY(S)
			_APP.timeIt("DISPLAYUPDATE", "s");
			if(_APP.m_lcd.canvas.lcdUpdateNeeded && !_APP.m_lcd.canvas.updatingLCD){ 
				await _APP.m_lcd.canvas.updateFrameBuffer();
			}
			_APP.timeIt("DISPLAYUPDATE", "e");
			
			_APP.timeIt("FULLLOOP", "e");
	
			if(_APP.currentScreen == "drawingTest"){
				// console.log(`FULLLOOP: ${_APP.currentScreen}: ${_APP.timeIt("FULLLOOP", "t").toFixed(2).padStart(10, " ")}`);
			}

			_APP.schedule_appLoop();
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