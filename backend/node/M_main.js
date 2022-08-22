// Packages for THIS module.
const fs   = require('fs');
const os       = require('os');
const path = require('path'); 
const child_process = require('child_process'); 

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
	'./m_s_host_select.js',
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
			_APP.timeIt(`${key}`, "s", "STARTUP__"); 
			
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

			_APP.timeIt(`${key}`, "e", "STARTUP__");
			_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt(`${key}`, "t", "STARTUP__").toFixed(3).padStart(9, " ")} ms`, 0);
			_APP.consolelog(".".repeat(54), 0);
			_APP.consolelog("", 0);

			//
			await _APP.m_config.get_configs(_APP);

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

		// 
		_APP.addToRouteList({ path: "/changeScreen", method: "post", args: [], file: __filename, desc: "" });
		app.post('/changeScreen'    ,express.json(), async (req, res) => {
			// Pause the drawLoop from running.
			if(_APP.drawLoop) { _APP.drawLoop.pause(); }
			
			// Give enough time for the drawLoop to complete before making the screen change.
			setTimeout(function(){
				// Change the screen.
				_APP.screenLogic.shared.changeScreen.specific(req.body.screen);

				// Unpause. This should be the beginning of the next drawLoop.
				if(_APP.drawLoop) { _APP.drawLoop.unpause(); }

				// Respond to complete the request.
				res.json("");
			}, _APP.timeIt_timings_prev["APPLOOP__"]["FULLLOOP"].t || _APP.stats.interval);

		});

		// 
		_APP.addToRouteList({ path: "/DEBUGCMD", method: "post", args: ['cmd'], file: __filename, desc: "" });
		app.post('/DEBUGCMD'    ,express.json(), async (req, res) => {
			switch(req.body.cmd){
				case "pm2.restart"    : { _APP.screenLogic.shared.pm2.restart();    break; }
				case "process.exit"   : { _APP.screenLogic.shared.process.exit();   break; }
				case "linux.reboot"   : { _APP.screenLogic.shared.linux.reboot();   break; }
				case "linux.shutdown" : { _APP.screenLogic.shared.linux.shutdown(); break; }
				default : { break; }
			};

			// Respond to complete the request.
			res.json("");
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
					_APP.timeIt(`${key}`, "s", "STARTUP__"); await _APP[key].module_init(_APP, key); _APP.timeIt(`${key}`, "e", "STARTUP__");
					_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt(`${key}`, "t", "STARTUP__").toFixed(3).padStart(9, " ")} ms`, 0);
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
					_APP.timeIt(`${key}`, "s", "STARTUP__"); await _APP[key].module_init(_APP, key); _APP.timeIt(`${key}`, "e", "STARTUP__");
					_APP.consolelog(`END  : INIT TIME: ${_APP.timeIt(`${key}`, "t", "STARTUP__").toFixed(3).padStart(9, " ")} ms`, 0);
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
	timeIt: function(key, type, subKey="NOSUBKEY"){
		if(type == "s"){
			if(subKey){ 
				if(!_APP.timeIt_timings     [subKey]){ _APP.timeIt_timings     [subKey] = {}; }
				if(!_APP.timeIt_timings_prev[subKey]){ _APP.timeIt_timings_prev[subKey] = {}; }
				_APP.timeIt_timings[subKey][key] = { s: performance.now(), e: 0, t: 0, }; 
			}
			else{ 
				_APP.timeIt_timings[key]         = { s: performance.now(), e: 0, t: 0, }; 
			}
		}
		else if(type == "e"){
			if(subKey){
				if(_APP.timeIt_timings[subKey][key]){
					_APP.timeIt_timings[subKey][key].e = performance.now();
					_APP.timeIt_timings[subKey][key].t = _APP.timeIt_timings[subKey][key].e - _APP.timeIt_timings[subKey][key].s;
	
					// Add to prev
					// if(!_APP.timeIt_timings_prev[subKey]){ _APP.timeIt_timings_prev[subKey] = {}; }
					_APP.timeIt_timings_prev[subKey][key] = {
						s: _APP.timeIt_timings[subKey][key].s,
						e: _APP.timeIt_timings[subKey][key].e,
						t: _APP.timeIt_timings[subKey][key].t,
					}
				}
			}
			
			else{
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
		}
		else if(type == "t"){
			if(subKey){
				if(_APP.timeIt_timings[subKey][key]){
					return _APP.timeIt_timings[subKey][key].t;
				}
				return -1;
			}
			else{
				if(_APP.timeIt_timings[key]){
					return _APP.timeIt_timings[key].t;
				}
				return -1;
			}
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
		_APP.timeIt(`sysData`, "s", "STARTUP__"); 
		let sysData = _APP.getSysData();
		for(let key in sysData){
			let line1 = `${key.toUpperCase()}`.padEnd(12, " ") +": "+ `${JSON.stringify(sysData[key],null,0)}`;
			_APP.consolelog(line1, 2);
		}
		_APP.timeIt(`sysData`, "e", "STARTUP__"); 
		_APP.consolelog(`END  : TIME: ${_APP.timeIt(`sysData`, "t", "STARTUP__").toFixed(3).padStart(9, " ")} ms`, 0);
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
	currentScreen : "m_s_title",
	// currentScreen : "m_s_host_select",
	// currentScreen : "m_s_test_1",
	screenLogic: {
		shared: {
			// DEBUG?
			linux: {
				reboot: function(){
					// _APP.screenLogic.shared.linux.reboot()
					console.log(":: _APP.screenLogic.shared.linux.reboot ::");
					child_process.exec("sudo reboot now", (err, result)=>{
						if(err) { console.log("err:", err); }
						console.log(result.toString());
					});
				},
				shutdown: function(){
					// _APP.screenLogic.shared.linux.shutdown()
					console.log(":: _APP.screenLogic.shared.linux.shutdown ::");
					child_process.exec("sudo shutdown now", (err, result)=>{
						if(err) { console.log("err:", err); }
						console.log(result.toString());
					});
				},
			},
			process: {
				// End process (if running with PM2 this may restart the process.)
				exit: function(){
					// _APP.screenLogic.shared.process.exit()
					console.log(":: _APP.screenLogic.shared.process.exit ::");
					process.exit(0);
				},
			},
			pm2: {
				restart: function(){
					// _APP.screenLogic.shared.pm2.restart()
					console.log(":: _APP.screenLogic.shared.pm2.restart ::");
					child_process.exec("pm2 restart COMMANDER_MINI", (err, result)=>{
						if(err) { console.log("err:", err); }
						console.log(result.toString());
					});
				},
			},

			getDialogBoxParams: function(x, y, w, h, t1="tile3", t2="tile1", t3="tile3"){
				// Create outer, inner, and text area boxs with the provided values. 
				let box1 = { x:x, y:y, w:w, h:h, t:t1 }; 
				let box2 = { x:box1.x+1, y:box1.y+1, w:box1.w-2, h:box1.h-2, t:t2 }; 
				let box3 = { x:box2.x+1, y:box2.y+1, w:box2.w-2, h:box2.h-2, t:t3 }; 

				return {
					outer: box1,
					inner: box2,
					text : box3,
				};
			},
			createDialogObject : function(config){
				let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
				let dialogDims = thisScreen.shared.getDialogBoxParams(config.x, config.y, config.w, config.h, config.t1, config.t2, config.t3);
				let dialog = { box:{}, cursor:{}, text:{} } ;
				dialog = {
					active: false,
					thisScreen: thisScreen,
					config: config,
					drawn: false,
		
					box: {
						outer: dialogDims.outer,
						inner: dialogDims.inner,
						text : dialogDims.text,
						draw: function(){
							if(dialog.drawn){ return; }
		
							// Draw outer box.
							_APP.m_draw.fillTile(dialog.box.outer.t, dialog.box.outer.x, dialog.box.outer.y,  dialog.box.outer.w, dialog.box.outer.h); 
		
							// Draw inner box.
							_APP.m_draw.fillTile(dialog.box.inner.t, dialog.box.inner.x, dialog.box.inner.y,  dialog.box.inner.w, dialog.box.inner.h); 
		
							// Draw text box.
							_APP.m_draw.fillTile(dialog.box.text.t,  dialog.box.text.x,  dialog.box.text.y,   dialog.box.text.w,  dialog.box.text.h ); 
		
							// Draw text.
							dialog.text.lines.forEach((line, i)=>{
								_APP.m_draw.print(line.padEnd(dialog.box.text.w-1, " ") , dialog.box.text.x, dialog.box.text.y + i);
							});
		
							// 
							dialog.drawn = true; 
		
							// Draw the cursor.
							dialog.cursor.y = dialog.cursor.cursorIndexes[dialog.cursor.index];
							dialog.cursor.draw();
						},
						close: function(){
							// Erase the dialog box. 
							_APP.m_draw.fillTile(config.bgClearTile, dialog.box.outer.x, dialog.box.outer.y,  dialog.box.outer.w, dialog.box.outer.h, 0); 
							_APP.m_draw.fillTile(" ", dialog.box.outer.x, dialog.box.outer.y,  dialog.box.outer.w, dialog.box.outer.h, 1); 
							_APP.m_draw.fillTile(" ", dialog.box.outer.x, dialog.box.outer.y,  dialog.box.outer.w, dialog.box.outer.h, 2); 
							dialog.active = false;
							dialog.drawn = false; 
						},
					},
					cursor: {
						// Position.
						x : dialogDims.text.x, 
						y : dialogDims.text.y, 
						index: 0,
						cursorIndexes: config.cursorIndexes || [],
						
						// Boundaries. (Additionally, a cursor cannot move down to a line that does not have an action.)
						minX : dialogDims.text.x, 
						minY : dialogDims.text.y, 
						maxX : dialogDims.text.x + dialogDims.text.w, 
						maxY : dialogDims.text.y + dialogDims.text.h, 
						
						// Cursor tiles (and blink.)
						t : "cursor3", 
						t1: "cursor3", 
						t2: "cursor4", 
						frameDelay: _APP.screenLogic.shared.secondsToFramesToMs(0.5), 
						lastFrame : performance.now(),
						
						// Functions.
						blink: function(){
							if(!dialog.active){ return; }
							if(!config.usesCursor){ return; }
		
							// Switch the cursor tile?
							if(performance.now() - dialog.cursor.lastFrame > dialog.cursor.frameDelay){
								// Swap the cursor.
								if( dialog.cursor.t == dialog.cursor.t1){ dialog.cursor.t = dialog.cursor.t2; }
								else{ dialog.cursor.t = dialog.cursor.t1; }
		
								// Draw the cursor.
								dialog.cursor.draw();
		
								// Update lastFrame.
								dialog.cursor.lastFrame = performance.now();
							}
						},
						draw: function(){
							if(!dialog.active){ return; }
							if(!config.usesCursor){ return; }
		
							// Draw the tile.
							// _APP.m_draw.setTile(dialog.cursor.t, dialog.cursor.x, dialog.cursor.y); 
							// console.log(dialog.cursor.cursorIndexes, dialog.cursor.index, dialog.cursor.cursorIndexes[dialog.cursor.index]);
							_APP.m_draw.setTile(dialog.cursor.t, dialog.cursor.x, dialog.cursor.cursorIndexes[dialog.cursor.index]); 
						},
						move: function(){
							if(!dialog.active){ return; }
							if(!config.usesCursor){ return; }
		
							// Get the current cursor position.
							let x = dialog.cursor.x;
							let y = dialog.cursor.y;
							let index = dialog.cursor.index;
		
							// Allow the cursor position change?
							if(dialog.cursor.cursorIndexes.length){
								let min = 0;
								let max = dialog.cursor.cursorIndexes.length;
								if     ( _APP.m_gpio.isPress ("KEY_UP_PIN")   && index > min && dialog.cursor.cursorIndexes.indexOf(y-1) != -1) { y -=1; index -= 1; }
								else if( _APP.m_gpio.isPress ("KEY_DOWN_PIN") && index < max && dialog.cursor.cursorIndexes.indexOf(y+1) != -1) { y +=1; index += 1; }
								else{ return; }
							}
							else{
								if     ( _APP.m_gpio.isPress ("KEY_UP_PIN")    && (dialog.cursor.y - 1 >= dialog.cursor.minY) && dialog.text.actions[dialog.cursor.index-1] ) { y -=1; index -= 1; }
								else if( _APP.m_gpio.isPress ("KEY_DOWN_PIN")  && (dialog.cursor.y + 1 <  dialog.cursor.maxY) && dialog.text.actions[dialog.cursor.index+1] ) { y +=1; index += 1; }
								else{ return; }
							}
		
							// Erase the cursor.
							_APP.m_draw.setTile(" ", dialog.cursor.x, dialog.cursor.y); 
		
							// Set the new values.
							dialog.cursor.x = x;
							dialog.cursor.y = y;
							dialog.cursor.index = index;
		
							// Draw the cursor.
							dialog.cursor.draw();
						},
					},
					text: {
						select: function(){
							if(!dialog.active){ return; }
							if     ( _APP.m_gpio.isPress ("KEY_PRESS_PIN") ) { 
								// If the usesCursor is not set then assume that the dialog just needed to be closed. 
								if(!config.usesCursor){ 
									dialog.box.close();
									return; 
								}

								else if(dialog.cursor.cursorIndexes.length){
									dialog.text.actions[dialog.cursor.index]();
								}
		
								// Otherwise run the function that matches the current line.
								else if(dialog.text.actions[dialog.cursor.index]) { dialog.text.actions[dialog.cursor.index](); }

								//
								else{
									console.log("TEXT.SELECT: NO ACTION IS AVAILABLE.");
								}
							}
						},
						lines: config.lines,
						actions: [],
						// actions: config.actions,
					},
				};
		
				// Bind "this" for each function to dialog.
				for(let i=0; i<config.actions.length; i+=1){
					let func = config.actions[i];
					dialog.text.actions.push( func.bind(dialog) );
				}
				
				return dialog;
			},

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

			// Reinit the shared functions (and their timers.)
			doSharedInits: function(){
				// _APP.screenLogic.shared.doSharedInits()
				if(!_APP.screenLogic.shared.time.inited){ _APP.screenLogic.shared.time.init(); }
				if(!_APP.screenLogic.shared.battery.inited){ _APP.screenLogic.shared.battery.init(); }
			},

			// Display the time.
			time: {
				inited         : false,
				timeUpdateMs   : null,
				lastTimeUpdate : null,
				init: function(){
					let shared = _APP.screenLogic.shared;
					this.timeUpdateMs   = shared.secondsToFramesToMs(1);
					this.lastTimeUpdate = performance.now();
					this.inited         = true; 
				},
				updateIfNeeded: function(x = 0, y = 29, tile="tile3"){
					// if(!this.inited){ this.init(); }
					if(performance.now() - this.lastTimeUpdate >= this.timeUpdateMs ){
						_APP.screenLogic.shared.time.display(x,y,tile);
						this.lastTimeUpdate = performance.now();
					}
				},
				display: function(x = 0, y = 29, tile = "tile3"){
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
				chargeFlag           : false,
				lastBattery          : {"V":0, "A":0, "W":0, "%":0, "PV":0, "SV":0, "C":false},
				lastChargeFlagUpdate : null,
				batteryUpdateMs      : null,
				hasUpdate            : null,
				lastBatteryUpdate    : null,
				init: function(){
					let shared = _APP.screenLogic.shared;
					this.batteryUpdateMs      = shared.secondsToFramesToMs(5);
					this.lastBatteryUpdate    = performance.now();
					this.lastChargeFlagUpdate = performance.now();
					this.hasUpdate            = false;
					this.inited               = true; 
				},
				updateIfNeeded: function(x = 23, y = 29, tile = "tile3"){
					// Is it time to request a battery update? 
					if(performance.now() - this.lastBatteryUpdate >= this.batteryUpdateMs ){
						_APP.m_websocket_python.getBatteryUpdate();
						this.lastBatteryUpdate = performance.now();
					}
					// No? Do we already have an update to display?
					else if(this.hasUpdate){
						// console.log(_APP.screenLogic.shared.battery.lastBattery);
						_APP.screenLogic.shared.battery.display(x,y,tile);
						this.hasUpdate = false;
					}
				},
				display: function(x = 23, y = 29, tile = "tile3"){
					let json = this.lastBattery;
					firstLoad=false;
					try{
						if(!json['%']){
							firstLoad=true;
						}
					}
					catch(e){ firstLoad=true; }
			
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
						if(json['C'] == true ){
							// Change the charge indictator icon at each draw.
							this.chargeFlag = !this.chargeFlag;

							// Display the charge indicator.
							if(this.chargeFlag){ _APP.m_draw.setTile("battcharge1", x, y, 2); }
							else{                _APP.m_draw.setTile("battcharge2", x, y, 2); }
						}
						else{
							_APP.m_draw.setTile(" ", x, y, 2); 
						}
					}

					// Display the battery string.
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
		// Populated during init.
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