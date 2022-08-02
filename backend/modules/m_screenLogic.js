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
		// console.log("Switching to:", _APP.currentScreen);
	}
	// console.log(`PREV: ${index}/${_APP.screens.length} total. canMove: ${canMove}, newScreen: ${_APP.currentScreen}`);
};
_MOD.goToNextScreen = function(){
	// Find the index of the current screen.
	let index = _APP.screens.indexOf(_APP.currentScreen);
	let canMove = index < _APP.screens.length-1;
	let newScreen = false;
	if(canMove){ 
		_APP.currentScreen = _APP.screens[index +1];
		_APP.m_screenLogic.screens[_APP.currentScreen].init();
		// console.log("Switching to:", _APP.currentScreen);
	}
	// console.log(`NEXT: ${index+1}/${_APP.screens.length} total. canMove: ${canMove}, newScreen: ${_APP.currentScreen}`, _APP.screens);
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
			// console.log("init of:", _APP.currentScreen);

			// Clear the screen.
			_APP.m_lcd.canvas.clearScreen();

			// Reset tstamps values.
			let stamp = performance.now();
			for(let k in thisScreen.tstamps){
				thisScreen.tstamps[k].last = stamp;
				thisScreen.tstamps[k].run = false;
			}

			// Get the LCD config.
			let c = _APP.m_config.config.lcd;
			let ts = c.tilesets[c.activeTileset];

			_APP.m_lcd.canvas.fillTile("tile3"         , 0, 0, ts.s._cols, 1); 
			_APP.m_lcd.canvas.print(`SCREEN: ${_APP.currentScreen} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);
			_APP.m_lcd.canvas.fillTile("tile1"         , 0, 1, ts.s._cols, 1); 
			_APP.m_lcd.canvas.fillTile("tile2"         , 0, 2, ts.s._cols, 1); 
			
			// Set the inited flag.
			thisScreen.inited = true;
		},
		func: async function(){
			return new Promise(async function(resolve,reject){
				let thisScreen = _APP.m_screenLogic.screens["main"];
				if(!thisScreen.inited){ thisScreen.init(); resolve(); return; }
	
				// // Get the LCD config.
				// let c = _APP.m_config.config.lcd;
				// let ts = c.tilesets[c.activeTileset];
	
				// _APP.m_lcd.canvas.fillTile("tile3"         , 0, 0, ts.s._cols, 1); 
				// _APP.m_lcd.canvas.print(`SCREEN: ${_APP.currentScreen} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);
				// _APP.m_lcd.canvas.fillTile("tile1"         , 0, 1, ts.s._cols, 1); 
				// _APP.m_lcd.canvas.fillTile("tile2"         , 0, 2, ts.s._cols, 1); 

				resolve();
			});

		}
	},
	drawingTest: {
		inited: false,
		
		flag1: false,
		lines: [], // screenDimensionsTest
		
		lines2: [], // fpsTest
		flag2: false, // fpsTest

		buttons: async function(key, state){
			// console.log(_APP.currentScreen, key, state);
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
			// console.log("init of:", _APP.currentScreen);

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
	
				let screenDimensionsTest = function(){
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
					
					// Row 0
					let x=14;
					let y=7;
					_APP.m_lcd.canvas.print("SETTILE TEST:", 0 , y);

					// Row 1
					_APP.m_lcd.canvas.setTile("tile_red"   , x++, y); 
					_APP.m_lcd.canvas.setTile("tile_green" , x++, y); 
					_APP.m_lcd.canvas.setTile("tile_blue"  , x++, y); 
					x++;
					_APP.m_lcd.canvas.setTile("cursor1"    , x++, y); 
					_APP.m_lcd.canvas.setTile("cursor2"    , x++, y); 
					_APP.m_lcd.canvas.setTile("cursor3"    , x++, y); 
					_APP.m_lcd.canvas.setTile("cursor4"    , x++, y); 
					x++;
					_APP.m_lcd.canvas.setTile("clock1"     , x++, y); 
					_APP.m_lcd.canvas.setTile("nochar"     , x++, y); 
					y++;

					// Row 2
					x=14;
					_APP.m_lcd.canvas.setTile("battcharge1", x++, y); 
					_APP.m_lcd.canvas.setTile("battcharge2", x++, y); 
					x++;
					x++;
					_APP.m_lcd.canvas.setTile("batt1"      , x++, y); 
					_APP.m_lcd.canvas.setTile("batt2"      , x++, y); 
					_APP.m_lcd.canvas.setTile("batt3"      , x++, y); 
					_APP.m_lcd.canvas.setTile("batt4"      , x++, y); 
					x++;
					
					x=0; y++;
					_APP.m_lcd.canvas.print("FONT TEST:"       , x, y++); x++;
					_APP.m_lcd.canvas.print(" !\"#$%&'()*+,-./", x, y++);
					_APP.m_lcd.canvas.print("0123456789:;<=>?" , x, y++);
					_APP.m_lcd.canvas.print("@ABCDEFGHIJKLMNO" , x, y++);
					_APP.m_lcd.canvas.print("PQRSTUVWXYZ[\\]^_", x, y++);
					
					x=0; y++;
					_APP.m_lcd.canvas.print("MISSING TILES TEST:", x, y++);
					_APP.m_lcd.canvas.print("{}|[]\\"            , x, y++);
					// _APP.m_lcd.canvas.print("NO WRAP: HAS 23 CHARS..", 0, 16);
					// _APP.m_lcd.canvas.print("NO WRAP: HAS 30 CHARS........*", 0, 17);
					// _APP.m_lcd.canvas.print("CUTOFF : HAS 31 CHARS........*-", 0, 18);
				};
				let fpsTest = function(){
					let len = thisScreen.lines2.length;
					let longest = 0;
					thisScreen.lines2.forEach(function(d){ if(d.length > longest){longest = d.length;} });
					thisScreen.lines2=[];
					let y=18;
					// _APP.m_lcd.canvas.fillTile("tile3"  , 0, y, longest, len);
					if(thisScreen.flag2){ _APP.m_lcd.canvas.fillTile("tile2"  , 0, y, longest, len); }
					else{                 _APP.m_lcd.canvas.fillTile("tile4"  , 0, y, longest, len); }
					thisScreen.flag2 = !thisScreen.flag2;
	
					try{ thisScreen.lines2.push(`${"*".repeat(22)}`); } catch(e){}
					try{ thisScreen.lines2.push(`SET FPS   : ${_APP.stats.fps     .toFixed(1).padStart(10, " ")}`); } catch(e){}
					try{ thisScreen.lines2.push(`AVG FPS   : ${_APP.fps.average   .toFixed(1).padStart(10, " ")}`); } catch(e){}
					try{ thisScreen.lines2.push(`INTERVAL  : ${_APP.stats.interval.toFixed(2).padStart(10, " ")}`); } catch(e){}
					try{ thisScreen.lines2.push(`DELTA     : ${_APP.stats.delta   .toFixed(2).padStart(10, " ")}`); } catch(e){}
					try{ thisScreen.lines2.push(`now       : ${_APP.stats.now     .toFixed(2).padStart(10, " ")}`); } catch(e){}
					try{ thisScreen.lines2.push(`_then     : ${_APP.stats._then   .toFixed(2).padStart(10, " ")}`); } catch(e){}
					try{ thisScreen.lines2.push(`SAMPLE POS: ${(_APP.fps._index_  .toFixed(0)+"/"+_APP.fps.sampleSize.toFixed(0)).padStart(10, " ")}`); } catch(e){}
					try{ thisScreen.lines2.push(`${"*".repeat(22)}`); } catch(e){}
	
					for(let v of thisScreen.lines2){ _APP.m_lcd.canvas.print(v , 0 , y++); }
				};
				let timeTest = function(){
					_APP.timeIt("TIME", "s");
					_APP.m_lcd.timeUpdate.func(0,ts.s._rows-2);
					_APP.timeIt("TIME", "e");
				};
				let batteryTest = async function(){
					_APP.timeIt("BATTERY", "s");
					await _APP.m_battery.func(ts.s._cols-9,ts.s._rows-2);
					_APP.timeIt("BATTERY", "e");
				};
				
				screenDimensionsTest();
				drawTest();
				fpsTest();
				timeTest();
				batteryTest();
				
				resolve();
			});
		}
	}
};


module.exports = _MOD;