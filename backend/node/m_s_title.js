const fs = require('fs');
const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	moduleLoaded: false,

	// Init this module.
	module_init: async function(parent, key){
		return new Promise(async function(resolve,reject){
			if(!_MOD.moduleLoaded){
				// Save reference to the parent module.
				_APP = parent;
		
				_APP.consolelog(`add screen: ${key}`, 2);
				_APP.screenLogic.screens[key] = screen;
				
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
};


let screen = {
	// Variables.
	inited: false,
	lines:[],
	counter : 5,
	lastCounterUpdate:null,
	screenEndDelayMs:null,

	// Constants
	screenEndDelaySeconds:1,

	buttons: async function(key, state){
		if(state){ return; }

		switch(key){
			// Command cursor movements. 
			case "KEY_UP_PIN"   : { if(state){ } break; }
			case "KEY_DOWN_PIN" : { if(state){ } break; }
	
			// Section changes.
			case "KEY_LEFT_PIN" : { if(state){ _APP.screenLogic.shared.changeScreen.prev(); } break; }
			case "KEY_RIGHT_PIN": { if(state){ _APP.screenLogic.shared.changeScreen.next(); } break; }
	
			// Config screen.
			case "KEY_PRESS_PIN": { if(state){ } break; }
	
			// Status screen.
			case "KEY1_PIN"     : { 
				if(state){ 
				}
				break; 
			}
	
			// 
			case "KEY2_PIN"     : { 
				if(state){ 
				}
				break; 
			}
			
			// Backlight toggle.
			case "KEY3_PIN"     : { 
				break;
			}
		}
	},

	init: async function(){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		thisScreen.shared = _APP.screenLogic.shared;
		console.log("SCREEN: init:", _APP.currentScreen);
	
		// Clear the screen.
		_APP.m_draw.clearLayers("tile4");
	
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// Top bars.
		_APP.m_draw.fillTile("tile2"         , 0, 0, ts.cols, 1); 
		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		_APP.m_draw.fillTile("tile3"         , 0, 2, ts.cols, 1); 
		
		let y=11;
		let x=1;
		
		// Outer box.
		_APP.m_draw.fillTile("tile3"        , x, y,  28, 8); 

		// Inner box.
		_APP.m_draw.fillTile("tile1"        , x+1, y+1,  26, 6); 
		
		// Text.
		_APP.m_draw.print(`COMMAND-ER: MINI` , x+6 , y+2);
		_APP.m_draw.print(`2022 NICKOLAS ANDERSEN` , x+3 , y+4);
		_APP.m_draw.print(`(NICKSEN782)` , x+8 , y+5);
		
		// Bottom bars.
		_APP.m_draw.fillTile("tile2"         , 0, ts.rows-1, ts.cols, 1); 
		_APP.m_draw.fillTile("tile1"         , 0, ts.rows-2, ts.cols, 1); 
		_APP.m_draw.fillTile("tile3"         , 0, ts.rows-3, ts.cols, 1); 

		// Init vars.
		thisScreen.inited = true;
		thisScreen.lines = [];
		thisScreen.lastCounterUpdate = performance.now();
		thisScreen.screenEndDelayMs = thisScreen.shared.secondsToFramesToMs(thisScreen.screenEndDelaySeconds);
		thisScreen.counter = 3;

		_APP.m_draw.print((thisScreen.counter-1).toString() , ts.cols-1 , ts.rows-1);

		// _APP.m_config.remoteConf.forEach( (d,i)=>{ 
		// 	_APP.m_draw.print(`${d.name}` , 0 , y+8+i);
		// } );
	},
	
	func: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			if(!thisScreen.inited){ thisScreen.init(); resolve(); return; }
	
			// Get the LCD config.
			let n = _APP.m_config.config.node;
			let conf = _APP.m_config.config.lcd;
			let ts = conf.tileset;

			if(performance.now() - thisScreen.lastCounterUpdate >= thisScreen.screenEndDelayMs ){
				thisScreen.counter -= 1;
				if(thisScreen.counter >= 1){
					_APP.m_draw.print((thisScreen.counter-1).toString() , ts.cols-1 , ts.rows-1);
				}
				
				thisScreen.lastCounterUpdate = performance.now();
			}
			if(thisScreen.counter == 0){
				thisScreen.shared.changeScreen.specific("m_s_test_1");
			}

			resolve();
		});
	
	}
};

module.exports = _MOD;