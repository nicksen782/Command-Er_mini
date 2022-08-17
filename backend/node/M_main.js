// Packages for THIS module.
const fs   = require('fs');
const os       = require('os');
const path = require('path'); 

// Modules saved within THIS module.
const m_modules = [
	'./m_config.js', // Must be first!
	'./m_gpio.js',
	'./m_draw.js',
	'./m_canvas.js',
	'./m_websocket_node.js',
	'./m_websocket_python.js',
	'./m_drawLoop.js'
];
const rpbp = require( './removeprocess.js' ).run;

// Screen modules saved within THIS module.
const m_screens = [
	'./m_s_title.js',
	'./m_s_test_1.js',
];

// Main app.
let _APP = {
	// Express variables.
	app      : null,
	express  : null,
	wss      : null,

	// Manual route list. (Emulates something like route annotations.)
	routeList: {}, 

	// MODULES (_APP will have access to all the modules.)
	rpbp         : rpbp ,

	// Init this module.
	module_init: function(parent){
		return new Promise(async function(resolve,reject){
			let key = path.basename(__filename, '.js');
			_APP.consolelog(".".repeat(54), 0);
			_APP.consolelog(`START: module_init: ${key} :`, 0);
			_APP.timeIt(`${key}`, "s"); 
			
			_APP.consolelog("add modules", 2);
			for(let i=0; i<m_modules.length; i+=1){
				let key = path.basename(m_modules[i], '.js');
				_APP[key] = require( m_modules[i] );
				_APP.consolelog(`Added: ${key}`, 4);
			}

			// Add the screen requires.
			_APP.consolelog("add screens", 2);
			for(let i=0; i<m_screens.length; i+=1){
				let key = path.basename(m_screens[i], '.js');
				_APP.screens.push(key);
				_APP[key] = require( m_screens[i] );
				_APP.consolelog(`Added: ${key}`, 4);
			};

			// Add routes.
			_APP.consolelog("addRoutes", 2);
			_APP.addRoutes(_APP.app, _APP.express);

			_APP.timeIt(`${key}`, "e");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt(`${key}`, "t").toFixed(3).padStart(9, " ")} ms`, 0);
			_APP.consolelog(".".repeat(54), 0);
			_APP.consolelog("", 0);

			//
			await _APP.m_config.get_configs();

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
			// MODULE INITS.
			for(let i=0; i<m_modules.length; i+=1){
				let key = path.basename(m_modules[i], '.js');
				if(!_APP[key].moduleLoaded){
					_APP.consolelog(".".repeat(54), 0);
					let line1 = `START: module_init: ` + " ".repeat(4);
					line1+= `${key.toUpperCase()}`.padEnd(20, " ");
					line1+= ` : `;
					line1+= `(${ (i+1) + "/" + m_modules.length })`.padStart(7, " ");
					_APP.consolelog(line1, 0);
					_APP.timeIt(`${key}`, "s"); await _APP[key].module_init(_APP); _APP.timeIt(`${key}`, "e");
					_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt(`${key}`, "t").toFixed(3).padStart(9, " ")} ms`, 0);
					_APP.consolelog(".".repeat(54), 0);
					_APP.consolelog("");
				}
			}
			
			// SCREENS
			for(let i=0; i<m_screens.length; i+=1){
				let key = path.basename(m_screens[i], '.js');
				if(!_APP[key].moduleLoaded){
					_APP.consolelog(".".repeat(54), 0);
					let line1 = `START: module_init: ` + " ".repeat(4);
					line1+= `${key.toUpperCase()}`.padEnd(20, " ");
					line1+= ` : `;
					line1+= `(${ (i+1) + "/" + m_screens.length })`.padStart(7, " ");
					_APP.consolelog(line1, 0);
					_APP.timeIt(`${key}`, "s"); await _APP[key].module_init(_APP, key); _APP.timeIt(`${key}`, "e");
					_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt(`${key}`, "t").toFixed(3).padStart(9, " ")} ms`, 0);
					_APP.consolelog(".".repeat(54), 0);
					_APP.consolelog("");
				}
			};

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
	
		// _APP.consolelog(`Removing processes using ports: ${ports}`, 2);
	
		//
		let closed = [];
		return new Promise(async function(resolve,reject){
			// Add promises for each removal.
			let proms = [];
			let responses = [];
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
											if(display){ 
												// _APP.consolelog(`${data.text}`, 2); 
												responses.push(data.text);
											} 
										}
									}
								}
								
								// Error.
								else{ 
									// _APP.consolelog(`ERROR: ${data}`, 4); 
									responses.push(data);
								}
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
				// _APP.consolelog(`Processes were removed on these ports: ${closed}`, 2);
				resolve(responses);
			}
			else{
				// _APP.consolelog(`No matching processes were found.`, 2);
				resolve(responses);
			}

			// resolve();
		})
	},

	consolelog: function(str, indent=2){
		// m_config isn't loaded yet. Print the message anyway.
		let prefix = "[LOG]  :";

		if(!_APP.m_config ){ 
			console.log(`${prefix}${" ".repeat(indent)}`, str);
			return; 
		}
		// m_config is loaded but not inited yet. Print the message anyway.
		else if(_APP.m_config.config && !_APP.m_config.config.toggles){ 
			console.log(`${prefix}${" ".repeat(indent)}`, str);
			return; 
		}
		// Do the normal checks. 
		else{
			try{
				if(_APP.m_config.config.toggles.show_APP_consolelog){
					prefix = "[LOG] ::";
					console.log(`${prefix}${" ".repeat(indent)}`, str);
				}
			}
			catch(e){
				console.log(e);
				// console.log(`${prefix}${" ".repeat(indent)}`, str);
			}
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
		_lastTick_: performance.now(),
		tick : function(now){
			// if is first tick, just set tick timestamp and return
			if( !this._lastTick_ ){
				// this._lastTick_ = performance.now();
				this._lastTick_ = now;
				return 0;
			}
			// calculate necessary values to obtain current tick FPS
			// let now = performance.now();
			let delta = (now - this._lastTick_)/1000;
			let fps = 1/delta;
			// add to fps samples, current tick fps value 
			this._sample_[ this._index_ ] = Math.round(fps);
			// this._sample_[ this._index_ ] = Math.floor(fps);
			// this._sample_[ this._index_ ] = Math.ceil(fps);
			
			// iterate samples to obtain the average
			let average = 0;
			for(i=0; i<this._sample_.length; i++) average += this._sample_[ i ];
			// average = Math.round( average / this._sample_.length);
			average = Math.round( average / this.sampleSize);
			// average = Math.floor( average / this.sampleSize);
			// average = Math.ceil( average / this.sampleSize);
	
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
		init: function(sampleSize){
			// Set the values. 
			this.sampleSize = sampleSize;
			// this.sampleSize = 60;

			// Create new samples array (typed.)
			this._sample_ = new Uint8Array( new ArrayBuffer(this.sampleSize) )
			// for (let i=0; i<this.sampleSize; ++i) { this._sample_[i] = this.sampleSize; }
			for (let i=0; i<this.sampleSize; ++i) { this._sample_[i] = sampleSize; }
			// for (let i=0; i<this.sampleSize; ++i) { this._sample_[i] = 0; }
			
			this._index_    = 0 ;
			this.value      = sampleSize ;
			this.average    = sampleSize ;
			this._lastTick_ = false ;
		},
	},	

	// Used by APP LOOP.
	stats : {
		now      : performance.now(),
		_then    : performance.now(),
		delta    : 0,
		fps      : 0,
		interval : 0,
		lastDiff : 0,
	
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

	// Displays system data (using during application init.)
	displaySysData_init: function(){
		// Display system data.
		_APP.consolelog(".".repeat(54), 0);
		_APP.consolelog(`START: sysData :`, 0);
		_APP.timeIt(`sysData`, "s"); 
		let sysData = _APP.getSysData();
		for(let key in sysData){
			let line1 = `${key.toUpperCase()}`.padEnd(12, " ") +": "+ `${JSON.stringify(sysData[key],null,0)}`;
			_APP.consolelog(line1, 2);
		}
		_APP.timeIt(`sysData`, "e"); 
		_APP.consolelog(`END  : TIME: ${_APP.timeIt(`sysData`, "t").toFixed(3).padStart(9, " ")} ms`, 0);
		_APP.consolelog(".".repeat(54), 0);
		_APP.consolelog("");
	},

	// Returns system data.
	getSysData :function(){ 
		return {
			platform  : os.platform(),
			type      : os.type(),
			release   : os.release(),
			arch      : os.arch(),
			cpus      : os.cpus().map( d=> { return {model: d.model, speed: d.speed }; } ) ,
			endianness: os.endianness(),
			memory    : { freemem: os.freemem().toLocaleString(), totalmem: os.totalmem().toLocaleString() },
			network   : (()=>{
				let data = os.networkInterfaces();
				let resp = [];
				for(let key in data){
					// console.log("**", key);
					for(let key2 in data[key]){
						let rec = data[key][key2];
						if(!rec.internal && rec.family == "IPv4"){ resp.push({"iface": key, "cidr": rec.cidr}); }
					}
				}
				return resp;
			})(), 
			userInfo  : (()=>{
				let data = os.userInfo();
				return {"username": data.username, "homedir": data.homedir, "shell": data.shell} ;
			})(),
			cwd       : process.cwd(),
			tmpdir    : os.tmpdir(),
		};
	},

	// *****************
	
	screens: [], // Populated by this module_init.
	// currentScreen : "m_s_test_1",
	currentScreen : "m_s_title",
	screenLogic: {
		shared: {
			// Changing screens. 
			changeScreen:{
				prev:function(){
					// Find the index of the current screen.
					let index = _APP.screens.indexOf(_APP.currentScreen);
					let canMove = index > 0;
					if(canMove){ 
						// Remove the init flag of the current screen.
						_APP.screenLogic.screens[_APP.currentScreen].inited = false;

						// Change to the new screen. 
						_APP.currentScreen = _APP.screens[index -1];
						_APP.screenLogic.screens[_APP.currentScreen].init();
					}
				},
				next:function(){
					// Find the index of the current screen.
					let index = _APP.screens.indexOf(_APP.currentScreen);
					let canMove = index < _APP.screens.length-1;
					let newScreen = false;
					if(canMove){ 
						// Remove the init flag of the current screen.
						_APP.screenLogic.screens[_APP.currentScreen].inited = false;

						// Change to the new screen. 
						_APP.currentScreen = _APP.screens[index +1];
						_APP.screenLogic.screens[_APP.currentScreen].init();
					}
				},
				specific:function(key){
					// Is this a valid key?
					if( _APP.screens.indexOf(key) != -1){
						// Remove the init flag of the current screen.
						_APP.screenLogic.screens[_APP.currentScreen].inited = false;

						// Change to the new screen. 
						_APP.currentScreen = key;
						_APP.screenLogic.screens[_APP.currentScreen].init();
					}
					else{
						console.log("changeScreen.specific: Unknown screen key:", key);
					}
				},
			},

			// Display the time.
			time: {
				display: function(x=0, y=29, tile="tile3"){
					var d = new Date(); // for now
					let h = d.getHours();
					let ampm="AM";
					if (h > 12) { h -= 12; ampm="PM";} 
					else if (h === 0) { h = 12; }
					h=h.toString().padStart(2, " ");
			
					let m = d.getMinutes().toString().padStart(2, "0");
					let s = d.getSeconds().toString().padStart(2, "0");
					let str = `${h}:${m}:${s}${ampm}`;
	
					_APP.m_draw.fillTile(tile, x, y, 11, 1); 
					_APP.m_draw.setTile("clock1", x, y);
					_APP.m_draw.print(str, x+1, y);
				},
			},

			// Display battery info.
			battery:{
				chargeFlag:false,
				lastBattery:{},
				lastBatteryUpdate:0,
				display: function(x=23, y=29, tile="tile3"){
					let json = this.lastBattery;
					firstLoad=false;
					if(!json['%']){
						firstLoad=true;
						// console.log("Battery data has not been populated yet.");
						// return; 
					}
			
					// DEBUG
					// if(!json['%']){ json = {'%': 100.0}; }
					// else{ json['%'] = 100.0; }
	
					// CREATE THE STRING. 
					let str;
					let batIcon;
					if(!firstLoad){
						str = ( json['%'].toFixed(1) + "%" ).padStart(6, " ");
	
						// DETERMINE WHICH BATTERY ICON TO DISPLAY.
						if     (json['%'] <=25){ batIcon = "batt1"; } // RED
						else if(json['%'] <=50){ batIcon = "batt2"; } // ORANGE
						else if(json['%'] <=80){ batIcon = "batt3"; } // YELLOW
						else                   { batIcon = "batt4"; } // GREEN
					}
					else{
						// str = "LOAD".padStart(6, " ");
						str = "------".padStart(6, " ");
					}
	
					// Provide a background for the battery text. (str.length should be 6.)
					_APP.m_draw.fillTile(tile, x+1, y, str.length, 1); 
					
					if(!firstLoad){
						// Set the tile for the battery icon and charge indicator.
						_APP.m_draw.setTile(batIcon, x, y); 
	
						// Show the battery indicator?
						if(Math.sign(json['A']) == 1){
							// Change the charge indictator icon periodically.
							if(performance.now() - this.lastBatteryUpdate > (_APP.screenLogic.shared.secondsToFramesToMs(1))){
								this.chargeFlag = !this.chargeFlag;
								this.lastBatteryUpdate = performance.now();
							}
							
							// Display the charge indicator.
							if(this.chargeFlag){ _APP.m_draw.setTile("battcharge1", x, y, 2); }
							else{                _APP.m_draw.setTile("battcharge2", x, y, 2); }
						}
						else{
							_APP.m_draw.setTile(" ", x, y, 2); 
						}
					}
					else{
						// _APP.m_draw.setTile("L", x, y, 2); 
					}
					_APP.m_draw.print(str, x+1, y);
			
				},
			},

			// Provide seconds (can be decimal) and get the number of frames in that period rounded up.
			secondsToFrames: function(seconds){
				// Resolution is affected by the actual frame rate.
				let frames = Math.ceil( (seconds*1000) /_APP.stats.interval );
				return frames;
			},
			// Provide seconds (can be decimal) and get the actual time back based on what is allowed by the framerate resolution.
			secondsToFramesToMs: function(seconds){
				// Resolution is affected by the actual frame rate.
				let frames = _APP.screenLogic.shared.secondsToFrames(seconds);
				ms = Math.ceil(frames * _APP.stats.interval) ;
				return ms;
			},
		},
		screens: {},
	},
};

// Save app and express to _APP and then return _APP.
module.exports = async function(app, express, server){
	// Set these into _APP.
	_APP.app     = app;
	_APP.express = express;
	_APP.server  = server;

	// Return a reference to _APP.
	return _APP;
};