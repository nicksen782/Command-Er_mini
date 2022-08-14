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
	flag1:false,
	flag2:false,
	flag3:false,
	counter:0,
	lines2:[],
	lastBatteryUpdate:0,
	lastTimeUpdate:0,
	timeUpdateMs:null,
	batteryUpdateMs:null,

	// Constants
	timeUpdateSeconds:1,
	batteryUpdateSeconds:5,

	buttons: async function(key, state){
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

		_APP.m_draw.fillTile("tile3"         , 0, 0, ts.cols, 1); 
		_APP.m_draw.print(`SCREEN: ${_APP.currentScreen} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);
		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		_APP.m_draw.fillTile("tile2"         , 0, 2, ts.cols, 1); 
		_APP.m_draw.fillTile("tile3"         , 0, ts.rows-1, ts.cols, 1); 
		
		_APP.m_draw.print(` 0123456789!@#$%^&*()-=_+[` , 0 , 3);
		_APP.m_draw.print(`ABCDEFGHIJKLMNOPQRSTUVWXYZ` , 0 , 4);
		_APP.m_draw.print(`]{}|;:'",.<>/?\\`           , 0 , 5);
		// _APP.m_draw.print(`....X....X....X....X....X....X`           , 0 , 6);
		
		// _APP.m_websocket_python.wsClient.send("GET_BATTERY");
		_APP.m_websocket_python.getBatteryUpdate();

		thisScreen.shared.time.display(0, 29, "tile3");
		thisScreen.shared.battery.display(23, 29, "tile3");

		thisScreen.timeUpdateMs = thisScreen.shared.secondsToFramesToMs(thisScreen.timeUpdateSeconds);
		thisScreen.batteryUpdateMs = thisScreen.shared.secondsToFramesToMs(thisScreen.batteryUpdateSeconds);

		// Battery - Initial debug tile.
		// _APP.m_draw.setTile("tile_blue", 21, 29);

		// Time - Initial debug tile.
		// _APP.m_draw.setTile("tile_blue", 11, 29);

		// Set the inited flag.
		thisScreen.inited = true;
		thisScreen.flag1 = false;
		thisScreen.flag2 = false;
		thisScreen.flag3 = false;
		thisScreen.counter = 0;
		thisScreen.lines2 = [];
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
			
			let y=6;
			thisScreen.lines2.push(`${"*".repeat(29)}`);
			thisScreen.lines2.push(`FPS AVG/CONF: ${(_APP.fps.average  .toFixed(0)+"/"+_APP.stats.fps.toFixed(0)).padStart(7, " ")}` + `${("("+(_APP.fps._index_+1).toFixed(0) +"/"+ (_APP.fps.sampleSize-0).toFixed(0) +")").padStart(8, " ")}`);
			thisScreen.lines2.push(`SET MS/FRAME: ${_APP.stats.interval.toFixed(2).padStart(7, " ")}`);
			thisScreen.lines2.push(`MS DELTA    : ${_APP.stats.delta   .toFixed(2).padStart(7, " ")}`);
			thisScreen.lines2.push(`MS OVER BY  : ${(_APP.stats.delta - _APP.stats.interval)   .toFixed(2).padStart(7, " ")}`);
			thisScreen.lines2.push(`${"*".repeat(29)}`);

			let totalTime = _APP.timeIt_timings_prev["FULLLOOP"].t;
			let gpio          = _APP.timeIt_timings_prev["GPIO"].t;          let gpio_p          = ((gpio          / totalTime)*100).toFixed(2);
			let logic         = _APP.timeIt_timings_prev["LOGIC"].t;         let logic_p         = ((logic         / totalTime)*100).toFixed(2);
			let displayupdate = _APP.timeIt_timings_prev["DISPLAY"].t; let displayupdate_p = ((displayupdate / totalTime)*100).toFixed(2);
			thisScreen.lines2.push( `GPIO    :${gpio         .toFixed(2).padStart(6, " ")} / ${(gpio_p          + '%').padStart(8, " ")}` );
			thisScreen.lines2.push( `LOGIC   :${logic        .toFixed(2).padStart(6, " ")} / ${(logic_p         + '%').padStart(8, " ")}` );
			thisScreen.lines2.push( `DISPLAY :${displayupdate.toFixed(2).padStart(6, " ")} / ${(displayupdate_p + '%').padStart(8, " ")}` );
			thisScreen.lines2.push(`FULLLOOP:${totalTime     .toFixed(2).padStart(6, " ")}`);
			thisScreen.lines2.push(`${"*".repeat(29)}`);

			let t1a = ((performance.now()-thisScreen.lastTimeUpdate)/1000)   .toFixed(1).toString().padStart(3, " ");
			let t1b = ((thisScreen.timeUpdateMs)/1000)                  .toFixed(1).toString().padStart(3, " ");;
			let t2a = ((performance.now()-thisScreen.lastBatteryUpdate)/1000).toFixed(1).toString().padStart(3, " ");
			let t2b = ((thisScreen.batteryUpdateMs)/1000)               .toFixed(1).toString().padStart(3, " ");;
			thisScreen.lines2.push(`TIME UPDATES: ${t1a}/${t1b} (${thisScreen.flag2 ? "1" : "0"})`);
			thisScreen.lines2.push(`BATT UPDATES: ${t2a}/${t2b} (${thisScreen.flag3 ? "1" : "0"})`);
			thisScreen.lines2.push(`${"*".repeat(29)}`);

			// thisScreen.lines2.push(" 1.0s: " + thisScreen.shared.secondsToFrames    (1.0) .toFixed(1).toString().padStart(8, " ") +" FRAMES ");
			// thisScreen.lines2.push(" 5.0s: " + thisScreen.shared.secondsToFrames    (5.0) .toFixed(1).toString().padStart(8, " ") +" FRAMES ");
			// thisScreen.lines2.push("10.0s: " + thisScreen.shared.secondsToFrames    (10.0).toFixed(1).toString().padStart(8, " ") +" FRAMES ");
			// thisScreen.lines2.push(" 1.0s: " + thisScreen.shared.secondsToFramesToMs(1.0) .toFixed(1).toString().padStart(8, " ") +" MS     ");
			// thisScreen.lines2.push(" 5.0s: " + thisScreen.shared.secondsToFramesToMs(5.0) .toFixed(1).toString().padStart(8, " ") +" MS     ");
			// thisScreen.lines2.push("10.0s: " + thisScreen.shared.secondsToFramesToMs(10.0).toFixed(1).toString().padStart(8, " ") +" MS     ");
			// thisScreen.lines2.push(`${"*".repeat(29)}`);

			// for(let v of thisScreen.lines2){ _APP.m_draw.print(" ".repeat(ts.cols) , 0 , y); _APP.m_draw.print(v , 0 , y++); }
			for(let v of thisScreen.lines2){ _APP.m_draw.print(v , 0 , y++); }

			// setTile toggle tile set.
			// if(thisScreen.flag1){ _APP.m_draw.setTile("tile_red", 29, 0); }
			// else{ _APP.m_draw.setTile("tile_green", 29, 0); }
			// thisScreen.flag1 = !thisScreen.flag1;

			// Counting test.
			// _APP.m_draw.print(thisScreen.counter.toString().padStart(2, "0"), 14 , 29);
			// thisScreen.counter +=1;
			// if(thisScreen.counter > 20){ thisScreen.counter = 0; }
			
			// Update the time data section on a counter. 
			// if(_APP.m_gpio.isPress("KEY_UP_PIN")){ _APP.m_draw.setTile("btn_u_active", 12, 29); }
			// if(_APP.m_gpio.isPrev ("KEY_UP_PIN")){ _APP.m_draw.setTile("btn_u_active", 12, 29); }
			// if(_APP.m_gpio.isHeld ("KEY_UP_PIN")){ _APP.m_draw.setTile("btn_u_active", 12, 29); }
			// if(_APP.m_gpio.isRele ("KEY_UP_PIN")){ _APP.m_draw.setTile("btn_u_active", 12, 29); }
			// else{ _APP.m_draw.setTile("btn_u", 12, 29); }
			
			let x;
			y++;

			x=15;
			_APP.m_draw.print(`PRES: ${_APP.m_gpio.states_pressed .toString(2).padStart(8, "0")}`  , 0 , y); 
			if( _APP.m_gpio.isPress ("KEY_UP_PIN")    ){ _APP.m_draw.setTile("btn_u_active", x++, y); } else{ _APP.m_draw.setTile("btn_u", x++, y); }
			if( _APP.m_gpio.isPress ("KEY_DOWN_PIN")  ){ _APP.m_draw.setTile("btn_d_active", x++, y); } else{ _APP.m_draw.setTile("btn_d", x++, y); }
			if( _APP.m_gpio.isPress ("KEY_PRESS_PIN") ){ _APP.m_draw.setTile("btn_p_active", x++, y); } else{ _APP.m_draw.setTile("btn_p", x++, y); }
			if( _APP.m_gpio.isPress ("KEY_LEFT_PIN")  ){ _APP.m_draw.setTile("btn_l_active", x++, y); } else{ _APP.m_draw.setTile("btn_l", x++, y); }
			if( _APP.m_gpio.isPress ("KEY_RIGHT_PIN") ){ _APP.m_draw.setTile("btn_r_active", x++, y); } else{ _APP.m_draw.setTile("btn_r", x++, y); }
			if( _APP.m_gpio.isPress ("KEY1_PIN")      ){ _APP.m_draw.setTile("btn_a_active", x++, y); } else{ _APP.m_draw.setTile("btn_a", x++, y); }
			if( _APP.m_gpio.isPress ("KEY2_PIN")      ){ _APP.m_draw.setTile("btn_b_active", x++, y); } else{ _APP.m_draw.setTile("btn_b", x++, y); }
			if( _APP.m_gpio.isPress ("KEY3_PIN")      ){ _APP.m_draw.setTile("btn_c_active", x++, y); } else{ _APP.m_draw.setTile("btn_c", x++, y); }
			y++;

			x=15;
			_APP.m_draw.print(`HELD: ${_APP.m_gpio.states_held    .toString(2).padStart(8, "0")}`  , 0 , y); 
			if( _APP.m_gpio.isHeld ("KEY_UP_PIN")    ){ _APP.m_draw.setTile("btn_u_active", x++, y); } else{ _APP.m_draw.setTile("btn_u", x++, y); }
			if( _APP.m_gpio.isHeld ("KEY_DOWN_PIN")  ){ _APP.m_draw.setTile("btn_d_active", x++, y); } else{ _APP.m_draw.setTile("btn_d", x++, y); }
			if( _APP.m_gpio.isHeld ("KEY_PRESS_PIN") ){ _APP.m_draw.setTile("btn_p_active", x++, y); } else{ _APP.m_draw.setTile("btn_p", x++, y); }
			if( _APP.m_gpio.isHeld ("KEY_LEFT_PIN")  ){ _APP.m_draw.setTile("btn_l_active", x++, y); } else{ _APP.m_draw.setTile("btn_l", x++, y); }
			if( _APP.m_gpio.isHeld ("KEY_RIGHT_PIN") ){ _APP.m_draw.setTile("btn_r_active", x++, y); } else{ _APP.m_draw.setTile("btn_r", x++, y); }
			if( _APP.m_gpio.isHeld ("KEY1_PIN")      ){ _APP.m_draw.setTile("btn_a_active", x++, y); } else{ _APP.m_draw.setTile("btn_a", x++, y); }
			if( _APP.m_gpio.isHeld ("KEY2_PIN")      ){ _APP.m_draw.setTile("btn_b_active", x++, y); } else{ _APP.m_draw.setTile("btn_b", x++, y); }
			if( _APP.m_gpio.isHeld ("KEY3_PIN")      ){ _APP.m_draw.setTile("btn_c_active", x++, y); } else{ _APP.m_draw.setTile("btn_c", x++, y); }
			// resolve(); return; 
			y++;
			
			x=15;
			_APP.m_draw.print(`PREV: ${_APP.m_gpio.states_prev    .toString(2).padStart(8, "0")}`  , 0 , y); 
			if( _APP.m_gpio.isPrev ("KEY_UP_PIN")    ){ _APP.m_draw.setTile("btn_u_active", x++, y); } else{ _APP.m_draw.setTile("btn_u", x++, y); }
			if( _APP.m_gpio.isPrev ("KEY_DOWN_PIN")  ){ _APP.m_draw.setTile("btn_d_active", x++, y); } else{ _APP.m_draw.setTile("btn_d", x++, y); }
			if( _APP.m_gpio.isPrev ("KEY_PRESS_PIN") ){ _APP.m_draw.setTile("btn_p_active", x++, y); } else{ _APP.m_draw.setTile("btn_p", x++, y); }
			if( _APP.m_gpio.isPrev ("KEY_LEFT_PIN")  ){ _APP.m_draw.setTile("btn_l_active", x++, y); } else{ _APP.m_draw.setTile("btn_l", x++, y); }
			if( _APP.m_gpio.isPrev ("KEY_RIGHT_PIN") ){ _APP.m_draw.setTile("btn_r_active", x++, y); } else{ _APP.m_draw.setTile("btn_r", x++, y); }
			if( _APP.m_gpio.isPrev ("KEY1_PIN")      ){ _APP.m_draw.setTile("btn_a_active", x++, y); } else{ _APP.m_draw.setTile("btn_a", x++, y); }
			if( _APP.m_gpio.isPrev ("KEY2_PIN")      ){ _APP.m_draw.setTile("btn_b_active", x++, y); } else{ _APP.m_draw.setTile("btn_b", x++, y); }
			if( _APP.m_gpio.isPrev ("KEY3_PIN")      ){ _APP.m_draw.setTile("btn_c_active", x++, y); } else{ _APP.m_draw.setTile("btn_c", x++, y); }
			y++;
			
			x=15;
			_APP.m_draw.print(`RELE: ${_APP.m_gpio.states_released.toString(2).padStart(8, "0")}`  , 0 , y); 
			if( _APP.m_gpio.isRele ("KEY_UP_PIN")    ){ _APP.m_draw.setTile("btn_u_active", x++, y); } else{ _APP.m_draw.setTile("btn_u", x++, y); }
			if( _APP.m_gpio.isRele ("KEY_DOWN_PIN")  ){ _APP.m_draw.setTile("btn_d_active", x++, y); } else{ _APP.m_draw.setTile("btn_d", x++, y); }
			if( _APP.m_gpio.isRele ("KEY_PRESS_PIN") ){ _APP.m_draw.setTile("btn_p_active", x++, y); } else{ _APP.m_draw.setTile("btn_p", x++, y); }
			if( _APP.m_gpio.isRele ("KEY_LEFT_PIN")  ){ _APP.m_draw.setTile("btn_l_active", x++, y); } else{ _APP.m_draw.setTile("btn_l", x++, y); }
			if( _APP.m_gpio.isRele ("KEY_RIGHT_PIN") ){ _APP.m_draw.setTile("btn_r_active", x++, y); } else{ _APP.m_draw.setTile("btn_r", x++, y); }
			if( _APP.m_gpio.isRele ("KEY1_PIN")      ){ _APP.m_draw.setTile("btn_a_active", x++, y); } else{ _APP.m_draw.setTile("btn_a", x++, y); }
			if( _APP.m_gpio.isRele ("KEY2_PIN")      ){ _APP.m_draw.setTile("btn_b_active", x++, y); } else{ _APP.m_draw.setTile("btn_b", x++, y); }
			if( _APP.m_gpio.isRele ("KEY3_PIN")      ){ _APP.m_draw.setTile("btn_c_active", x++, y); } else{ _APP.m_draw.setTile("btn_c", x++, y); }
			y++;
			if(performance.now() - thisScreen.lastTimeUpdate >= thisScreen.timeUpdateMs ){
				thisScreen.shared.time.display(0, 29, "tile3");
				
				if(thisScreen.flag2){ 
				}
				else{ 
				}
				thisScreen.flag2 = !thisScreen.flag2;

				thisScreen.lastTimeUpdate = performance.now();
			}
			
			// Display/Update the battery data section on a counter. 
			thisScreen.shared.battery.display(23, 29, "tile3");
			if(performance.now() - thisScreen.lastBatteryUpdate >= thisScreen.batteryUpdateMs ){
				_APP.m_websocket_python.getBatteryUpdate();
				thisScreen.lastBatteryUpdate = performance.now();
			}
			
			resolve();
		});
	
	}
};

module.exports = _MOD;