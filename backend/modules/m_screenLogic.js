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
};
_MOD.goToPrevScreen = function(){
	// Find the index of the current screen.
	let index = _APP.screens.indexOf(_APP.currentScreen);
	let canMove = index > 0;
	if(canMove){ 
		_APP.currentScreen = _APP.screens[index -1];
		_APP.m_screenLogic.screens[_APP.currentScreen].init();
		console.log("Switching to:", _APP.currentScreen);
	}
	// console.log(`PREV: ${index} of ${_APP.screens.length} total. canMove: ${canMove}, newScreen: ${_APP.currentScreen}`);
};
_MOD.goToNextScreen = function(){
	// Find the index of the current screen.
	let index = _APP.screens.indexOf(_APP.currentScreen);
	let canMove = index < _APP.screens.length-1;
	let newScreen = false;
	if(canMove){ 
		_APP.currentScreen = _APP.screens[index +1];
		_APP.m_screenLogic.screens[_APP.currentScreen].init();
		console.log("Switching to:", _APP.currentScreen);
	}
	// console.log(`NEXT: ${index} of ${_APP.screens.length} total. canMove: ${canMove}, newScreen: ${_APP.currentScreen}`);
};

_MOD.screens = {
	main : {
		inited: false,
		lines : [],
		tstamps: {
			"time"   : {"last": 0, "delay": 1000, "run": false },
			"batt"   : {"last": 0, "delay": 1000, "run": false },
			// "timings": {"last": 0, "delay": 1000, "run": false },
		},
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
		init: async function(){
			let thisScreen = _APP.m_screenLogic.screens[_APP.currentScreen];
			console.log("init of:", _APP.currentScreen);

			// Clear the screen.
			_APP.m_lcd.canvas.clearScreen();

			// Reset tstamps values.
			let stamp = performance.now();
			for(let k in thisScreen.tstamps){
				thisScreen.tstamps[k].last = stamp;
				thisScreen.tstamps[k].run = false;
			}
			
			// Set the inited flag.
			thisScreen.inited = true;
		},
		func: async function(){
			let thisScreen = _APP.m_screenLogic.screens["main"];
			if(!thisScreen.inited){ thisScreen.init(); return; }
		}
	},
	drawTest: {
		inited: false,
		lines: [],
		flag1: false,
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
		init: async function(){
			let thisScreen = _APP.m_screenLogic.screens[_APP.currentScreen];
			console.log("init of:", _APP.currentScreen);

			// Clear the screen.
			_APP.m_lcd.canvas.clearScreen();

			// Reset tstamps values.
			let stamp = performance.now();
			for(let k in thisScreen.tstamps){
				thisScreen.tstamps[k].last = stamp;
				thisScreen.tstamps[k].run = false;
			}
			
			// Set the inited flag.
			thisScreen.inited = true;
		},
		func: async function(){
			let thisScreen = _APP.m_screenLogic.screens[_APP.currentScreen];
			if(!thisScreen.inited){ thisScreen.init(); return; }

			let c = _APP.m_config.config.lcd;
			let ts = c.tilesets[c.activeTileset];


			let screenDimensionsTest = function(){
				let len = thisScreen.lines.length;
				if(thisScreen.flag1){ _APP.m_lcd.canvas.fillTile("tile2"  , 0, 0, ts.s._cols, len); }
				else{                 _APP.m_lcd.canvas.fillTile("tile4"  , 0, 0, ts.s._cols, len); }
				thisScreen.flag1 = ! thisScreen.flag1;
				thisScreen.lines = [];

				let chars = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];

				let rowNum=0;
				let char_i=0;
				for(let i=0; i<ts.s._rows-0; i+=1){
					if(char_i > chars.length-1){ char_i = 0; }
					thisScreen.lines.push({text:chars[char_i], x:ts.s._cols-1, y:rowNum});
					char_i++;
					rowNum++;
				}
				let colNum=0;
				char_i=0;
				for(let i=0; i<ts.s._cols-0; i+=1){
					if(char_i > chars.length-1){ char_i = 0; }
					thisScreen.lines.push({text:chars[char_i], x:colNum, y:ts.s._rows-1});
					char_i++;
					colNum++;
				}

				for(let v of thisScreen.lines){ _APP.m_lcd.canvas.print(v.text  , v.x , v.y); }
			};
			let drawTest = function(){
				_APP.m_lcd.canvas.print("FILLTILE:"    , 0 , 3);
				_APP.m_lcd.canvas.fillTile("tile_red"  , 10, 3, 2, 1); 
				_APP.m_lcd.canvas.fillTile("tile_green", 10, 4, 2, 1); 
				_APP.m_lcd.canvas.fillTile("tile_blue" , 12, 3, 1, 2); 
				_APP.m_lcd.canvas.fillTile("cursor2"   , 14, 3, 2, 2); 
				_APP.m_lcd.canvas.fillTile("cursor3"   , 17, 3, 1, 2); 
				_APP.m_lcd.canvas.fillTile("cursor4"   , 19, 3, 1, 2); 
				_APP.m_lcd.canvas.fillTile("nochar"    , 21, 3, 3, 3); 

				_APP.m_lcd.canvas.print("SETTILE TEST:", 0 , 7);
				_APP.m_lcd.canvas.setTile("tile_red"   , 10, 7); 
				_APP.m_lcd.canvas.setTile("tile_green" , 11, 7); 
				_APP.m_lcd.canvas.setTile("tile_blue"  , 12, 7); 
				_APP.m_lcd.canvas.setTile("cursor1"    , 13, 7); 
				_APP.m_lcd.canvas.setTile("cursor2"    , 14, 7); 
				_APP.m_lcd.canvas.setTile("cursor3"    , 15, 7); 
				_APP.m_lcd.canvas.setTile("cursor4"    , 16, 7); 
				_APP.m_lcd.canvas.setTile("nochar"     , 17, 7); 
				_APP.m_lcd.canvas.setTile("battcharge" , 18, 7); 
				_APP.m_lcd.canvas.setTile("batt1"      , 19, 7); 
				_APP.m_lcd.canvas.setTile("batt2"      , 20, 7); 
				_APP.m_lcd.canvas.setTile("batt3"      , 21, 7); 
				_APP.m_lcd.canvas.setTile("batt4"      , 22, 7); 
				_APP.m_lcd.canvas.setTile("clock1"     , 23, 7); 
				
				_APP.m_lcd.canvas.print("FONT TEST:"       , 0, 9);
				_APP.m_lcd.canvas.print(" !\"#$%&'()*+,-./", 8, 10);
				_APP.m_lcd.canvas.print("0123456789:;<=>?" , 8, 11);
				_APP.m_lcd.canvas.print("@ABCDEFGHIJKLMNO" , 8, 12);
				_APP.m_lcd.canvas.print("PQRSTUVWXYZ[\\]^_", 8, 13);
				
				_APP.m_lcd.canvas.print("MISSING TILES TEST:", 0, 15);
				_APP.m_lcd.canvas.print("{}|[]\\"            , 0, 16);
				// _APP.m_lcd.canvas.print("NO WRAP: HAS 23 CHARS..", 0, 16);
				// _APP.m_lcd.canvas.print("NO WRAP: HAS 30 CHARS........*", 0, 17);
				// _APP.m_lcd.canvas.print("CUTOFF : HAS 31 CHARS........*-", 0, 18);
			};
			let fpsTest = function(){
				let y=18;
				try{ _APP.m_lcd.canvas.print(`value        : ${_APP.fps.value                    .toFixed(1).padStart(10, " ")}`, 0 , y++); } catch(e){}
				try{ _APP.m_lcd.canvas.print(`average      : ${_APP.fps.average                  .toFixed(1).padStart(10, " ")}`, 0 , y++); } catch(e){}
				try{ _APP.m_lcd.canvas.print(`fps          : ${_APP.fps.fps                      .toFixed(1).padStart(10, " ")}`, 0 , y++); } catch(e){}
				try{ _APP.m_lcd.canvas.print(`interval     : ${_APP.fps.interval                 .toFixed(3).padStart(10, " ")}`, 0 , y++); } catch(e){}
				try{ _APP.m_lcd.canvas.print(`delta        : ${_APP.fps.delta                    .toFixed(3).padStart(10, " ")}`, 0 , y++); } catch(e){}
				try{ _APP.m_lcd.canvas.print(`overBy    ** : ${_APP.fps.overBy                   .toFixed(3).padStart(10, " ")}`, 0 , y++); } catch(e){}
				try{ _APP.m_lcd.canvas.print(`next loop    : ${_APP.fps.ms_untilNextScheduledLoop.toFixed(3).padStart(10, " ")}`, 0 , y++); } catch(e){}
				try{ _APP.m_lcd.canvas.print(`sampleSize   : ${_APP.fps.sampleSize               .toFixed(0).padStart(10, " ")}`, 0 , y++); } catch(e){}
				try{ _APP.m_lcd.canvas.print(`_index_      : ${_APP.fps._index_                  .toFixed(0).padStart(10, " ")}`, 0 , y++); } catch(e){}
				// _APP.m_lcd.canvas.print(`_lastTick_   : ${_APP.fps._lastTick_               .toFixed(3).padStart(10, " ")}`, 0 , y++);
				// _APP.m_lcd.canvas.print(`now          : ${_APP.fps.now                      .toFixed(3).padStart(10, " ")}`, 0 , y++);
				// _APP.m_lcd.canvas.print(`nextFrameTime: ${_APP.fps.nextFrameTime            .toFixed(3).padStart(10, " ")}`, 0 , y++);
			};
			
			screenDimensionsTest();
			drawTest();
			fpsTest();
		}

		// // Get the LCD config.
		// let c = _APP.m_config.config.lcd;
		// let ts = c.tilesets[c.activeTileset];
	}
};


module.exports = _MOD;