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
	
			_APP.m_screenLogic.screens.timings_test = timings_test;

			// Add routes.
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
		// REQUEST_TIMINGS
		_APP.addToRouteList({ path: "/REQUEST_TIMINGS", method: "post", args: [], file: __filename, desc: "REQUEST_LCD_CONFIG" });
		app.post('/REQUEST_TIMINGS'    ,express.json(), async (req, res) => {
			let resp = [];
			for(let key in _APP.timeIt_timings){
				resp.push( { [key] : _APP.timeIt_timings[key].t } );
			}
			res.json( resp );
		});
	},
};

let timings_test = {
	inited: false,
	lines : [],
	cursor: 0,
	buttons: async function(key, state){
		switch(key){
			// Command cursor movements. 
			case "KEY_UP_PIN"   : { if(state){ } break; }
			case "KEY_DOWN_PIN" : { if(state){ } break; }

			// Section changes.
			case "KEY_LEFT_PIN" : { if(state){ _APP.m_screenLogic.goToPrevScreen(); } break; }
			case "KEY_RIGHT_PIN": { if(state){ _APP.m_screenLogic.goToNextScreen(); } break; }

			// Config screen.
			case "KEY_PRESS_PIN": { if(state){ } break; }

			// Status screen.
			case "KEY1_PIN"     : { if(state){ } break; }

			// 
			case "KEY2_PIN"     : { if(state){ } break; }
			
			// Backlight toggle.
			case "KEY3_PIN"     : { if(state){ } break; }
		}
	},
	init: async function(){
		let thisScreen = _APP.m_screenLogic.screens[_APP.currentScreen];
		// console.log("init of:", _APP.currentScreen);

		// Clear the screen.
		_APP.m_lcd.canvas.clearScreen();

		// Set the inited flag.
		thisScreen.inited = true;
	},
	func: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.m_screenLogic.screens[_APP.currentScreen];
			if(!thisScreen.inited){ thisScreen.init(); resolve(); return; }
	
			// Get the LCD config.
			let c = _APP.m_config.config.lcd;
			let ts = c.tilesets[c.activeTileset];
	
			_APP.m_lcd.canvas.fillTile("tile3"         , 0, 0, ts.s._cols, 1); 
			_APP.m_lcd.canvas.print(`SCREEN: ${_APP.currentScreen} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);
			_APP.m_lcd.canvas.fillTile("tile1"         , 0, 1, ts.s._cols, 1); 
			_APP.m_lcd.canvas.fillTile("tile2"         , 0, 2, ts.s._cols, 1); 
	
			_APP.m_lcd.canvas.fillTile("tile1"         , 0, ts.s._rows-2, ts.s._cols, 1); 

			let y=3;
			for(let k in _APP.timeIt_timings){ 
				_APP.m_lcd.canvas.fillTile("tile2"     , 0, y, ts.s._cols, 1); 
				let v = _APP.timeIt_timings[k].t.toFixed(1).padStart(7, " ");
				_APP.m_lcd.canvas.print(`${k.padEnd(14, " ")}:${v}` , 0 , y); 
				y++;
			}

			let timeTest = function(){
				_APP.timeIt("TIME", "s");
				_APP.m_lcd.timeUpdate.func(0,ts.s._rows-1);
				_APP.timeIt("TIME", "e");
			};
			let batteryTest = async function(){
				_APP.timeIt("BATTERY", "s");
				await _APP.m_battery.func(ts.s._cols-8,ts.s._rows-1);
				_APP.timeIt("BATTERY", "e");
			};

			timeTest();
			batteryTest();

			resolve();
			return;
	
			// UPDATE THE TIME DISPLAY?
			{
				_APP.timeIt("time", "s");
				await _APP.m_lcd.timeUpdate.func();
				_APP.timeIt("time", "e");
			}
	
			// UPDATE THE BATTERY DISPLAY.
			{
				_APP.timeIt("batt", "s");
				_APP.m_battery.func();
				_APP.timeIt("batt", "e");
			}
	
			// UPDATE BUTTON STATES.
			{
				_APP.timeIt("buttons", "s");
					
				// Clear the previous display region.
				_APP.m_lcd.canvas.fillTile("tile2"  , 0, 20, 24, 4); 
	
				// Display the values.
				let y=22;
				let line1a = `HD:${_APP.m_gpio.states_held   .toString(2).padStart(8, "0")}`;
				let line1b = `PV:${_APP.m_gpio.states_prev    .toString(2).padStart(8, "0")}`;
				let line2a = `PR:${_APP.m_gpio.states_pressed .toString(2).padStart(8, "0")}`;
				let line2b = `RE:${_APP.m_gpio.states_released.toString(2).padStart(8, "0")}`;
				_APP.m_lcd.canvas.print(`${line1a}  ${line1b}` , 0 , y++);
				_APP.m_lcd.canvas.print(`${line2a}  ${line2b}` , 0 , y++);
	
				// _APP.m_lcd.canvas.print(`HELD: ${_APP.m_gpio.states_held    .toString(2).padStart(8, "0")}`  , 0 , y++);
				// _APP.m_lcd.canvas.print(`PREV: ${_APP.m_gpio.states_prev    .toString(2).padStart(8, "0")}`  , 0 , y++);
				// _APP.m_lcd.canvas.print(`PRES: ${_APP.m_gpio.states_pressed .toString(2).padStart(8, "0")}`  , 0 , y++);
				// _APP.m_lcd.canvas.print(`RELE: ${_APP.m_gpio.states_released.toString(2).padStart(8, "0")}`  , 0 , y++);
	
				_APP.m_lcd.canvas.setTile("tile_red"  , 11, 24); 
				_APP.m_lcd.canvas.setTile("tile_red"  , 12, 24); 
				_APP.m_lcd.canvas.setTile("tile_green", 13, 24); 
				_APP.m_lcd.canvas.setTile("tile_green", 14, 24); 
				_APP.m_lcd.canvas.setTile("tile_blue" , 15, 24); 
				_APP.m_lcd.canvas.setTile("tile_blue" , 16, 24); 
				
				_APP.timeIt("buttons", "e");
				
				_APP.timeIt("cursor", "s");
				if(thisScreen.cursor){
					_APP.m_lcd.canvas.setTile("cursor2", 11, 24); 
					_APP.m_lcd.canvas.setTile("cursor3", 13, 24); 
					_APP.m_lcd.canvas.setTile("tile_blue", 15, 24); 
					thisScreen.cursor = !thisScreen.cursor;
				}
				else{
					_APP.m_lcd.canvas.setTile("cursor1", 11, 24); 
					_APP.m_lcd.canvas.setTile("cursor4", 13, 24); 
					_APP.m_lcd.canvas.setTile("battcharge", 15, 24); 
					thisScreen.cursor = !thisScreen.cursor;
				}
				_APP.timeIt("cursor", "e");

			}
		});

		resolve();
	}
	
};

module.exports = _MOD;