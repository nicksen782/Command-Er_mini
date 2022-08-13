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
	
			_APP.consolelog("add screen: test_1", 2);
			_APP.screens.push("test_1");
			_APP.screenLogic.screens.test_1 = test_1;
			
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


let test_1 = {
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

			thisScreen.lines2.push(`FPS AVG/CONF: ${(_APP.fps.average  .toFixed(0)+"/"+_APP.stats.fps.toFixed(0)).padStart(7, " ")}`);
			thisScreen.lines2.push(`SET MS/FRAME: ${_APP.stats.interval.toFixed(2).padStart(7, " ")}`);
			thisScreen.lines2.push(`MS DELTA    : ${_APP.stats.delta   .toFixed(2).padStart(7, " ")}`);
			thisScreen.lines2.push(`MS OVER BY  : ${(_APP.stats.delta - _APP.stats.interval)   .toFixed(2).padStart(7, " ")}`);
			thisScreen.lines2.push(`${"*".repeat(29)}`);

			let totalTime = _APP.timeIt_timings_prev["FULLLOOP"].t;
			let gpio          = _APP.timeIt_timings_prev["GPIO"].t;          let gpio_p          = ((gpio          / totalTime)*100).toFixed(2).padStart(5, " ");
			let gpio_actions  = _APP.timeIt_timings_prev["GPIO_ACTIONS"].t;  let gpio_actions_p  = ((gpio_actions  / totalTime)*100).toFixed(2).padStart(5, " ");
			let logic         = _APP.timeIt_timings_prev["LOGIC"].t;         let logic_p         = ((logic         / totalTime)*100).toFixed(2).padStart(5, " ");
			let displayupdate = _APP.timeIt_timings_prev["DISPLAYUPDATE"].t; let displayupdate_p = ((displayupdate / totalTime)*100).toFixed(2).padStart(5, " ");
			thisScreen.lines2.push(`GPIO         :${gpio         .toFixed(2).padStart(6, " ")} / ${gpio_p}%`         .padStart(7, " "));
			thisScreen.lines2.push(`GPIO_ACTIONS :${gpio_actions .toFixed(2).padStart(6, " ")} / ${gpio_actions_p}%` .padStart(7, " "));
			thisScreen.lines2.push(`LOGIC        :${logic        .toFixed(2).padStart(6, " ")} / ${logic_p}%`        .padStart(7, " "));
			thisScreen.lines2.push(`DISPLAYUPDATE:${displayupdate.toFixed(2).padStart(6, " ")} / ${displayupdate_p}%`.padStart(7, " "));
			thisScreen.lines2.push(`FULLLOOP     :${totalTime    .toFixed(2).padStart(6, " ")}`);
			thisScreen.lines2.push(`${"*".repeat(29)}`);

			let t1a = ((performance.now()-thisScreen.lastTimeUpdate)/1000)   .toFixed(1).toString().padStart(3, " ");
			let t1b = ((thisScreen.timeUpdateMs)/1000)                  .toFixed(1).toString().padStart(3, " ");;
			let t2a = ((performance.now()-thisScreen.lastBatteryUpdate)/1000).toFixed(1).toString().padStart(3, " ");
			let t2b = ((thisScreen.batteryUpdateMs)/1000)               .toFixed(1).toString().padStart(3, " ");;
			thisScreen.lines2.push(`TIME UPDATES: ${t1a}/${t1b} (${thisScreen.flag2 ? "1" : "0"})`);
			thisScreen.lines2.push(`BATT UPDATES: ${t2a}/${t2b} (${thisScreen.flag3 ? "1" : "0"})`);
			thisScreen.lines2.push(`${"*".repeat(29)}`);

			thisScreen.lines2.push(" 1.0s: " + thisScreen.shared.secondsToFrames    (1.0) .toFixed(1).toString().padStart(8, " ") +" FRAMES ");
			thisScreen.lines2.push(" 5.0s: " + thisScreen.shared.secondsToFrames    (5.0) .toFixed(1).toString().padStart(8, " ") +" FRAMES ");
			thisScreen.lines2.push("10.0s: " + thisScreen.shared.secondsToFrames    (10.0).toFixed(1).toString().padStart(8, " ") +" FRAMES ");
			thisScreen.lines2.push(" 1.0s: " + thisScreen.shared.secondsToFramesToMs(1.0) .toFixed(1).toString().padStart(8, " ") +" MS     ");
			thisScreen.lines2.push(" 5.0s: " + thisScreen.shared.secondsToFramesToMs(5.0) .toFixed(1).toString().padStart(8, " ") +" MS     ");
			thisScreen.lines2.push("10.0s: " + thisScreen.shared.secondsToFramesToMs(10.0).toFixed(1).toString().padStart(8, " ") +" MS     ");
			thisScreen.lines2.push(`${"*".repeat(29)}`);

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
			if(performance.now() - thisScreen.lastTimeUpdate >= thisScreen.timeUpdateMs ){
				thisScreen.shared.time.display(0, 29, "tile3");
				// if(thisScreen.flag2){ _APP.m_draw.setTile("tile_red" , 12, 29); }
				// else                { _APP.m_draw.setTile("tile_blue", 12, 29); }
				// thisScreen.flag2 = !thisScreen.flag2;
				
				if(thisScreen.flag2){ 
					_APP.m_draw.setTile("btn_u", 12, 29);
					_APP.m_draw.setTile("btn_d", 13, 29);
					_APP.m_draw.setTile("btn_l", 14, 29);
					_APP.m_draw.setTile("btn_r", 15, 29);
					_APP.m_draw.setTile("btn_a", 16, 29);
					_APP.m_draw.setTile("btn_b", 17, 29);
					_APP.m_draw.setTile("btn_c", 18, 29);
				}
				else{ 
					_APP.m_draw.setTile("btn_u_active", 12, 29);
					_APP.m_draw.setTile("btn_d_active", 13, 29);
					_APP.m_draw.setTile("btn_l_active", 14, 29);
					_APP.m_draw.setTile("btn_r_active", 15, 29);
					_APP.m_draw.setTile("btn_a_active", 16, 29);
					_APP.m_draw.setTile("btn_b_active", 17, 29);
					_APP.m_draw.setTile("btn_c_active", 18, 29);
				}
				thisScreen.flag2 = !thisScreen.flag2;

				thisScreen.lastTimeUpdate = performance.now();
			}
			
			// Display/Update the battery data section on a counter. 
			thisScreen.shared.battery.display(23, 29, "tile3");
			if(performance.now() - thisScreen.lastBatteryUpdate >= thisScreen.batteryUpdateMs ){
				// _APP.m_websocket_python.wsClient.send("GET_BATTERY");
				_APP.m_websocket_python.getBatteryUpdate();
				// if(thisScreen.flag3){ _APP.m_draw.setTile("tile_red", 21, 29); }
				// else{                 _APP.m_draw.setTile("tile_blue" , 21, 29); }
				// thisScreen.flag3 = !thisScreen.flag3;
				thisScreen.lastBatteryUpdate = performance.now();
			}
			
			resolve();
		});
	
	}
};

module.exports = _MOD;