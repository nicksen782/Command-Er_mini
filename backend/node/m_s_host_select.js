// const fs   = require('fs');
// const path = require('path');
// const os   = require('os');

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
	// VARIABLES:
	inited: false,

	// CONSTANTS:

	// INIT:
	init: async function(){
		let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
		thisScreen.shared = _APP.screenLogic.shared;
		console.log("SCREEN: init:", _APP.currentScreen);
	
		// Clear the screen.
		_APP.m_draw.clearLayers("tile4");
	
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		// Top rows.
		_APP.m_draw.fillTile("tile3"         , 0, 0, ts.cols, 1); 
		_APP.m_draw.print(`SCREEN: ${_APP.currentScreen} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);
		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		_APP.m_draw.fillTile("tile2"         , 0, 2, ts.cols, 1); 

		// Bottom row.
		_APP.m_draw.fillTile("tile3"         , 0, ts.rows-1, ts.cols, 1); 
		
		let y=3;
		let x=0;
		
		_APP.m_draw.print(`SELECT A HOST:` , x+0 , y++);
		_APP.m_draw.print( `` 
			+ `|LOCATION| `.padEnd(9, ".") 
			+ `|NAME| `.padEnd(8, ".") 
			+ `|HOST| `.padEnd(8, ".") 
			, x+0 , y++
		);

		_APP.m_config.remoteConf.forEach( (d,i)=>{ 
			_APP.m_draw.print(`${d.name}` , x+1 , y++);
		} );

		// Initial drawing of the battery and time.
		thisScreen.shared.time   .display(0, 29, "tile3");
		thisScreen.shared.battery.display(23, 29, "tile3");

		let obj = thisScreen.shared.getDialogBoxParams(5, 7, 20, 10);
		console.log("getDialogBoxParams:", obj);
		_APP.m_draw.fillTile("tile3"        , obj.outer.x, obj.outer.y,  obj.outer.w, obj.outer.h); 
		_APP.m_draw.fillTile("tile1"        , obj.inner.x, obj.inner.y,  obj.inner.w, obj.inner.h); 
		_APP.m_draw.fillTile("tile3"        , obj.text.x, obj.text.y,  obj.text.w, obj.text.h); 

		_APP.m_draw.print(" ".repeat(1) + `* : LINE 1`.padEnd(obj.text.w-1, " ") , obj.text.x, obj.text.y+1);
		_APP.m_draw.print(" ".repeat(1) + `  : LINE 2`.padEnd(obj.text.w-1, " ") , obj.text.x, obj.text.y+2);
		_APP.m_draw.print(" ".repeat(1) + `  : LINE 3`.padEnd(obj.text.w-1, " ") , obj.text.x, obj.text.y+3);
		_APP.m_draw.print(" ".repeat(1) + `  : LINE 4`.padEnd(obj.text.w-1, " ") , obj.text.x, obj.text.y+4);

		// Init vars.
		thisScreen.inited = true;
	},
	
	// MAIN FUNCTION:
	func: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			if(!thisScreen.inited){ thisScreen.init(); resolve(); return; }
	
			// Get the LCD config.
			let n = _APP.m_config.config.node;
			let conf = _APP.m_config.config.lcd;
			let ts = conf.tileset;

			// Display/Update the time/battery data sections as needed.
			thisScreen.shared.time.updateIfNeeded(0, 29, "tile3");
			thisScreen.shared.battery.updateIfNeeded(23, 29, "tile3");

			// 
			// if( _APP.m_gpio.isPress ("KEY_PRESS_PIN") && _APP.m_gpio.isPress ("KEY1_PIN")     ) { thisScreen.shared.pm2    .restart();  }
			// if( _APP.m_gpio.isPress ("KEY_PRESS_PIN") && _APP.m_gpio.isPress ("KEY2_PIN")     ) { thisScreen.shared.process.exit();     }
			// if( _APP.m_gpio.isPress ("KEY_PRESS_PIN") && _APP.m_gpio.isPress ("KEY_UP_PIN")   ) { thisScreen.shared.linux  .reboot();   }
			// if( _APP.m_gpio.isPress ("KEY_PRESS_PIN") && _APP.m_gpio.isPress ("KEY_DOWN_PIN") ) { thisScreen.shared.linux  .shutdown(); }

			resolve();
		});
	
	}
};

module.exports = _MOD;