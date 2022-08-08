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
	
			_APP.consolelog("  add screen: screen_title");
			_APP.screenLogic.screens.screen_title = screen_title;

			// Add routes.
			_APP.consolelog("  addRoutes");
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
		console.log("init of:", _APP.currentScreen);
	
		// Clear the screen.
		_APP.m_draw.clearScreen();
	
		// Get the LCD config.
		let conf = _APP.m_config.config.lcd;
		let ts = conf.tileset;

		_APP.m_draw.clearScreen("tile4");
		_APP.m_draw.fillTile("tile3"         , 0, 0, ts.cols, 1); 
		_APP.m_draw.print(`SCREEN: ${_APP.currentScreen} (${_APP.screens.indexOf(_APP.currentScreen)+1}/${_APP.screens.length})` , 0 , 0);
		_APP.m_draw.fillTile("tile1"         , 0, 1, ts.cols, 1); 
		_APP.m_draw.fillTile("tile2"         , 0, 2, ts.cols, 1); 
		
		_APP.m_draw.print(`0123456789!@#$%^&*()-=_+ ` , 0 , 5);
		
		// Set the inited flag.
		thisScreen.inited = true;
		thisScreen.flag = false;
		thisScreen.counter = 0;
	},
	func: async function(){
		return new Promise(async function(resolve,reject){
			let thisScreen = _APP.screenLogic.screens[_APP.currentScreen];
			if(!thisScreen.inited){ thisScreen.init(); resolve(); return; }
	
			if(thisScreen.flag){
				// _APP.m_draw.setTile("tile_green", 0, 10);
				_APP.m_draw.setTile("tile_blue", 0, 7);
			}
			else{
				// _APP.m_draw.setTile("tile_blue", 0, 10);
				_APP.m_draw.setTile("tile_green", 0, 7);
			}
			thisScreen.flag = !thisScreen.flag;

			// _APP.m_draw.fillTile("tile3", 0, 10, 20, 1);
			// _APP.m_draw.print(`FPS: ${_APP.fps.average}` , 0,10);

			let len = thisScreen.lines2.length;
			let longest = 0;
			thisScreen.lines2.forEach(function(d){ if(d.length > longest){longest = d.length;} });
			thisScreen.lines2=[];
			let y=10;
			// _APP.m_draw.fillTile("tile3"  , 0, y, longest, len);
			if(thisScreen.flag2){ _APP.m_draw.fillTile("tile2"  , 0, y, longest, len); }
			else{                 _APP.m_draw.fillTile("tile4"  , 0, y, longest, len); }
			thisScreen.flag2 = !thisScreen.flag2;

			try{ thisScreen.lines2.push(`${"*".repeat(24)}`); } catch(e){}
			try{ thisScreen.lines2.push(`FPS       : ${(_APP.fps.average  .toFixed(0)+"/"+_APP.stats.fps.toFixed(0)).padStart(12, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`MS/FRAME  : ${_APP.stats.interval.toFixed(2).padStart(12, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`DELTA     : ${_APP.stats.delta   .toFixed(2).padStart(12, " ")}`); } catch(e){}
			// try{ thisScreen.lines2.push(`CURFRAME  : ${_APP.m_draw.curFrame   .toFixed(2).padStart(12, " ")}`); } catch(e){}
			try{ thisScreen.lines2.push(`${"*".repeat(24)}`); } catch(e){}

			for(let v of thisScreen.lines2){ _APP.m_draw.print(v , 0 , y++); }

			y++;
			_APP.m_draw.setTile("tile4", 0 , y);
			_APP.m_draw.print(thisScreen.counter.toString(), 0 , y);
			thisScreen.counter +=1;
			if(thisScreen.counter > 9){ thisScreen.counter = 0; }
			
			resolve();
		});
	
	}
};

module.exports = _MOD;