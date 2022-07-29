const fs = require('fs');
// const path = require('path');
const os   = require('os');

let _APP = null;

let _MOD = {
	// config_filename: "backend/config.json",
	// config: {},

	// Init this module.
	module_init: async function(parent){
		return new Promise(async function(resolve,reject){
			// Save reference to the parent module.
			_APP = parent;
	
			// Get and store the config file. 
			// await _MOD.get_config();

			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){

		//
		// _APP.addToRouteList({ path: "/get_config", method: "post", args: [], file: __filename, desc: "get_config" });
		// app.post('/get_config'    ,express.json(), async (req, res) => {
		// 	try{ 
		// 		let result = await _MOD.get_config(); 
		// 		res.json(result);
		// 	}
		// 	catch(e){
		// 		res.json(e);
		// 	}
		// });

	},

	// get_config: async function(){
	// 	return new Promise(async function(resolve,reject){
	// 		// Read/Store the JSON. 
	// 		_MOD.config = JSON.parse( fs.readFileSync(_MOD.config_filename, 'utf8') );

	// 		resolve(_MOD.config);
	// 	});
	// },
};

_MOD.main = {
	lines : [],
	buttons: async function(key, state){
		switch(key){
			// Command cursor movements. 
			case "KEY_UP_PIN"   : { if(state){ } break; }
			case "KEY_DOWN_PIN" : { if(state){ } break; }

			// Section changes.
			case "KEY_LEFT_PIN" : { if(state){ } break; }
			case "KEY_RIGHT_PIN": { if(state){ } break; }

			// Config screen.
			case "KEY_PRESS_PIN": { if(state){ } break; }

			// Status screen.
			case "KEY1_PIN"     : { 
				if(state){ 
					if(_APP.m_lcd.canvas.lcdUpdateNeeded==false){
						_APP.m_lcd.canvas.lcdUpdateNeeded = true;
					}
				}
				break; 
			}

			// 
			case "KEY2_PIN"     : { 
				if(state){ 
					_APP.m_lcd.canvas.clearScreen();
				}
				break; 
			}
			
			// Backlight toggle.
			case "KEY3_PIN"     : { 
				if(state){ _APP.m_gpio.toggle_pin("BL_PIN"); }
				break;
			}
		}
	},
	func: async function(){
	}
};

module.exports = _MOD;