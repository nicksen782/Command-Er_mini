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
			_APP.consolelog("  addRoutes");
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
			case "KEY1_PIN"     : { 
				if(state){ 
				} 
				break; 
			}

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
		// _APP.m_lcd.canvas.draw.clearScreen();
		_APP.m_lcd.canvas.draw._clearVram("tile3");
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
			_APP.m_lcd.canvas.draw._clearVram("tile3");
			// Top part.
			_APP.m_lcd.canvas.draw.fillTile("tile3"         , 0, 0, ts.s._cols, 1); 
			_APP.m_lcd.canvas.draw.print(`SCREEN: ${_APP.currentScreen} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);
			_APP.m_lcd.canvas.draw.fillTile("tile1"         , 0, 1, ts.s._cols, 1); 
			_APP.m_lcd.canvas.draw.fillTile("tile2"         , 0, 2, ts.s._cols, 1); 
			
			_APP.m_lcd.canvas.draw.fillTile("tile1"         , 0, 25, ts.s._cols, 1); 
			_APP.m_lcd.canvas.draw.fillTile("tile2"         , 0, 26, ts.s._cols, 1); 
			_APP.m_lcd.canvas.draw.fillTile("tile3"         , 0, 27, ts.s._cols, 1); 
			_APP.m_lcd.canvas.draw.fillTile("tile4"         , 0, 28, ts.s._cols, 1); 
			_APP.m_lcd.canvas.draw.fillTile("tile1"         , 0, 29, ts.s._cols, 1); 
	
			// Bottom line.
			_APP.m_lcd.canvas.draw.fillTile("tile1"         , 0, ts.s._rows-2, ts.s._cols, 1); 

			// let y=3;
			// for(let k in _APP.timeIt_timings_prev){ 
				// if(k.indexOf("S2:") === 0 || k.indexOf("FULLLOOP") === 0){
				// 	_APP.m_lcd.canvas.draw.fillTile("tile2"     , 0, y, ts.s._cols, 1); 
				// 	let v = _APP.timeIt_timings_prev[k].t.toFixed(1).padStart(7, " ");
				// 	_APP.m_lcd.canvas.draw.print(`${k.padEnd(14, " ")}:${v}` , 0 , y); 
				// 	y++;
				// }
			// }

			let timeTest = function(){
				_APP.m_lcd.timeUpdate.func(0,ts.s._rows-1);
			};
			let batteryTest = async function(){
				await _APP.m_battery.func(ts.s._cols-8,ts.s._rows-1);
			};

			_APP.timeIt("S2:TIMETEST"   , "s"); timeTest();    _APP.timeIt("S2:TIMETEST"   , "e");
			_APP.timeIt("S2:BATTEST"    , "s"); batteryTest(); _APP.timeIt("S2:BATTEST"    , "e");

			// console.log(`FULLLOOP: ${_APP.currentScreen}: ${_APP.timeIt_timings_prev["FULLLOOP"].t.toFixed(2).padStart(10, " ")}`);


			resolve();
			return;
	
			{	
				_APP.timeIt("cursor", "s");
				if(thisScreen.cursor){
					_APP.m_lcd.canvas.draw.setTile("cursor2", 11, 24); 
					_APP.m_lcd.canvas.draw.setTile("cursor3", 13, 24); 
					_APP.m_lcd.canvas.draw.setTile("tile_blue", 15, 24); 
					thisScreen.cursor = !thisScreen.cursor;
				}
				else{
					_APP.m_lcd.canvas.draw.setTile("cursor1", 11, 24); 
					_APP.m_lcd.canvas.draw.setTile("cursor4", 13, 24); 
					_APP.m_lcd.canvas.draw.setTile("battcharge", 15, 24); 
					thisScreen.cursor = !thisScreen.cursor;
				}
				_APP.timeIt("cursor", "e");

			}
		});

		resolve();
	}
	
};

module.exports = _MOD;