// Packages for THIS module.
const fs   = require('fs');
const path = require('path'); 

// WWS server start
const WSServer = require('ws').Server;

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
			console.log("INIT: M_main");
			await _APP         .module_init(_APP);
			
			// CONFIG FIRST.
			console.log("INIT: m_config");
			await _APP.m_config.module_init(_APP);
			
			// 2 seems solid.
			_APP.fps.setFpsInterval( _APP.m_config.config.lcd.fps );
			
			if(_APP.m_config.config.ws.active){
				console.log("INIT: WSServer");
				_APP.wss = new WSServer({ server: _APP.server });
				_APP.server.on('request', _APP.app);
			}
			else{
				_APP.wss = null;
			}
			
			console.log("INIT: m_gpio");        await _APP.m_gpio       .module_init(_APP);
			console.log("INIT: m_battery");     await _APP.m_battery    .module_init(_APP);
			console.log("INIT: m_lcd");         await _APP.m_lcd        .module_init(_APP);
			console.log("INIT: m_screenLogic"); await _APP.m_screenLogic.module_init(_APP);
			console.log("INIT: m_s_timing");    await _APP.m_s_timing   .module_init(_APP);

			// Init the canvas
			await _APP.m_lcd.canvas.init();

			// SET AN LCD DRAW TO BE NEEDED.
			_APP.m_lcd.canvas.lcdUpdateNeeded = true;
			await _APP.m_lcd.canvas.updateFrameBuffer();
			
			// Start the appLoop.
			appLoop( performance.now() );
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
	timeIt: function(key, type, toConsole=false){
		if(type == "s"){
			_APP.timeIt_timings[key] = {
				// performance.now
				s: performance.now(),
				e: 0,
				t: 0,
			};
			if(toConsole){ console.log(key, "START"); }
		}
		else if(type == "e"){
			if(_APP.timeIt_timings[key]){
				// performance.now
				_APP.timeIt_timings[key].e = performance.now();
				_APP.timeIt_timings[key].t = _APP.timeIt_timings[key].e - _APP.timeIt_timings[key].s;
				if(toConsole){ console.log(key, "END", _APP.timeIt_timings[key].t); }
			}
		}
		else if(type == "t"){
			if(_APP.timeIt_timings[key]){
				return _APP.timeIt_timings[key].t;
			}
			return 0;
		}
	},

	// Calculates the average frames per second.
	fps : {
		// colxi: https://stackoverflow.com/a/55644176/2731377
		sampleSize : 60,    
		value : 0,
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
			// store current timestamp
			this._lastTick_ = now;
			// increase sample index counter, and reset it
			// to 0 if exceded maximum sampleSize limit
			this._index_++;
			if( this._index_ === this.sampleSize) this._index_ = 0;
			this.average = this.value;
			return this.value;
		},
		setFpsInterval: function(newFPS){
			// Ensure only integers will be used.
			newFPS = Math.floor(newFPS);

			// If FPS is 60 (max) then there is no time between frames which will block anything that is outside of the main game loop such as debug.)
			if(newFPS >= 60){ newFPS=59; }
			
			// Make sure at least 1 fps is set. 
			if(newFPS <= 0){ newFPS=1; }

			// Set the values. 
			this._sample_   = []   ;
			this._index_    = 0    ;
			this._lastTick_ = false;

			this.now      = performance.now();
			this._then    = performance.now();
			this.delta    = 0;

			this.fps      = newFPS;
			this.interval = 1000/newFPS;
		},
	},	

	scheduleNextLoop: function(){
		// Start right away.
		// loop2(performance.now());

		// Start next loop immediately after thie current event loop finishes.
		// setImmediate( ()=>{ loop2(performance.now()); } );

		// Start next loop at the next iteration of the event loop.
		// process.nextTick( ()=>{ loop2(performance.now()); } );

		// setTimeout -- Gives a little "breathing room" for the CPU.
		setTimeout(function(){
			loop2(performance.now());
		}, 10);
	},
};

let stats = {
	lastFullRun: performance.now(),
	last:{
		loopTime    :0,
		framesCost  :0,
		lastLoop    :0,
		interval    :0,
		intervalDiff:0,
		lostFrames  :0,
		lostMs      :0,
	},
};
let appLoop = async function(timestamp){
	// timestamp should be performance.now().
	
	// How long has it been since a full loop has been completed?
	let timeSinceLastRun = timestamp - stats.lastFullRun;
	// console.log("timeSinceLastRun",timeSinceLastRun);

	// Should the full loop run?
	let runLoop = timeSinceLastRun > _APP.fps.interval ? true : false;
	let diff = timeSinceLastRun - _APP.fps.interval;

	// YES
	if(runLoop){
		// full loop start: performance.now();
		_APP.timeIt("FULLLOOP", "s");

		let loopStart = performance.now();
		stats.lastFullRun = loopStart;
		
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
		
		// MISC
		// _APP.timeIt("BATTERY", "s");
		// _APP.m_battery.func();
		// _APP.timeIt("BATTERY", "e");

		// // MISC
		// _APP.timeIt("TIME", "s");
		// await _APP.m_lcd.timeUpdate.func();
		// _APP.timeIt("TIME", "e");

		// UPDATE DISPLAY(S)
		_APP.timeIt("DISPLAYUPDATE", "s");
		if(_APP.m_lcd.canvas.lcdUpdateNeeded && !_APP.m_lcd.canvas.updatingLCD){ 
			await _APP.m_lcd.canvas.updateFrameBuffer();
		}
		_APP.timeIt("DISPLAYUPDATE", "e");
		
		// full loop complete: performance.now();
		let loopEnd = performance.now();

		// let addToEnd = ( (loopEnd-loopStart)/_APP.fps.interval );
		
		_APP.fps.tick();

		_APP.timeIt("FULLLOOP", "e");

		// stats.lastFullRun = loopEnd;

		stats.last.loopTime     = (loopEnd-loopStart)                    ; // 
		stats.last.framesCost   = ((loopEnd-loopStart)/_APP.fps.interval); // 
		stats.last.lastLoop     = timeSinceLastRun                       ; // 
		stats.last.interval     = _APP.fps.interval                      ; // 
		stats.last.intervalDiff = diff                                   ; // 
		stats.last.lostFrames   = (diff/_APP.fps.interval)               ; // 
		stats.last.lostMs       = (diff/_APP.fps.interval)*_APP.fps.interval ;
		stats.last.avgFps       = (_APP.fps.value) ;

		if(0){
			console.log( 
				"GPIO:"   , _APP.timeIt("GPIO", "t")   .toFixed(2).padStart(6, " ")   + ", " +
				"LOGIC:"  , _APP.timeIt("LOGIC", "t")  .toFixed(2).padStart(6, " ")   + ", " +
				"BATTERY:", _APP.timeIt("BATTERY", "t").toFixed(2).padStart(6, " ")   + ", " +
				"TIME:"   , _APP.timeIt("TIME", "t")   .toFixed(2).padStart(6, " ")   + ", " +
				"AVG FPS:", ` ${stats.last.avgFps      .toFixed(0).padStart(2, " ")}` + ", " +
				""
			 );
		}
		if(0){
			console.log(
				`LOOP *** `       +                     
				`Time:`           + ` ${stats.last.loopTime    .toFixed(2).padStart(6, " ") }, ` +
				`Frames cost:`    + ` ${stats.last.framesCost  .toFixed(2).padStart(6, " ") }, ` +
				`Last:`           + ` ${stats.last.lastLoop    .toFixed(2).padStart(6, " ") }, ` +
				`> `              + ` ${stats.last.interval    .toFixed(2).padStart(4, " ") }, ` +
				`By `             + ` ${stats.last.intervalDiff.toFixed(2).padStart(6, " ") }, ` +
				`Waiting frames:` + ` ${stats.last.lostFrames  .toFixed(2).padStart(6, " ") }, ` +
				`Waiting ms:`     + ` ${stats.last.lostMs      .toFixed(2).padStart(6, " ") }, ` +
				`AVG FPS:`        + ` ${stats.last.avgFps      .toFixed(0).padStart(2, " ") } ` +
				""
			);
		}

		setTimeout(function(){
			// appLoop( loopEnd + addToEnd );
			// appLoop( loopEnd - addToEnd );
			appLoop( loopEnd );
		}, 10);
	}
	// NO
	else{
		// setTimeout -- Gives a little "breathing room" for the CPU.
		// console.log(
		// 	"NO LOOP", 
		// 	timeSinceLastRun.toFixed(2), 
		// 	(-1*diff).toFixed(2), 
		// 	`I: ${stats.last.interval.toFixed(2)}` 
		// );
		setTimeout(function(){
			appLoop( performance.now() );
		}, 10);
	}
};

let innerLoop = function(){
	return new Promise(async function(res_loop, rej_loop){
		// Render output.
		//
		
		// Get user inputs.
		_APP.timeIt("readbuttons", "s");
		_APP.m_gpio.readAll();
		_APP.timeIt("readbuttons", "e");
		
		// Run func for the current screen state.
		_APP.timeIt("l_" + _APP.currentScreen, "s");
		_APP.m_screenLogic.screens[_APP.currentScreen].func();
		// _APP.timeIt("batt", "s");
		// _APP.m_battery.func();
		// _APP.timeIt("batt", "e");
		_APP.timeIt("l_" + _APP.currentScreen, "e");

		// UPDATE THE TIMINGS DISPLAY.
		if(_APP.currentScreen == "timings_test"){
			// Get the previous lines length. 
			let thisScreen = _APP.m_screenLogic.screens[_APP.currentScreen];
			let len = thisScreen.lines.length;

			// Get the LCD config.
			let c = _APP.m_config.config.lcd;
			let ts = c.tilesets[c.activeTileset];

			// Clear the previous display region.
			_APP.m_lcd.canvas.fillTile("tile3"  , 0, 0, 24, len); 
			
			// Clear the lines. 
			thisScreen.lines = [];
			
			// for(let k in _APP.timeIt_timings){
				// 	thisScreen.lines.push(
					// 		k.padEnd(15, " ") + ":" + 
					// 		Number(_APP.timeIt(k, "t")).toFixed(2)
					// 		.padStart(8, " ")
			// 	);
			// }
			// thisScreen.lines.push(".".repeat(24))
			// thisScreen.lines.push("readbuttons"   .padEnd(15, " ") + ":" + Number(_APP.timeIt("readbuttons"   , "t")).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push("l_timings_test".padEnd(15, " ") + ":" + Number(_APP.timeIt("l_timings_test", "t")).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push(" time"         .padEnd(15, " ") + ":" + Number(_APP.timeIt("time"          , "t")).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push(" batt"         .padEnd(15, " ") + ":" + Number(_APP.timeIt("batt"          , "t")).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push(" buttons"      .padEnd(15, " ") + ":" + Number(_APP.timeIt("buttons"       , "t")).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push(" cursor"       .padEnd(15, " ") + ":" + Number(_APP.timeIt("cursor"        , "t")).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push("updatescreen"  .padEnd(15, " ") + ":" + Number(_APP.timeIt("updatescreen"  , "t")).toFixed(2).padStart(8, " "));
			
			// thisScreen.lines.push(".".repeat(24));
			// thisScreen.lines.push("interval"      .padEnd(15, " ") + ":" + Number(_APP.fps.interval).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push("set fps"       .padEnd(15, " ") + ":" + Number(_APP.fps.fps)     .toFixed(2).padStart(8, " "));
			// thisScreen.lines.push("avg fps"       .padEnd(15, " ") + ":" + Number(_APP.fps.average) .toFixed(2).padStart(8, " "));
			// thisScreen.lines.push("delta"         .padEnd(15, " ") + ":" + Number(_APP.fps.delta)   .toFixed(2).padStart(8, " "));
			// thisScreen.lines.push(".".repeat(24));
			// thisScreen.lines.push("lcd_buff_gen"  .padEnd(15, " ") + ":" + Number(_APP.timeIt("lcd_buff_gen"  , "t")).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push("lcd_buff_send" .padEnd(15, " ") + ":" + Number(_APP.timeIt("lcd_buff_send" , "t")).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push("ws_buff_gen"   .padEnd(15, " ") + ":" + Number(_APP.timeIt("ws_buff_gen"   , "t")).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push("ws_buff_send"  .padEnd(15, " ") + ":" + Number(_APP.timeIt("ws_buff_send"  , "t")).toFixed(2).padStart(8, " "));
			// thisScreen.lines.push("ws active"     .padEnd(15, " ") + ":" + Number(_APP.m_config.config.ws.active).toFixed(0).padStart(8, " "));
			// thisScreen.lines.push("ws clients"    .padEnd(15, " ") + ":" + Number(_APP.m_lcd.WebSocket.getClientCount()).toFixed(0).padStart(8, " "));
			// thisScreen.lines.push(".".repeat(24));
			let y=0;

			_APP.timeIt("timings_test2", "s");
			// for(let v of thisScreen.lines){ _APP.m_lcd.canvas.print(v  , 0 , y++); }

			_APP.timeIt("timings_test2", "e");
			// console.log("timings_test2:", _APP.timeIt("timings_test2", "t"));
			// console.log(_APP.m_lcd.canvas.tileImages);
		}
		
		// // Update the LCD and ws buffer send.
		_APP.timeIt("updatescreen", "s");
		if(_APP.m_lcd.canvas.lcdUpdateNeeded && !_APP.m_lcd.canvas.updatingLCD){ 
			await _APP.m_lcd.canvas.updateFrameBuffer(); // FRAMEBUFFER UPDATE.
		}
		_APP.timeIt("updatescreen", "e");

		res_loop();
	});

};
let loop2 = async function(timestamp){
	// Should the loop run?

	// Update the timing values.
	_APP.fps.now           = timestamp;
	_APP.fps.delta         = _APP.fps.now - _APP.fps._then;
	_APP.fps.nextFrameTime = _APP.fps.now + _APP.fps.interval ;

	// Ready to run a graphics/logic update?
	let is_deltaOverInterval = (_APP.fps.delta >= _APP.fps.interval ? true : false) ;
	_APP.fps.overBy = _APP.fps.delta - _APP.fps.interval;
	_APP.fps.ms_untilNextScheduledLoop = _APP.fps.nextFrameTime - _APP.fps.now;

	// Ready for the next loop?
	if(is_deltaOverInterval) {
		// Update the timing data.
		_APP.fps._then = _APP.fps.now - (_APP.fps.delta % _APP.fps.interval);

		// Call the inner loop.
		await innerLoop();
		
		// Calculate the average FPS.
		_APP.fps.tick();

		// Set the stamp for this loop run.

		// Update the timing data.
		// _APP.fps._then = _APP.fps.now - (_APP.fps.delta % _APP.fps.interval);
		// _APP.fps._then = _APP.fps.now ;

		// _APP.fps._then = performance.now();

		// console.log("yes");

		// Set next loop call.
		_APP.scheduleNextLoop();
		return;
	}
	// No. Do something else?
	else{
		//
		if(console._LOG_BUFFER){
			// console.log("nothing", _APP.fps.delta );
			// console._LOG_BUFFER.flush();
		}
		else{
			// console.log("nothing", _APP.fps.delta );
		}
		// console.log("no");

		// Update the LCD and ws buffer send.
		// _APP.timeIt("updatescreen", "s");
		// await _APP.m_lcd.canvas.updateFrameBuffer(); // FRAMEBUFFER UPDATE.
		// _APP.timeIt("updatescreen", "e");

		// Set next loop call.
		_APP.scheduleNextLoop();
	}
};






let checks = {
	logic: { last:0, run: false },
	draw: { last:0, run: false },
}
let loop = async function(timestamp){
	checks.logic.run = timestamp - checks.logic.last > 1;
	checks.draw.run = timestamp - checks.draw.last > 30 && _APP.m_lcd.canvas.lcdUpdateNeeded;

	// RUN LOGIC.
	if(checks.logic.run){
		// READ THE BUTTONS.
		_APP.timeIt("readbuttons", "s");
		let states = _APP.m_gpio.readAll();
		_APP.timeIt("readbuttons", "e");
		// console.log(states);
		_APP.timeIt("l_" + _APP.currentScreen, "s");
		_APP.m_screenLogic.screens[_APP.currentScreen].func();
		_APP.timeIt("l_" + _APP.currentScreen, "e");
		
		checks.logic.last = timestamp; 
	}

	// UPDATE THE LCD DISPLAY.
	if(checks.draw.run){
		_APP.timeIt("updatescreen", "s");
		await _APP.m_lcd.canvas.updateFrameBuffer(); // FRAMEBUFFER UPDATE.
		_APP.timeIt("updatescreen", "e");
		
		checks.draw.last = performance.now();
	}
	else{
	}

	setImmediate( ()=>{ loop(performance.now()); } );
};

// Save app and express to _APP and then return _APP.
module.exports = function(app, express, server){
	_APP.app     = app;
	_APP.express = express;
	_APP.server  = server;
	return _APP;
};