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
	// Variables.
	inited: false,
	counter:0,
	lines2:[],
	lastBatteryUpdate:0,
	lastTimeUpdate:0,
	timeUpdateMs:null,
	batteryUpdateMs:null,

	// Constants
	timeUpdateSeconds:1,
	batteryUpdateSeconds:5,

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
		_APP.m_draw.print(`SCREEN: ${_APP.currentScreen.substring(4)} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);
		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		_APP.m_draw.fillTile("tile2"         , 0, 2, ts.cols, 1); 

		// Bottom row.
		_APP.m_draw.fillTile("tile3"         , 0, ts.rows-1, ts.cols, 1); 
		
		_APP.m_draw.print(`]{}|;:'",.<>/?\\^&*()-=_+[$%`, 0 , 4);
		_APP.m_draw.print(`ABCDEFGHIJKLMNOPQRSTUVWXYZ`  , 0 , 5);
		_APP.m_draw.print(` 0123456789!@#`              , 0 , 6);
		
		// _APP.m_websocket_python.wsClient.send("GET_BATTERY");
		_APP.m_websocket_python.getBatteryUpdate();

		// Initial drawing of the battery and time.
		thisScreen.shared.time.display(0, 29, "tile3");
		thisScreen.shared.battery.display(23, 29, "tile3");
		thisScreen.timeUpdateMs = thisScreen.shared.secondsToFramesToMs(thisScreen.timeUpdateSeconds);
		thisScreen.batteryUpdateMs = thisScreen.shared.secondsToFramesToMs(thisScreen.batteryUpdateSeconds);

		// Set the inited flag.
		thisScreen.inited = true;
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
			
			let y=7;
			thisScreen.lines2.push(`${"*".repeat(30)}`);
			thisScreen.lines2.push(`FPS AVG/CONF: ${(_APP.fps.average  .toFixed(0)+"/"+_APP.stats.fps.toFixed(0)).padStart(7, " ")}` + `${("("+(_APP.fps._index_+1).toFixed(0) +"/"+ (_APP.fps.sampleSize-0).toFixed(0) +")").padStart(8, " ")}`);
			thisScreen.lines2.push(`SET MS/FRAME: ${_APP.stats.interval.toFixed(2).padStart(7, " ")}`);
			thisScreen.lines2.push(`MS DELTA    : ${_APP.stats.delta   .toFixed(2).padStart(7, " ")}`);
			thisScreen.lines2.push(`MS OVER BY  : ${(_APP.stats.delta - _APP.stats.interval)   .toFixed(2).padStart(7, " ") }`);
			thisScreen.lines2.push(`${"*".repeat(30)}`);
			
			let totalTime     = _APP.timeIt_timings_prev["APPLOOP__"]["FULLLOOP"].t;
			let gpio          = _APP.timeIt_timings_prev["APPLOOP__"]["GPIO"].t;     let gpio_p          = ((gpio          / totalTime)*100).toFixed(2);
			let logic         = _APP.timeIt_timings_prev["APPLOOP__"]["LOGIC"].t;    let logic_p         = ((logic         / totalTime)*100).toFixed(2);
			let displayupdate = _APP.timeIt_timings_prev["APPLOOP__"]["DISPLAY"].t;  let displayupdate_p = ((displayupdate / totalTime)*100).toFixed(2);
			thisScreen.lines2.push( `GPIO    :${gpio         .toFixed(2).padStart(7, " ")} / ${(gpio_p          + '%').padStart(9, " ")}` );
			thisScreen.lines2.push( `LOGIC   :${logic        .toFixed(2).padStart(7, " ")} / ${(logic_p         + '%').padStart(9, " ")}` );
			thisScreen.lines2.push( `DISPLAY :${displayupdate.toFixed(2).padStart(7, " ")} / ${(displayupdate_p + '%').padStart(9, " ")}` );
			// FULL LOOP line.
			(
				function(){
					let isOver = Math.sign((totalTime) - _APP.stats.interval) == 1 ;
					let line1="";
					let line2="";

					if(isOver){
						let diff = (totalTime-_APP.stats.interval);
						line1 = ` ! ${"+"+(diff.toFixed(0)).padStart(4)} MS`;
					}

					line2 += `FULLLOOP:`;
					line2 += totalTime.toFixed(2).padStart(7, " ");
					// line2 += line1;

					thisScreen.lines2.push( (line2.padEnd(16, " ") + line1.padEnd(14, " ")));
				}
			)();
			thisScreen.lines2.push(`${"*".repeat(30)}`);

			for(let v of thisScreen.lines2){ _APP.m_draw.print(v , 0 , y++); }

			let x;

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
			_APP.m_draw.print(`${"*".repeat(30)}` , 0 , y++);

			// Display/Update the time/battery data sections as needed.
			thisScreen.shared.time.updateIfNeeded(0, 29, "tile3");
			thisScreen.shared.battery.updateIfNeeded(23, 29, "tile3");

			// Counting test.
			_APP.m_draw.print(thisScreen.counter.toString().padStart(2, "0"), 14 , 29);
			thisScreen.counter +=1;
			if(thisScreen.counter > 20){ thisScreen.counter = 0; }
			
			resolve();
		});
	
	}
};

module.exports = _MOD;