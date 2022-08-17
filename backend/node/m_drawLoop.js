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
		getChanges: function(){
			// Determine changes.
			let _changesFullFlat = [];
			let len1, len2, layer, keys, key, layer_i, k_i;

			// Go through each _VRAM_changes layer. 
			len1 = _APP.m_draw._VRAM_changes.length;
			for(layer_i=0; layer_i<len1; layer_i+=1){
				// Get the layer.
				layer = _APP.m_draw._VRAM_changes[layer_i];
				
				// Key the layer's keys. 
				keys = Object.keys(layer);
				
				// Go through each key in the layer.
				len2 = keys.length;
				for(k_i=0; k_i<keys.length; k_i+=1){
					key = keys[k_i];
				
					// Is this a change?
					if(layer[key].c){
						// Add the change to _changesFullFlat.
						_changesFullFlat.push( layer[key].l, layer[key].x, layer[key].y, layer[key].t );
					}
				}

				// Update _VRAM_updateStats for real and overwrites.
				_APP.m_draw._VRAM_updateStats[layer_i].overwrites = _APP.m_draw._VRAM_updateStats[layer_i].updates - _APP.m_draw._VRAM_updateStats[layer_i].real;
			}

			return new Uint8Array(_changesFullFlat) ;
			// return _changesFullFlat ;
		},
		sendToWsClients: function(data){
			// Update the web clients.
			if(_APP.m_websocket_node.ws_utilities.getClientCount()){
				// VRAM_FULL - (ArrayBuffer) (Appends the binary of "FULL" to differentiate it.)
				_APP.m_websocket_node.ws_utilities.sendToAllSubscribers(
					new Uint8Array( Array.from([
						..._APP.m_draw._VRAM_view, 
						...Array.from("FULL").map(d=>d.charCodeAt(0))
					])
					), "VRAM_FULL"
				);

				// VRAM_CHANGES only - (ArrayBuffer) (Appends the binary of "PART" to differentiate it.)
				_APP.m_websocket_node.ws_utilities.sendToAllSubscribers(
					new Uint8Array( Array.from([
						...data._changesFullFlat, 
						...Array.from("PART").map(d=>d.charCodeAt(0))
					])
					), "VRAM_CHANGES"
				);

				// VRAM update stats1. - (JSON)
				_APP.m_websocket_node.ws_utilities.sendToAllSubscribers( JSON.stringify({mode:"STATS1", data:_APP.m_draw._VRAM_updateStats}), "STATS1" );

				// VRAM update stats2. - (JSON)
				_APP.m_websocket_node.ws_utilities.sendToAllSubscribers( JSON.stringify({mode:"STATS2", data:_APP.stats.fps}), "STATS2" );
			}
		},
		appLoop: async function(){
			_APP.timeIt("FULLLOOP", "s");
			_APP.drawLoop.pause();

			// BUTTONS
			_APP.timeIt("GPIO", "s");
			await _APP.m_gpio.readAll();
			_APP.timeIt("GPIO", "e");
			
			// STATE
			_APP.timeIt("LOGIC", "s");
			await _APP.screenLogic.screens[_APP.currentScreen].func();
			_APP.timeIt("LOGIC", "e");

			// Is a draw needed?
			if(_APP.m_draw.lcdUpdateNeeded){
				// Set the updatingLCD flag.
				_APP.m_draw.updatingLCD=true;

				// Start the timeIt.
				_APP.timeIt("DISPLAY", "s");
				
				// Determine changes.
				let _changesFullFlat = _MOD.loop.getChanges();

				// Is a draw required?
				if(_changesFullFlat.length){
					// Send 
					_MOD.loop.sendToWsClients({
						_changesFullFlat: _changesFullFlat
					});
					
					// Update LCD.
					if( _APP.m_config.config.toggles.isActive_lcd ){
						// Updates via m_canvas.
						await _APP.m_canvas.drawLayersUpdateFramebuffer(_changesFullFlat);
					}
				}

				// Finish the appLoop.

				// Reset the draw flags.
				_APP.m_draw.clearDrawingFlags();

				// Update the timeIt stamps.
				_APP.timeIt("DISPLAY", "e");
				_APP.timeIt("FULLLOOP", "e");
				_APP.drawLoop.unpause();
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
	_running    = false;
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

	start() {
		// console.log("start");
		this._running = true;
		// this.emit('start');
		this._loop();
	}
	
	stop() {
		// console.log("stop");
		this._running = false;
		// this.emit('stop');
	}
	pause() {
		// console.log("pause");
		this._paused = true;
	}
	unpause() {
		// console.log("unpause");
		this._paused = false;
	}

	_loop(now) {
		if(this._running){
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
				}
			}

			// Schedule the next potential update.
			setTimeout(() => this._loop(performance.now()), 0); // Varying CPU % but 30%-50% less than setImmediate.
		}
	}
};

// _MOD.drawLoop = drawLoop;

module.exports = _MOD;