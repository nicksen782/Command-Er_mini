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
	
			_APP.consolelog("add screen: screen_title", 2);
			_APP.screenLogic.screens.screen_title = screen_title;
			
			// Add routes.
			_APP.consolelog("addRoutes", 2);
			_MOD.addRoutes(_APP.app, _APP.express);

			resolve();
		});
	},

	// Adds routes for this module.
	addRoutes: function(app, express){
	},
};


let screen_title = {
	inited: false,
	flag:false,
	counter:0,
	lines2:[],
	battUpdateCounter:0,
	buttons: async function(key, state){
		switch(key){
			// Command cursor movements. 
			case "KEY_UP_PIN"   : { if(state){ } break; }
			case "KEY_DOWN_PIN" : { if(state){ } break; }
	
			// Section changes.
			case "KEY_LEFT_PIN" : { if(state){ _APP.screenLogic.shared.goToPrevScreen(); } break; }
			case "KEY_RIGHT_PIN": { if(state){ _APP.screenLogic.shared.goToNextScreen(); } break; }
	
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

		console.log("init of:", _APP.currentScreen);
	
		// Clear the screen.
		_APP.m_draw.clearLayers("tile4");
	
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		_APP.m_draw.fillTile("tile3"         , 0, 0, ts.cols, 1); 
		_APP.m_draw.print(`SCREEN: ${_APP.currentScreen} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);
		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		_APP.m_draw.fillTile("tile2"         , 0, 2, ts.cols, 1); 
		
		_APP.m_draw.print(` 0123456789!@#$%^&*()-=_+[` , 0 , 4);
		_APP.m_draw.print(`ABCDEFGHIJKLMNOPQRSTUVWXYZ` , 0 , 5);
		_APP.m_draw.print(`]{}|;:'",.<>/?\\`           , 0 , 6);
		
		_APP.m_websocket_python.wsClient.send("GET_BATTERY");
		// _APP.screenLogic.shared.displayBattery(22, 29, "tile1");

		// Set the inited flag.
		thisScreen.inited = true;
		thisScreen.flag = false;
		thisScreen.counter = 0;
		thisScreen.battUpdateCounter = 0;
	},
	func: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			if(!thisScreen.inited){ thisScreen.init(); resolve(); return; }
	
			let len = thisScreen.lines2.length;
			let longest = 0;
			thisScreen.lines2.forEach(function(d){ if(d.length > longest){longest = d.length;} });
			thisScreen.lines2=[];
			thisScreen.flag2 = !thisScreen.flag2;
			
			let y=8;
			// if(thisScreen.flag2){ _APP.m_draw.fillTile("tile2"  , 0, y, longest, len); }
			// else{                 _APP.m_draw.fillTile("tile4"  , 0, y, longest, len); }
			try{ thisScreen.lines2.push(`${"*".repeat(29)}`); } catch(e){}
			try{ thisScreen.lines2.push(`GFX SETTING     : ${_APP.m_config.config.python.gfx.padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`FPS             : ${(_APP.fps.average  .toFixed(0)+"/"+_APP.stats.fps.toFixed(0)).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`SET MS/FRAME    : ${_APP.stats.interval.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`DELTA           : ${_APP.stats.delta   .toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`${"*".repeat(29)}`); } catch(e){}
			try{ thisScreen.lines2.push(`GPIO            : ${_APP.timeIt_timings_prev["GPIO"].t.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`GPIO_ACTIONS    : ${_APP.timeIt_timings_prev["GPIO_ACTIONS"].t.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`LOGIC           : ${_APP.timeIt_timings_prev["LOGIC"].t.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`FULLLOOP        : ${_APP.timeIt_timings_prev["FULLLOOP"].t.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`WS_DISPLAYUPDATE: ${_APP.timeIt_timings_prev["WS_DISPLAYUPDATE"].t.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`${"*".repeat(29)}`); } catch(e){}

			for(let v of thisScreen.lines2){ _APP.m_draw.print(v , 0 , y++); }

			// setTile toggle tile set.
			if(thisScreen.flag){ _APP.m_draw.setTile("tile_blue", 12, 29); }
			else{ _APP.m_draw.setTile("tile_green", 12, 29); }
			thisScreen.flag = !thisScreen.flag;

			// Counting test.
			_APP.m_draw.fillTile("tile3", 14 , 29, 1, 1);
			_APP.m_draw.print(thisScreen.counter.toString(), 14 , 29);
			thisScreen.counter +=1;
			if(thisScreen.counter > 9){ thisScreen.counter = 0; }

			// Display battUpdateCounter test.
			_APP.m_draw.fillTile("tile3", 21 , 29, 1, 1);
			_APP.m_draw.print(thisScreen.battUpdateCounter.toString(), 21 , 29);

			// Display the time.
			thisScreen.shared.displayTime(0, 29, "tile1");

			// Display the battery data section. 
			thisScreen.shared.displayBattery(22, 29, "tile1");
			// Update the battery data section on a counter. 
			if(thisScreen.battUpdateCounter > 2){
				_APP.m_websocket_python.wsClient.send("GET_BATTERY");
				thisScreen.battUpdateCounter = 0;
			}
			else{
				thisScreen.battUpdateCounter += 1;
			}
			
			resolve();
		});
	
	}
};

module.exports = _MOD;