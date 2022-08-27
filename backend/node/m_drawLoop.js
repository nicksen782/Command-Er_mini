// const fs = require('fs');
// const path = require('path');
// const os   = require('os');
const { EventEmitter } = require('events');

let _APP = null;

let _MOD = {
	moduleLoaded: false,

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			if(!_MOD.moduleLoaded){
				// Save reference to the parent module.
				_APP = parent;
		
				// Add routes.
				_APP.consolelog("addRoutes", 2);
				_MOD.addRoutes(_APP.app, _APP.express);

				// Set the moduleLoaded flag.
				_MOD.moduleLoaded = true;
			}
			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
	},

	// Begins the appLoop.
	startAppLoop: function(){
		// Create new.
		_APP.drawLoop =  new drawLoop();
		
		// 
		_APP.drawLoop.on( 'init'  , _APP.m_drawLoop.initHandler   );
		_APP.drawLoop.on( 'start' , _APP.m_drawLoop.startHandler  );
		_APP.drawLoop.on( 'stop'  , _APP.m_drawLoop.stopHandler   );
		_APP.drawLoop.on( 'update', _MOD.loop.appLoop             );
		
		_APP.drawLoop.emit('init');
		_APP.drawLoop.start();
	},

	// ****************

	// HANDLERS.
	initHandler  : async function(){ 
		// console.log("drawLoop: init");  
	},
	startHandler : async function(){ 
		// console.log("drawLoop: start"); 
	},
	stopHandler  : async function(){ 
		// console.log("drawLoop: stop");  
	},

	loop: {
		doChangesExist: function(obj){
			// Return true at the first sign of a property in the object.
			for(var prop in obj) { if (obj.hasOwnProperty(prop)) { return true;} }
			return false;
		},

		getChangesFlat: function(){
			// Create a flat Uint8Array from the _VRAM_changes.
			let _changesFullFlat2 = new Uint8Array( Object.keys(_APP.m_draw._VRAM_changes).length * 5);
			let index = 0;
			for(let key in _APP.m_draw._VRAM_changes){
				let values = Object.values(_APP.m_draw._VRAM_changes[key]);
				_changesFullFlat2[index+0] = values[0];
				_changesFullFlat2[index+1] = values[1];
				_changesFullFlat2[index+2] = values[2];
				_changesFullFlat2[index+3] = values[3];
				_changesFullFlat2[index+4] = values[4];
				index += 5;
			}
			return _changesFullFlat2 ;
		},
		sendToWsClients: function(data){
			// Update the web clients.
			if( _APP.m_config.config.toggles.isActive_nodeWsServer ){ 
				if(_APP.m_websocket_node.ws_utilities.getClientCount()){

					// VRAM_FULL - (ArrayBuffer) (Appends the binary of "FULL__" to differentiate it.)
					_APP.timeIt("______WSSEND_VRAM_FULL", "s", __filename);
					if(_APP.m_websocket_node.ws_utilities.getClientCount_bySubscription("VRAM_FULL")){
						_APP.m_websocket_node.ws_utilities.sendToAllSubscribers(
							new Uint8Array( Array.from([
								..._APP.m_draw._VRAM_view, 
								...Array.from("FULL__").map(d=>d.charCodeAt(0))
							])
							), "VRAM_FULL"
						);
					}
					_APP.timeIt("______WSSEND_VRAM_FULL", "e", __filename);

					// VRAM_CHANGES only - (ArrayBuffer) (Appends the binary of "PART__" to differentiate it.)
					_APP.timeIt("______WSSEND_VRAM_CHANGES", "s", __filename);
					if(_APP.m_websocket_node.ws_utilities.getClientCount_bySubscription("VRAM_CHANGES")){
						_APP.m_websocket_node.ws_utilities.sendToAllSubscribers(
							new Uint8Array( Array.from([
								..._MOD.loop.getChangesFlat(), 
								...Array.from("PART__").map(d=>d.charCodeAt(0))
							])
							), "VRAM_CHANGES"
						);
					}
					_APP.timeIt("______WSSEND_VRAM_CHANGES", "e", __filename);

					// VRAM update stats0. - (JSON)
					_APP.timeIt("______WSSEND_STATS0", "s", __filename);
					if(_APP.m_websocket_node.ws_utilities.getClientCount_bySubscription("STATS0")){
						_APP.m_websocket_node.ws_utilities.sendToAllSubscribers( JSON.stringify({mode:"STATS0", data:_APP.m_draw._VRAM_changes}), "STATS0" );
					}
					_APP.timeIt("______WSSEND_STATS0", "e", __filename);

					// VRAM update stats1. - (JSON)
					_APP.timeIt("______WSSEND_STATS1", "s", __filename);
					if(_APP.m_websocket_node.ws_utilities.getClientCount_bySubscription("STATS1")){
						_APP.m_websocket_node.ws_utilities.sendToAllSubscribers( JSON.stringify({mode:"STATS1", data:_APP.m_draw._VRAM_updateStats}), "STATS1" );
					}
					_APP.timeIt("______WSSEND_STATS1", "e", __filename);

					// VRAM update stats2. - (JSON)
					_APP.timeIt("______WSSEND_STATS2", "s", __filename);
					if(_APP.m_websocket_node.ws_utilities.getClientCount_bySubscription("STATS2")){
						_APP.m_websocket_node.ws_utilities.sendToAllSubscribers( JSON.stringify({mode:"STATS2", data:_APP.stats.fps}), "STATS2" );
					}
					_APP.timeIt("______WSSEND_STATS2", "e", __filename);

					// stats3. - (JSON)
					_APP.timeIt("______WSSEND_STATS3", "s", __filename);
					if(_APP.m_websocket_node.ws_utilities.getClientCount_bySubscription("STATS3")){
						_APP.m_websocket_node.ws_utilities.sendToAllSubscribers( JSON.stringify({mode:"STATS3", data:_APP.timeIt_timings_prev}), "STATS3" );
						// let data = new Uint8Array( Array.from([
						// 	// ..._APP.m_draw._VRAM_view, 
						// 	...Array.from(JSON.stringify(_APP.timeIt_timings_prev,null,0)).map(d=>d.charCodeAt(0)), 
						// 	...Array.from("STATS3").map(d=>d.charCodeAt(0))
						// ]));
						// _APP.m_websocket_node.ws_utilities.sendToAllSubscribers( data, "STATS3" );
					}
					_APP.timeIt("______WSSEND_STATS3", "e", __filename);

					// lastBattery. - (JSON)
					_APP.timeIt("______WSSEND_STATS4", "s", __filename);
					if(_APP.m_websocket_node.ws_utilities.getClientCount_bySubscription("STATS4")){
						_APP.m_websocket_node.ws_utilities.sendToAllSubscribers( JSON.stringify({mode:"STATS4", data:_APP.screenLogic.shared.battery.lastBattery}), "STATS4" );
					}
					_APP.timeIt("______WSSEND_STATS4", "e", __filename);

				}
			}
		},
		appLoop: async function(){
			_APP.timeIt("FULLLOOP", "s", __filename);
			_APP.drawLoop.pause();

			// BUTTONS
			_APP.timeIt("__GPIO", "s", __filename);
			await _APP.m_gpio.readAll();
			_APP.timeIt("__GPIO", "e", __filename);
			
			// STATE
			_APP.timeIt("__LOGIC", "s", __filename);
			await _APP.screenLogic.screens[_APP.currentScreen].func();
			_APP.timeIt("__LOGIC", "e", __filename);

			// Is a draw needed?
			
			if(_APP.m_draw.lcdUpdateNeeded){
				_APP.timeIt("__DISPLAY", "s", __filename);
				
				// Set the updatingLCD flag.
				_APP.m_draw.updatingLCD=true;

				// Determine changes.
				// _APP.timeIt("__DOCHANGESEXIST", "s", __filename);
				let changesExist = _MOD.loop.doChangesExist(_APP.m_draw._VRAM_changes);
				// _APP.timeIt("__DOCHANGESEXIST", "e", __filename);
				
				// Is a draw required?
				if(changesExist){
					// Update LCD.
					if( _APP.m_config.config.toggles.isActive_lcd ){
						// Updates via m_canvas.
						_APP.timeIt("____ACTUALDRAW", "s", __filename);
						await _APP.m_canvas.drawLayersUpdateFramebuffer();
						_APP.timeIt("____ACTUALDRAW", "e", __filename);
					}

					// Send 
					_APP.timeIt("____WSSEND", "s", __filename);
					_MOD.loop.sendToWsClients({});
					_APP.timeIt("____WSSEND", "e", __filename);

					// Reset the draw flags.
					_APP.m_draw.clearDrawingFlags();

					// Update the timeIt stamps.
					_APP.timeIt("__DISPLAY", "e", __filename);
					_APP.timeIt("FULLLOOP", "e", __filename);
					_APP.drawLoop.unpause();
				}
			}

			// No draw needed. Unpause the loop so that it can be called again.
			else{
				_APP.drawLoop.unpause();
			}
		},
	},
};

class drawLoop extends EventEmitter {
	constructor(options = {}) {
		super();
	}

	// Internal variables.
	_paused     = false;
	_now        = false;
	_delta      = false;
	_lastDiff   = false;
	_runLoop    = false;
	_flagsCheck = false;

	// Getters.
	//
	
	// Setters.
	//

	start() { this._paused = false; this._loop(); }
	stop() { this.pause(); }
	pause() { this._paused = true; }
	unpause() { this._paused = false; }

	_loop(now) {
		// Is the loop not on pause?
		if(!this._paused){
			// How long has it been since a full loop has been completed?
			// this._now       = performance.now();
			this._now       = now;
			this._delta     = this._now - (_APP.stats._then);
			this._lastDiff  = (_APP.stats.interval - this._delta);

			// Should the full loop run?
			this._runLoop = (this._delta >= _APP.stats.interval) ? true : false;
			this._flagsCheck = (!_APP.m_draw.updatingLCD)        ? true : false;
			if(this._runLoop && this._flagsCheck){ 
				// Track performance.
				_APP.fps.tick(now);
				_APP.stats.lastDiff = this._lastDiff; 
				_APP.stats._then    = _APP.fps._lastTick_; 
				_APP.stats.now      = this._now;
				_APP.stats.delta    = this._delta;

				// Request an appLoop update.
				this.emit('update'); 

				// Schedule the next potential appLoop run. (1/1 frame later.)
				setTimeout(() => this._loop(performance.now()), 1); // Varying CPU % but 30%-50% less than setImmediate.
				// console.log("type (1) --- ---", this._delta.toFixed(2));
			}
			else{
				// Schedule the next potential appLoop run. (1/16 frame later.)
				setTimeout(() => this._loop(performance.now()), _APP.stats.interval/16); // 
				// console.log("type --- (2) ---", this._delta.toFixed(2));
			}
		}
		
		// It is paused.
		else{
			// Schedule the next potential appLoop run. (1/32 frame later.)
			setTimeout(() => this._loop(performance.now()), _APP.stats.interval/32); // 
			// console.log("type --- --- (3)");
		}

		// Schedule the next potential update.
		// setTimeout(() => this._loop(performance.now()), 100); // Varying CPU % but 30%-50% less than setImmediate.
		// setTimeout(() => this._loop(performance.now()), _APP.stats.interval); // Varying CPU % but 30%-50% less than setImmediate.
	}
};

// _MOD.drawLoop = drawLoop;

module.exports = _MOD;
