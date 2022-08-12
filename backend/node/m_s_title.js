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
	flag1:false,
	flag2:false,
	flag3:false,
	counter:0,
	lines2:[],
	lastBatteryUpdate:0,
	lastTimeUpdate:0,
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
		_APP.m_draw.fillTile("tile3"         , 0, ts.rows-1, ts.cols, 1); 
		
		_APP.m_draw.print(` 0123456789!@#$%^&*()-=_+[` , 0 , 3);
		_APP.m_draw.print(`ABCDEFGHIJKLMNOPQRSTUVWXYZ` , 0 , 4);
		_APP.m_draw.print(`]{}|;:'",.<>/?\\`           , 0 , 5);
		_APP.m_draw.print(`....X....X....X....X....X....X`           , 0 , 6);
		
		_APP.m_websocket_python.wsClient.send("GET_BATTERY");

		thisScreen.shared.displayTime(0, 29, "tile3");
		thisScreen.shared.displayBattery(23, 29, "tile3");

		// Battery
		_APP.m_draw.setTile("tile_blue", 21, 29);
		// _APP.m_draw.setTile("tile_blue", 11, 29);

		// Set the inited flag.
		thisScreen.inited = true;
		thisScreen.flag1 = false;
		thisScreen.flag2 = false;
		thisScreen.flag3 = false;
		thisScreen.counter = 0;
		thisScreen.lastBatteryUpdate = 0;
		thisScreen.lastTimeUpdate = 0;
	},
	func: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			if(!thisScreen.inited){ thisScreen.init(); resolve(); return; }
	
			// Get the LCD config.
			let n = _APP.m_config.config.node;
			let conf = _APP.m_config.config.lcd;
			let ts = conf.tileset;

			thisScreen.lines2=[];
			
			let y=7;
			try{ thisScreen.lines2.push(`${"*".repeat(29)}`); } catch(e){}
			try{ thisScreen.lines2.push(`FPS             : ${(_APP.fps.average  .toFixed(0)+"/"+_APP.stats.fps.toFixed(0)).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`SET MS/FRAME    : ${_APP.stats.interval.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`DELTA           : ${_APP.stats.delta   .toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`OVER BY         : ${(_APP.stats.delta - _APP.stats.interval)   .toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`${"*".repeat(29)}`); } catch(e){}
			try{ thisScreen.lines2.push(`GPIO            : ${_APP.timeIt_timings_prev["GPIO"].t.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`GPIO_ACTIONS    : ${_APP.timeIt_timings_prev["GPIO_ACTIONS"].t.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`LOGIC           : ${_APP.timeIt_timings_prev["LOGIC"].t.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`FULLLOOP        : ${_APP.timeIt_timings_prev["FULLLOOP"].t.toFixed(2).padStart(11, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`WS_DISPLAYUPDATE: ${_APP.timeIt_timings_prev["WS_DISPLAYUPDATE"].t.toFixed(2).padStart(11, " ")}`); } catch(e){ console.log(e); }
			try{ thisScreen.lines2.push(`${"*".repeat(29)}`); } catch(e){}

			for(let v of thisScreen.lines2){ _APP.m_draw.print(v , 0 , y++); }

			// setTile toggle tile set.
			if(thisScreen.flag1){ _APP.m_draw.setTile("tile_red", 29, 0); }
			else{ _APP.m_draw.setTile("tile_green", 29, 0); }
			thisScreen.flag1 = !thisScreen.flag1;

			// Counting test.
			_APP.m_draw.print(thisScreen.counter.toString().padStart(2, "0"), 14 , 29);
			thisScreen.counter +=1;
			if(thisScreen.counter > 20){ thisScreen.counter = 0; }

			// Update the time data section on a counter. 
			if(performance.now() - thisScreen.lastTimeUpdate >= thisScreen.shared.secondsToFramesToMs(1) ){
				thisScreen.shared.displayTime(0, 29, "tile3");
				if(thisScreen.flag2){ _APP.m_draw.print("TIME DRAW FLAG   :  1", 0 , y++); _APP.m_draw.setTile("tile_red" , 12, 29); }
				else                { _APP.m_draw.print("TIME DRAW FLAG   :  0", 0 , y++); _APP.m_draw.setTile("tile_blue", 12, 29); }
				thisScreen.flag2 = !thisScreen.flag2;
				thisScreen.lastTimeUpdate = performance.now();
			}
			else{ y++; }
			
			// Display/Update the battery data section on a counter. 
			thisScreen.shared.displayBattery(23, 29, "tile3");
			if(performance.now() - thisScreen.lastBatteryUpdate >= thisScreen.shared.secondsToFramesToMs(5) ){
				_APP.m_websocket_python.wsClient.send("GET_BATTERY");
				if(thisScreen.flag3){ _APP.m_draw.print("BATTERY DRAW FLAG:  1", 0 , y++); _APP.m_draw.setTile("tile_red", 21, 29); }
				else{                 _APP.m_draw.print("BATTERY DRAW FLAG:  0", 0 , y++); _APP.m_draw.setTile("tile_blue" , 21, 29); }
				thisScreen.flag3 = !thisScreen.flag3;
				thisScreen.lastBatteryUpdate = performance.now();
			}
			else{ y++; }
			
			// Display timing tests.
			// y++;
			_APP.m_draw.print("time diff in ms (1S): "+(performance.now()-thisScreen.lastTimeUpdate).toFixed(1).toString().padStart(5, " "), 0 , y++);
			_APP.m_draw.print("batt diff in ms (5S): "+(performance.now()-thisScreen.lastBatteryUpdate).toFixed(1).toString().padStart(5, " "), 0 , y++);
			_APP.m_draw.print(" 1.0s: " + thisScreen.shared.secondsToFrames    (1.0) .toFixed(1).toString().padStart(8, " ") +" FRAMES ", 0 , y++);
			_APP.m_draw.print(" 5.0s: " + thisScreen.shared.secondsToFrames    (5.0) .toFixed(1).toString().padStart(8, " ") +" FRAMES ", 0 , y++);
			_APP.m_draw.print("10.0s: " + thisScreen.shared.secondsToFrames    (10.0).toFixed(1).toString().padStart(8, " ") +" FRAMES ", 0 , y++);
			_APP.m_draw.print(" 1.0s: " + thisScreen.shared.secondsToFramesToMs(1.0) .toFixed(1).toString().padStart(8, " ") +" MS     ", 0 , y++);
			_APP.m_draw.print(" 5.0s: " + thisScreen.shared.secondsToFramesToMs(5.0) .toFixed(1).toString().padStart(8, " ") +" MS     ", 0 , y++);
			_APP.m_draw.print("10.0s: " + thisScreen.shared.secondsToFramesToMs(10.0).toFixed(1).toString().padStart(8, " ") +" MS     ", 0 , y++);
			
			resolve();
		});
	
	}
};

module.exports = _MOD;